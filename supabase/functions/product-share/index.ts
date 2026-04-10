import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    // Extract product number from path: /product-share/123
    const segments = url.pathname.split("/").filter(Boolean);
    const productNumber = parseInt(segments[segments.length - 1], 10);

    if (isNaN(productNumber)) {
      return new Response("Missing product number", { status: 400 });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: product, error } = await supabase
      .from("products")
      .select("name, name_ar, image_url, short_description, short_description_ar, sale_price, product_number")
      .eq("product_number", productNumber)
      .eq("is_published", true)
      .single();

    if (error || !product) {
      // Redirect to homepage if product not found
      return Response.redirect("https://elwejha.co.il", 302);
    }

    const siteUrl = "https://elwejha.co.il";
    const productUrl = `${siteUrl}/product/${product.product_number}`;
    const title = product.name_ar
      ? `${product.name_ar} | ${product.name}`
      : product.name;
    const description = product.short_description_ar || product.short_description || `${title} - ₪${product.sale_price}`;
    const imageUrl = product.image_url || `${siteUrl}/og-image.png`;

    const html = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(title)} | ELWEJHA</title>
  <meta name="description" content="${escapeHtml(description)}" />

  <!-- Open Graph -->
  <meta property="og:type" content="product" />
  <meta property="og:title" content="${escapeHtml(title)}" />
  <meta property="og:description" content="${escapeHtml(description)}" />
  <meta property="og:image" content="${escapeHtml(imageUrl)}" />
  <meta property="og:url" content="${escapeHtml(productUrl)}" />
  <meta property="og:site_name" content="ELWEJHA - الوجهة" />
  <meta property="product:price:amount" content="${product.sale_price}" />
  <meta property="product:price:currency" content="ILS" />

  <!-- Twitter -->
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${escapeHtml(title)}" />
  <meta name="twitter:description" content="${escapeHtml(description)}" />
  <meta name="twitter:image" content="${escapeHtml(imageUrl)}" />

  <!-- Redirect real users to the SPA product page -->
  <meta http-equiv="refresh" content="0;url=${escapeHtml(productUrl)}" />
  <link rel="canonical" href="${escapeHtml(productUrl)}" />
</head>
<body>
  <p>Redirecting to <a href="${escapeHtml(productUrl)}">${escapeHtml(title)}</a>...</p>
  <script>window.location.replace("${productUrl}");</script>
</body>
</html>`;

    return new Response(html, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "public, max-age=3600",
        ...corsHeaders,
      },
    });
  } catch (err) {
    console.error("product-share error:", err);
    return Response.redirect("https://elwejha.co.il", 302);
  }
});

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
