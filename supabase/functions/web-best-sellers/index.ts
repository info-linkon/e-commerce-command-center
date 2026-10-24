// Public best-sellers feed for the storefront home page.
// With body `{ ranking: true }` it instead returns `{ ranking: [product_id…] }`
// — every product that has sales, best seller first — used for the
// "most popular" sort on category pages.
//
// `order_items` is restricted to authenticated CRM users (it joins to orders
// which contain PII). To still surface the "most-purchased" carousel on the
// public site, we aggregate sales here with the service role and return only
// the public product fields the carousel needs.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const body = await req.json().catch(() => ({}));
    const wantRanking = body?.ranking === true;

    // 1. Sum quantities per variation across all order_items of orders that
    //    weren't cancelled. Paged: PostgREST caps a single response at 1000
    //    rows, which silently truncated the totals before.
    const items: { variation_id: string | null; quantity: number | null }[] = [];
    const PAGE = 1000;
    for (let from = 0; ; from += PAGE) {
      const { data: page, error: itemsErr } = await supabase
        .from("order_items")
        .select("variation_id, quantity, orders!inner(status)")
        .not("orders.status", "in", "(cancelled,unfulfilled,external_unfulfilled)")
        .order("id")
        .range(from, from + PAGE - 1);
      if (itemsErr) throw itemsErr;
      items.push(...((page || []) as typeof items));
      if (!page || page.length < PAGE) break;
    }

    const variationTotals = new Map<string, number>();
    for (const it of items) {
      if (!it.variation_id) continue;
      variationTotals.set(
        it.variation_id,
        (variationTotals.get(it.variation_id) || 0) + (it.quantity || 0),
      );
    }

    if (variationTotals.size === 0) return json(wantRanking ? { ranking: [] } : { products: [] });

    // 2. Variation → product mapping (chunked to keep the URL short).
    const variationIds = Array.from(variationTotals.keys());
    const variations: { id: string; product_id: string }[] = [];
    for (let i = 0; i < variationIds.length; i += 200) {
      const { data: chunk, error: varErr } = await supabase
        .from("product_variations")
        .select("id, product_id")
        .in("id", variationIds.slice(i, i + 200));
      if (varErr) throw varErr;
      variations.push(...(chunk || []));
    }

    const productTotals = new Map<string, number>();
    for (const v of variations) {
      productTotals.set(
        v.product_id,
        (productTotals.get(v.product_id) || 0) + (variationTotals.get(v.id) || 0),
      );
    }

    const ranked = Array.from(productTotals.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([id]) => id);
    if (wantRanking) return json({ ranking: ranked });

    // 3. Top 12 product ids by quantity sold.
    const topIds = ranked.slice(0, 12);

    if (topIds.length === 0) return json({ products: [] });

    // 4. Fetch published products with category info (same shape the
    //    storefront previously got from the direct query).
    const { data: products, error: prodErr } = await supabase
      .from("products")
      .select("*, categories!products_category_id_fkey(name, name_he, slug)")
      .eq("is_published", true)
      .in("id", topIds);
    if (prodErr) throw prodErr;

    const sorted = (products || []).sort(
      (a, b) => (productTotals.get(b.id) || 0) - (productTotals.get(a.id) || 0),
    );

    return json({ products: sorted });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    console.error("web-best-sellers error:", msg);
    return json({ error: msg, products: [] }, 500);
  }
});