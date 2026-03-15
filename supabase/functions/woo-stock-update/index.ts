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

    const { variation_id } = await req.json();
    if (!variation_id) {
      return new Response(JSON.stringify({ error: "variation_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 1. Get the variation and its woo_id
    const { data: variation } = await supabase
      .from("product_variations")
      .select("woo_id, product_id, products(woo_id, product_type)")
      .eq("id", variation_id)
      .single();

    if (!variation) {
      return new Response(JSON.stringify({ error: "Variation not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const product = variation.products as any;
    if (!product?.woo_id) {
      // Product not synced to Woo, skip silently
      return new Response(JSON.stringify({ skipped: true, reason: "no_woo_id" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. Sum total stock across all warehouses
    const { data: invRecords } = await supabase
      .from("inventory")
      .select("quantity")
      .eq("variation_id", variation_id);

    const totalStock = (invRecords || []).reduce((sum: number, r: any) => sum + (r.quantity || 0), 0);

    // 3. Push to WooCommerce
    const stockData = {
      stock_quantity: totalStock,
      manage_stock: true,
    };

    let wooResponse;
    if (product.product_type === "variable" && variation.woo_id) {
      // Update variation stock
      const res = await fetch(wooUrl(`/products/${product.woo_id}/variations/${variation.woo_id}`), {
        method: "PUT",
        headers: { Authorization: wooAuth(), "Content-Type": "application/json" },
        body: JSON.stringify(stockData),
      });
      wooResponse = { status: res.status, ok: res.ok };
      if (!res.ok) {
        const t = await res.text();
        throw new Error(`WooCommerce error ${res.status}: ${t}`);
      } else {
        await res.text();
      }
    } else {
      // Simple product — update product stock
      const res = await fetch(wooUrl(`/products/${product.woo_id}`), {
        method: "PUT",
        headers: { Authorization: wooAuth(), "Content-Type": "application/json" },
        body: JSON.stringify(stockData),
      });
      wooResponse = { status: res.status, ok: res.ok };
      if (!res.ok) {
        const t = await res.text();
        throw new Error(`WooCommerce error ${res.status}: ${t}`);
      } else {
        await res.text();
      }
    }

    console.log(`Stock updated for variation ${variation_id}: ${totalStock} units`);

    return new Response(JSON.stringify({ success: true, variation_id, total_stock: totalStock, woo: wooResponse }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("woo-stock-update error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
