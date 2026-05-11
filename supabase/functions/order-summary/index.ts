// Public order summary endpoint.
//
// Access control:
//   - Order numbers are sequential and easy to guess, so we never serve order
//     details based on `order_number` alone.
//   - The caller must provide either:
//       a) the order's secret `access_token` (sent in our SMS link as ?t=…), or
//       b) the last 4 digits of the customer's phone number (?phone_last4=…).
//   - If neither is provided / matches, we return 401 with a `requires_phone`
//     flag so the public page can render a "verify with phone last 4" form.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

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
    const token = url.searchParams.get("token");
    const phoneLast4 = url.searchParams.get("phone_last4");

    if (!orderNumber) {
      return jsonResponse({ error: "order_number required" }, 400);
    }

    const num = parseInt(orderNumber, 10);
    if (isNaN(num)) {
      return jsonResponse({ error: "Invalid order_number" }, 400);
    }

    // Get order
    const { data: order, error: orderErr } = await supabase
      .from("orders")
      .select("id, order_number, status, total, created_at, customer_name, customer_phone, shipping_address, shipping_city, payment_method, discount_amount, shipping_cost, notes, source, hyp_transaction_id, payment_link_url, access_token")
      .eq("order_number", num)
      .single();

    if (orderErr || !order) {
      return jsonResponse({ error: "Order not found" }, 404);
    }

    // ---- Access check ---------------------------------------------------
    const tokenOk = !!token && !!(order as any).access_token && token === (order as any).access_token;

    let phoneOk = false;
    if (!tokenOk && phoneLast4 && /^\d{4}$/.test(phoneLast4)) {
      const digits = (order.customer_phone || "").replace(/\D/g, "");
      phoneOk = digits.length >= 4 && digits.endsWith(phoneLast4);
    }

    if (!tokenOk && !phoneOk) {
      return jsonResponse(
        {
          error: "Unauthorized",
          requires_phone: true,
          // Return only enough metadata to render the verification screen.
          order_number: order.order_number,
        },
        401,
      );
    }

    // Strip secret fields before returning
    const safeOrder = { ...(order as any) };
    delete safeOrder.access_token;
    delete safeOrder.customer_phone; // never expose phone publicly

    // Sum recorded payments (so the public page can show paid / remaining)
    const { data: paymentRows } = await supabase
      .from("payments")
      .select("amount, payment_method, cash_registers(requires_completed_order)")
      .eq("order_id", (order as any).id);
    const totalPaid = (paymentRows || []).reduce((s: number, p: any) => {
      const isDeferredCash = p.payment_method === "cash" && p.cash_registers?.requires_completed_order;
      return isDeferredCash ? s : s + Number(p.amount || 0);
    }, 0);
    (safeOrder as any).total_paid = totalPaid;

    // Get order items with product/variation info
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
          .select("name, name_ar, image_url, product_id, sku")
          .eq("id", item.variation_id)
          .single();

        if (variation) {
          variationName = variation.name_ar || variation.name;
          // capture sku for downstream pixel use
          (item as any)._sku = variation.sku || null;
          const { data: product } = await supabase
            .from("products")
            .select("name, name_ar, image_url, sku")
            .eq("id", variation.product_id)
            .single();
          if (product) {
            name = product.name_ar || product.name;
            imageUrl = variation.image_url || product.image_url || "";
            if (!(item as any)._sku) (item as any)._sku = product.sku || null;
          }
        }
      }

      if (item.bundle_variation_id) {
        const { data: bv } = await supabase
          .from("bundle_variations")
          .select("name, name_he, bundle_id, sku")
          .eq("id", item.bundle_variation_id)
          .single();
        if (bv) {
          variationName = bv.name;
          (item as any)._sku = bv.sku || null;
        }
      }

      items.push({
        name,
        variationName,
        imageUrl,
        sku: (item as any)._sku || null,
        quantity: item.quantity,
        unitPrice: item.unit_price,
        totalPrice: item.total_price,
      });
    }

    return jsonResponse({ order: safeOrder, items });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Order summary error:", errorMessage);
    return jsonResponse({ error: errorMessage }, 500);
  }
});
