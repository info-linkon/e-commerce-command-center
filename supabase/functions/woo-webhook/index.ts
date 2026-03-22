import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // WooCommerce sends webhook data as JSON body
    const payload = await req.json();

    // Determine webhook topic from headers or payload
    const topic = req.headers.get("x-wc-webhook-topic") || "";
    console.log(`Webhook received: ${topic}, order #${payload.number || payload.id}`);

    if (topic === "order.created" || topic === "order.updated" || !topic) {
      // Process incoming order
      if (!payload.id || !payload.number) {
        return new Response(JSON.stringify({ error: "Invalid order payload" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const statusMap: Record<string, string> = {
        pending: "pending",
        processing: "processing",
        completed: "completed",
        cancelled: "cancelled",
        refunded: "cancelled",
        failed: "cancelled",
        "on-hold": "pending",
      };

      // Check if order already exists (by order_number matching woo number)
      const { data: existing } = await supabase
        .from("orders")
        .select("id, status")
        .eq("notes", `WooCommerce Order #${payload.number}`)
        .maybeSingle();

      const shipping = payload.shipping || {};
      const shippingAddress = [shipping.address_1, shipping.address_2].filter(Boolean).join(", ") || null;

      const orderData = {
        customer_name: `${payload.billing?.first_name || ""} ${payload.billing?.last_name || ""}`.trim() || null,
        customer_phone: payload.billing?.phone || null,
        customer_email: payload.billing?.email || null,
        total: Number(payload.total) || 0,
        status: statusMap[payload.status] || "pending",
        source: "website" as const,
        notes: `WooCommerce Order #${payload.number}`,
        shipping_address: shippingAddress,
        shipping_city: shipping.city || null,
        shipping_country: shipping.country || null,
        shipping_postcode: shipping.postcode || null,
      };

      let orderId: string;

      if (existing) {
        // Update existing order status
        await supabase.from("orders").update({ status: orderData.status }).eq("id", existing.id);
        orderId = existing.id;
        console.log(`Updated existing order ${orderId} to status ${orderData.status}`);
      } else {
        // Create new order
        const { data: newOrder, error: orderErr } = await supabase
          .from("orders")
          .insert(orderData)
          .select("id")
          .single();
        if (orderErr) throw orderErr;
        orderId = newOrder.id;

        // Insert order items
        for (const item of payload.line_items || []) {
          let variationId = null;

          // Try to match by woo variation id
          if (item.variation_id) {
            const { data: v } = await supabase
              .from("product_variations")
              .select("id")
              .eq("woo_id", item.variation_id)
              .maybeSingle();
            if (v) variationId = v.id;
          }

          // Fallback: match by woo product id
          if (!variationId && item.product_id) {
            const { data: prod } = await supabase
              .from("products")
              .select("id")
              .eq("woo_id", item.product_id)
              .maybeSingle();
            if (prod) {
              const { data: defVar } = await supabase
                .from("product_variations")
                .select("id")
                .eq("product_id", prod.id)
                .limit(1)
                .maybeSingle();
              if (defVar) variationId = defVar.id;
            }
          }

          if (variationId) {
            await supabase.from("order_items").insert({
              order_id: orderId,
              variation_id: variationId,
              quantity: item.quantity || 1,
              unit_price: Number(item.price) || 0,
              total_price: Number(item.total) || 0,
            });
          }
        }

        console.log(`Created new order ${orderId} from WooCommerce #${payload.number}`);
      }

      return new Response(JSON.stringify({ success: true, order_id: orderId }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ skipped: true, topic }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("woo-webhook error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
