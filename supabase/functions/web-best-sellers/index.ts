// Public best-sellers feed for the storefront home page.
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

    // 1. Sum quantities per variation across all order_items.
    const { data: items, error: itemsErr } = await supabase
      .from("order_items")
      .select("variation_id, quantity");
    if (itemsErr) throw itemsErr;

    const variationTotals = new Map<string, number>();
    for (const it of items || []) {
      if (!it.variation_id) continue;
      variationTotals.set(
        it.variation_id,
        (variationTotals.get(it.variation_id) || 0) + (it.quantity || 0),
      );
    }

    if (variationTotals.size === 0) return json({ products: [] });

    // 2. Variation → product mapping.
    const variationIds = Array.from(variationTotals.keys());
    const { data: variations, error: varErr } = await supabase
      .from("product_variations")
      .select("id, product_id")
      .in("id", variationIds);
    if (varErr) throw varErr;

    const productTotals = new Map<string, number>();
    for (const v of variations || []) {
      productTotals.set(
        v.product_id,
        (productTotals.get(v.product_id) || 0) + (variationTotals.get(v.id) || 0),
      );
    }

    // 3. Top 12 product ids by quantity sold.
    const topIds = Array.from(productTotals.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 12)
      .map(([id]) => id);

    if (topIds.length === 0) return json({ products: [] });

    // 4. Fetch published products with category info (same shape the
    //    storefront previously got from the direct query).
    const { data: products, error: prodErr } = await supabase
      .from("products")
      .select("*, categories!products_category_id_fkey(name, slug)")
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