import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function wooAuth() {
  const key = Deno.env.get("WOO_CONSUMER_KEY")!;
  const secret = Deno.env.get("WOO_CONSUMER_SECRET")!;
  return "Basic " + btoa(`${key}:${secret}`);
}

function wooUrl(path: string) {
  const base = Deno.env.get("WOO_STORE_URL")!.replace(/\/$/, "");
  return `${base}/wp-json/wc/v3${path}`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { product_id } = await req.json();
    if (!product_id) {
      return new Response(JSON.stringify({ error: "product_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 1. Get product from Supabase
    const { data: product, error: pErr } = await supabase
      .from("products")
      .select("*, categories!products_category_id_fkey(name, woo_id)")
      .eq("id", product_id)
      .single();

    if (pErr || !product) {
      return new Response(JSON.stringify({ error: "Product not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. Build WooCommerce product data
    const category = product.categories as any;
    const wooData: any = {
      name: product.name,
      type: product.product_type === "variable" ? "variable" : "simple",
      regular_price: product.product_type === "simple" ? String(product.sale_price) : undefined,
      sku: product.sku || undefined,
      description: product.description || "",
      short_description: product.short_description || "",
      status: product.is_published ? "publish" : "draft",
      categories: category?.woo_id ? [{ id: category.woo_id }] : [],
    };

    let wooProductId = product.woo_id;

    // 3. Create or update product in WooCommerce
    if (wooProductId) {
      // Update existing
      const res = await fetch(wooUrl(`/products/${wooProductId}`), {
        method: "PUT",
        headers: { Authorization: wooAuth(), "Content-Type": "application/json" },
        body: JSON.stringify(wooData),
      });
      if (!res.ok) {
        const t = await res.text();
        throw new Error(`WooCommerce update error ${res.status}: ${t}`);
      }
      await res.json();
      console.log(`Updated WooCommerce product ${wooProductId}`);
    } else {
      // Create new
      const res = await fetch(wooUrl("/products"), {
        method: "POST",
        headers: { Authorization: wooAuth(), "Content-Type": "application/json" },
        body: JSON.stringify(wooData),
      });
      if (!res.ok) {
        const t = await res.text();
        throw new Error(`WooCommerce create error ${res.status}: ${t}`);
      }
      const wooProduct = await res.json();
      wooProductId = wooProduct.id;

      // Save woo_id back to Supabase
      await supabase.from("products").update({ woo_id: wooProductId }).eq("id", product_id);
      console.log(`Created WooCommerce product ${wooProductId}`);
    }

    // 4. Sync variations if variable product
    if (product.product_type === "variable") {
      const { data: variations } = await supabase
        .from("product_variations")
        .select("*")
        .eq("product_id", product_id)
        .order("name");

      if (variations && variations.length > 0) {
        // Ensure "Size" attribute exists on the product for variations
        const attrRes = await fetch(wooUrl(`/products/${wooProductId}`), {
          method: "PUT",
          headers: { Authorization: wooAuth(), "Content-Type": "application/json" },
          body: JSON.stringify({
            attributes: [{
              name: "וריאציה",
              visible: true,
              variation: true,
              options: variations.map((v: any) => v.name),
            }],
          }),
        });
        if (attrRes.ok) await attrRes.json();

        for (const variation of variations) {
          const varData: any = {
            regular_price: String(variation.price),
            sku: variation.sku || undefined,
            manage_stock: true,
            attributes: [{ name: "וריאציה", option: variation.name }],
          };

          // Get total stock for this variation
          const { data: invRecords } = await supabase
            .from("inventory")
            .select("quantity")
            .eq("variation_id", variation.id);
          const totalStock = (invRecords || []).reduce((sum: number, r: any) => sum + (r.quantity || 0), 0);
          varData.stock_quantity = totalStock;

          if (variation.woo_id) {
            // Update existing variation
            const res = await fetch(wooUrl(`/products/${wooProductId}/variations/${variation.woo_id}`), {
              method: "PUT",
              headers: { Authorization: wooAuth(), "Content-Type": "application/json" },
              body: JSON.stringify(varData),
            });
            if (res.ok) await res.json();
          } else {
            // Create new variation
            const res = await fetch(wooUrl(`/products/${wooProductId}/variations`), {
              method: "POST",
              headers: { Authorization: wooAuth(), "Content-Type": "application/json" },
              body: JSON.stringify(varData),
            });
            if (res.ok) {
              const wooVar = await res.json();
              await supabase.from("product_variations").update({ woo_id: wooVar.id }).eq("id", variation.id);
              console.log(`Created WooCommerce variation ${wooVar.id} for ${variation.name}`);
            }
          }
        }
      }
    }

    return new Response(JSON.stringify({ success: true, product_id, woo_id: wooProductId }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("woo-product-sync error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
