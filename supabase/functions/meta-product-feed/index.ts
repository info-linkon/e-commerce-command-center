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
  const siteUrl = url.searchParams.get("site_url") || "https://elwejha.com";

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

  // Check inventory for each product
  const { data: inventory } = await supabase
    .from("inventory")
    .select("variation_id, quantity");

  const { data: variations } = await supabase
    .from("product_variations")
    .select("id, product_id");

  // Build product_id -> total stock map
  const stockMap = new Map<string, number>();
  if (variations && inventory) {
    for (const v of variations) {
      const invItems = inventory.filter((i) => i.variation_id === v.id);
      const total = invItems.reduce((sum, i) => sum + i.quantity, 0);
      stockMap.set(v.product_id, (stockMap.get(v.product_id) || 0) + total);
    }
  }

  const items = (products || []).map((p: any) => {
    const title = p.name_ar || p.name;
    const desc = p.short_description_ar || p.short_description || p.description_ar || p.description || title;
    // Strip HTML tags for description
    const cleanDesc = desc.replace(/<[^>]*>/g, "").substring(0, 5000);
    const stock = stockMap.get(p.id) || 0;
    const availability = stock > 0 ? "in stock" : "out of stock";
    const category = p.categories?.name || "General";
    const imageUrl = p.image_url || "";
    const link = `${siteUrl}/product/${p.product_number}`;

    return `    <item>
      <g:id>${p.sku || p.product_number}</g:id>
      <g:title><![CDATA[${title}]]></g:title>
      <g:description><![CDATA[${cleanDesc}]]></g:description>
      <g:link>${link}</g:link>
      <g:image_link>${imageUrl}</g:image_link>
      <g:price>${Number(p.sale_price).toFixed(2)} ILS</g:price>
      <g:availability>${availability}</g:availability>
      <g:condition>new</g:condition>
      <g:brand>ELWEJHA</g:brand>
      <g:product_type><![CDATA[${category}]]></g:product_type>
      ${p.sku ? `<g:mpn>${p.sku}</g:mpn>` : ""}
    </item>`;
  });

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
