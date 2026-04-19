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

  try {
    const url = new URL(req.url);
    const orderNumber = url.searchParams.get("order_number");

    if (!orderNumber) {
      return new Response(JSON.stringify({ error: "order_number required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const num = parseInt(orderNumber, 10);
    if (isNaN(num)) {
      return new Response(JSON.stringify({ error: "Invalid order_number" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get order
    const { data: order, error: orderErr } = await supabase
      .from("orders")
      .select("id, order_number, status, total, created_at, customer_name, shipping_address, shipping_city, payment_method, discount_amount, shipping_cost, notes, source, hyp_transaction_id, payment_link_url")
      .eq("order_number", num)
      .single();

    if (orderErr || !order) {
      return new Response(JSON.stringify({ error: "Order not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get order items with product/variation info (use already-fetched order.id)
    const { data: rawItems } = await supabase
      .from("order_items")
      .select("quantity, unit_price, total_price, variation_id, bundle_variation_id, order_id")
      .eq("order_id", (order as any).id);

    // Enrich items with names
    const items: any[] = [];
    for (const item of rawItems || []) {
      let name = "";
      let variationName = "";
      let imageUrl = "";

      if (item.variation_id) {
        const { data: variation } = await supabase
          .from("product_variations")
          .select("name, name_ar, image_url, product_id")
          .eq("id", item.variation_id)
          .single();

        if (variation) {
          variationName = variation.name_ar || variation.name;
          const { data: product } = await supabase
            .from("products")
            .select("name, name_ar, image_url")
            .eq("id", variation.product_id)
            .single();
          if (product) {
            name = product.name_ar || product.name;
            imageUrl = variation.image_url || product.image_url || "";
          }
        }
      }

      if (item.bundle_variation_id) {
        const { data: bv } = await supabase
          .from("bundle_variations")
          .select("name, name_he, bundle_id")
          .eq("id", item.bundle_variation_id)
          .single();
        if (bv) {
          variationName = bv.name;
        }
      }

      items.push({
        name,
        variationName,
        imageUrl,
        quantity: item.quantity,
        unitPrice: item.unit_price,
        totalPrice: item.total_price,
      });
    }

    return new Response(JSON.stringify({ order, items }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Order summary error:", errorMessage);
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
