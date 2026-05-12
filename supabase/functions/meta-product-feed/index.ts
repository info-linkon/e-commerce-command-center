import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  // Get site URL from query param or default
  const url = new URL(req.url);
  const siteUrl = url.searchParams.get("site_url") || "https://elwejha.co.il";

  const { data: products, error } = await supabase
    .from("products")
    .select("id, product_number, name, name_ar, description, description_ar, short_description, short_description_ar, sale_price, image_url, sku, is_published, category_id, categories!products_category_id_fkey(name), shipping_price")
    .eq("is_published", true);

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Load all relevant lookup tables in parallel
  const [invRes, varRes, bundlesRes, biRes, bvRes, bviRes] = await Promise.all([
    supabase.from("inventory").select("variation_id, quantity"),
    supabase.from("product_variations").select("id, product_id, name, name_ar, sku, price, image_url"),
    supabase.from("bundles").select("id, product_id, bundle_type"),
    supabase.from("bundle_items").select("bundle_id, variation_id, quantity"),
    supabase.from("bundle_variations").select("id, bundle_id, name, name_he, sku, price"),
    supabase.from("bundle_variation_items").select("bundle_variation_id, variation_id, quantity"),
  ]);

  const inventory = invRes.data || [];
  const variations = varRes.data || [];
  const bundles = bundlesRes.data || [];
  const bundleItems = biRes.data || [];
  const bundleVars = bvRes.data || [];
  const bundleVarItems = bviRes.data || [];

  // variation_id -> total stock across warehouses
  const varStock = new Map<string, number>();
  for (const i of inventory) {
    varStock.set(i.variation_id, (varStock.get(i.variation_id) || 0) + (i.quantity || 0));
  }

  // product_id -> variations
  const varsByProduct = new Map<string, any[]>();
  for (const v of variations) {
    if (!varsByProduct.has(v.product_id)) varsByProduct.set(v.product_id, []);
    varsByProduct.get(v.product_id)!.push(v);
  }

  // product_id -> bundle
  const bundleByProduct = new Map<string, any>();
  for (const b of bundles) bundleByProduct.set(b.product_id, b);

  // bundle_id -> components (for simple_bundle)
  const componentsByBundle = new Map<string, any[]>();
  for (const bi of bundleItems) {
    if (!componentsByBundle.has(bi.bundle_id)) componentsByBundle.set(bi.bundle_id, []);
    componentsByBundle.get(bi.bundle_id)!.push(bi);
  }

  // bundle_variation_id -> components
  const componentsByBundleVar = new Map<string, any[]>();
  for (const bvi of bundleVarItems) {
    if (!componentsByBundleVar.has(bvi.bundle_variation_id)) componentsByBundleVar.set(bvi.bundle_variation_id, []);
    componentsByBundleVar.get(bvi.bundle_variation_id)!.push(bvi);
  }

  // bundle_id -> bundle_variations
  const bundleVarsByBundle = new Map<string, any[]>();
  for (const bv of bundleVars) {
    if (!bundleVarsByBundle.has(bv.bundle_id)) bundleVarsByBundle.set(bv.bundle_id, []);
    bundleVarsByBundle.get(bv.bundle_id)!.push(bv);
  }

  const computeBundleStock = (components: any[]): number => {
    if (!components || components.length === 0) return 0;
    let min = Infinity;
    for (const c of components) {
      const s = varStock.get(c.variation_id) || 0;
      const possible = Math.floor(s / Math.max(1, c.quantity || 1));
      if (possible < min) min = possible;
    }
    return min === Infinity ? 0 : min;
  };

  const escapeXml = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  const items: string[] = [];

  for (const p of (products || []) as any[]) {
    const baseTitle = p.name_ar || p.name;
    const desc = p.short_description_ar || p.short_description || p.description_ar || p.description || baseTitle;
    const cleanDesc = desc.replace(/<[^>]*>/g, "").substring(0, 5000);
    const category = p.categories?.name || "General";
    const imageUrl = p.image_url || "";
    const link = `${siteUrl}/product/${p.product_number}`;
    // Group all variations under the parent product's SKU so Meta Catalog
    // groups them as one product. Fall back to product_number for legacy
    // products that don't have a SKU yet.
    const groupId = p.sku || String(p.product_number);
    const bundle = bundleByProduct.get(p.id);
    const productVars = varsByProduct.get(p.id) || [];

    const renderItem = (opts: {
      id: string;
      title: string;
      price: number;
      stock: number;
      image: string;
      sku?: string | null;
      groupId?: string;
    }) => {
      const availability = opts.stock > 0 ? "in stock" : "out of stock";
      return `    <item>
      <g:id>${escapeXml(opts.id)}</g:id>
      <g:title><![CDATA[${opts.title}]]></g:title>
      <g:description><![CDATA[${cleanDesc}]]></g:description>
      <g:link>${link}</g:link>
      <g:image_link>${opts.image}</g:image_link>
      <g:price>${Number(opts.price).toFixed(2)} ILS</g:price>
      <g:availability>${availability}</g:availability>
      <g:condition>new</g:condition>
      <g:brand>ELWEJHA</g:brand>
      <g:product_type><![CDATA[${category}]]></g:product_type>
      ${opts.groupId ? `<g:item_group_id>${escapeXml(opts.groupId)}</g:item_group_id>` : ""}
      ${opts.sku ? `<g:mpn>${escapeXml(opts.sku)}</g:mpn>` : ""}
    </item>`;
    };

    // Case 1: Bundle product
    if (bundle) {
      if (bundle.bundle_type === "variable_bundle") {
        const bvs = bundleVarsByBundle.get(bundle.id) || [];
        if (bvs.length === 0) continue;
        for (const bv of bvs) {
          const components = componentsByBundleVar.get(bv.id) || [];
          const stock = computeBundleStock(components);
          const variantTitle = `${baseTitle} - ${bv.name_he || bv.name}`;
          items.push(renderItem({
            id: bv.sku || `${p.product_number}-${bv.id.substring(0, 8)}`,
            title: variantTitle,
            price: Number(bv.price) || Number(p.sale_price),
            stock,
            image: imageUrl,
            sku: bv.sku,
            groupId,
          }));
        }
      } else {
        const components = componentsByBundle.get(bundle.id) || [];
        const stock = computeBundleStock(components);
        items.push(renderItem({
          id: p.sku || String(p.product_number),
          title: baseTitle,
          price: Number(p.sale_price),
          stock,
          image: imageUrl,
          sku: p.sku,
        }));
      }
      continue;
    }

    // Case 2: Regular product with multiple real variations (>1, or single non-Default)
    const realVars = productVars.filter((v) => (v.name || "").toLowerCase() !== "default");
    if (productVars.length > 1 || realVars.length >= 1 && productVars.length > 1) {
      for (const v of productVars) {
        const stock = varStock.get(v.id) || 0;
        const vName = v.name_ar || v.name;
        const isDefault = (v.name || "").toLowerCase() === "default";
        const title = isDefault ? baseTitle : `${baseTitle} - ${vName}`;
        items.push(renderItem({
          id: v.sku || `${p.product_number}-${v.id.substring(0, 8)}`,
          title,
          price: Number(v.price) || Number(p.sale_price),
          stock,
          image: v.image_url || imageUrl,
          sku: v.sku,
          groupId,
        }));
      }
      continue;
    }

    // Case 3: Simple product (single Default variation or none)
    const onlyVar = productVars[0];
    const stock = onlyVar ? (varStock.get(onlyVar.id) || 0) : 0;
    items.push(renderItem({
      id: p.sku || String(p.product_number),
      title: baseTitle,
      price: Number(p.sale_price),
      stock,
      image: imageUrl,
      sku: p.sku,
    }));
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
  <channel>
    <title>ELWEJHA Product Feed</title>
    <link>${siteUrl}</link>
    <description>Product feed for Meta catalog</description>
${items.join("\n")}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: {
      ...corsHeaders,
      "Content-Type": "application/xml; charset=utf-8",
    },
  });
});
