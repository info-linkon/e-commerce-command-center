// Public storefront checkout endpoint.
//
// Why an edge function?
//   - The `orders`, `customers`, `order_items` tables are SELECT-restricted
//     (they contain PII and must not be readable by anon).
//   - Browser-side `.insert(...).select()` therefore fails RLS.
//   - We also can't trust prices, stock, or coupon validity from the client.
//
// This function runs with the service role and:
//   1. Re-validates each cart line against `product_variations` (real price)
//      and `inventory` (real stock).
//   2. Re-validates the coupon against `coupons` (active, not expired,
//      not exhausted, meets min_order).
//   3. Computes the final total server-side.
//   4. Inserts customer + order + order_items.
//   5. Returns only the public-safe fields the storefront needs to continue
//      (id, order_number, access_token).

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

interface IncomingItem {
  variation_id: string; // resolved (default-variation) id used for inventory & order_items
  product_id: string;
  quantity: number;
  bundle_variation_id?: string | null;
}

interface IncomingPayload {
  customer_name: string;
  customer_phone: string;
  customer_email?: string | null;
  shipping_method: "delivery" | "pickup";
  shipping_city?: string | null;
  shipping_address?: string | null;
  shipping_cost: number;
  notes?: string | null;
  payment_method: "cash" | "credit";
  coupon_code?: string | null;
  items: IncomingItem[];
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const payload = (await req.json()) as IncomingPayload;

    // ── Basic input validation ─────────────────────────────────────────
    if (!payload || !Array.isArray(payload.items) || payload.items.length === 0) {
      return jsonResponse({ error: "السلة فارغة" }, 400);
    }
    if (!payload.customer_name?.trim() || !payload.customer_phone?.trim()) {
      return jsonResponse({ error: "بيانات الزبون ناقصة" }, 400);
    }
    if (payload.payment_method !== "cash" && payload.payment_method !== "credit") {
      return jsonResponse({ error: "طريقة دفع غير صالحة" }, 400);
    }

    const variationIds = Array.from(new Set(payload.items.map((i) => i.variation_id))).filter(Boolean);
    if (variationIds.length === 0) {
      return jsonResponse({ error: "منتجات غير صالحة في السلة" }, 400);
    }

    // ── Fetch authoritative variation prices ───────────────────────────
    const { data: variations, error: varErr } = await supabase
      .from("product_variations")
      .select("id, price, product_id")
      .in("id", variationIds);
    if (varErr) throw varErr;

    const variationMap = new Map<string, { id: string; price: number; product_id: string }>();
    for (const v of variations || []) variationMap.set(v.id, v as any);

    for (const item of payload.items) {
      if (!variationMap.has(item.variation_id)) {
        return jsonResponse({ error: `منتج غير موجود (${item.variation_id})` }, 400);
      }
      if (!item.quantity || item.quantity <= 0) {
        return jsonResponse({ error: "كمية غير صالحة" }, 400);
      }
    }

    // ── Fetch authoritative bundle-variation prices (if any) ───────────
    const bundleVariationIds = Array.from(
      new Set(payload.items.map((i) => i.bundle_variation_id).filter((x): x is string => Boolean(x))),
    );
    const bundleVariationMap = new Map<string, { id: string; price: number }>();
    if (bundleVariationIds.length > 0) {
      const { data: bvs, error: bvErr } = await supabase
        .from("bundle_variations")
        .select("id, price")
        .in("id", bundleVariationIds);
      if (bvErr) throw bvErr;
      for (const bv of bvs || []) bundleVariationMap.set(bv.id, bv as any);
    }

    // ── Stock check (sum across warehouses) ────────────────────────────
    const { data: inventoryRows, error: invErr } = await supabase
      .from("inventory")
      .select("variation_id, quantity")
      .in("variation_id", variationIds);
    if (invErr) throw invErr;

    const stockByVariation = new Map<string, number>();
    for (const row of inventoryRows || []) {
      stockByVariation.set(
        row.variation_id,
        (stockByVariation.get(row.variation_id) || 0) + (row.quantity || 0),
      );
    }

    // Aggregate requested qty per variation (a bundle may share underlying variation)
    const requestedByVariation = new Map<string, number>();
    for (const item of payload.items) {
      requestedByVariation.set(
        item.variation_id,
        (requestedByVariation.get(item.variation_id) || 0) + item.quantity,
      );
    }

    for (const [vid, requested] of requestedByVariation) {
      const available = stockByVariation.get(vid) ?? 0;
      if (available < requested) {
        return jsonResponse(
          { error: "أحد المنتجات في السلة لم يعد متوفراً بالكمية المطلوبة", out_of_stock_variation_id: vid },
          409,
        );
      }
    }

    // ── Compute subtotal server-side ───────────────────────────────────
    let subtotal = 0;
    const orderItemsToInsert: Array<{
      variation_id: string;
      bundle_variation_id: string | null;
      quantity: number;
      unit_price: number;
      total_price: number;
    }> = [];

    for (const item of payload.items) {
      const unitPrice = item.bundle_variation_id
        ? bundleVariationMap.get(item.bundle_variation_id)?.price
        : variationMap.get(item.variation_id)?.price;

      if (unitPrice === undefined || unitPrice === null) {
        return jsonResponse({ error: "سعر منتج غير صالح" }, 400);
      }

      const lineTotal = Number(unitPrice) * item.quantity;
      subtotal += lineTotal;
      orderItemsToInsert.push({
        variation_id: item.variation_id,
        bundle_variation_id: item.bundle_variation_id || null,
        quantity: item.quantity,
        unit_price: Number(unitPrice),
        total_price: lineTotal,
      });
    }

    // ── Coupon validation ──────────────────────────────────────────────
    let discountAmount = 0;
    let couponRow: { id: string; code: string; type: string; value: number } | null = null;
    if (payload.coupon_code && payload.coupon_code.trim()) {
      const { data: coupon } = await supabase
        .from("coupons")
        .select("*")
        .eq("code", payload.coupon_code.trim().toUpperCase())
        .eq("active", true)
        .maybeSingle();

      if (!coupon) {
        return jsonResponse({ error: "كود الكوبون غير صالح" }, 400);
      }
      if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) {
        return jsonResponse({ error: "انتهت صلاحية الكوبون" }, 400);
      }
      if (coupon.max_uses && coupon.used_count >= coupon.max_uses) {
        return jsonResponse({ error: "الكوبون مستنفد" }, 400);
      }
      if (subtotal < Number(coupon.min_order || 0)) {
        return jsonResponse({ error: `الحد الأدنى للطلب: ₪${coupon.min_order}` }, 400);
      }

      if (coupon.type === "percentage") {
        discountAmount = Math.min(subtotal, (subtotal * Number(coupon.value)) / 100);
      } else {
        discountAmount = Math.min(subtotal, Number(coupon.value));
      }
      couponRow = coupon as any;
    }

    const shippingCost = Math.max(0, Number(payload.shipping_cost) || 0);
    const finalTotal = Math.max(0, subtotal - discountAmount + (payload.shipping_method === "pickup" ? 0 : shippingCost));

    // ── Upsert customer (best effort — not critical to checkout) ───────
    let customerId: string | null = null;
    try {
      const { data: existingCustomer } = await supabase
        .from("customers")
        .select("id")
        .eq("phone", payload.customer_phone)
        .maybeSingle();
      if (existingCustomer) {
        customerId = existingCustomer.id;
      } else {
        const { data: newCustomer } = await supabase
          .from("customers")
          .insert({
            name: payload.customer_name,
            phone: payload.customer_phone,
            email: payload.customer_email || null,
            city: payload.shipping_city || null,
          })
          .select("id")
          .single();
        customerId = newCustomer?.id || null;
      }
    } catch (e) {
      console.warn("customer upsert failed (non-fatal):", e);
    }

    // ── Create the order ───────────────────────────────────────────────
    const isCash = payload.payment_method === "cash";
    const { data: order, error: orderErr } = await supabase
      .from("orders")
      .insert({
        source: "website",
        status: isCash ? "pending" : "pending_payment",
        payment_method: isCash ? "cash" : "credit",
        customer_id: customerId,
        customer_name: payload.customer_name,
        customer_phone: payload.customer_phone,
        customer_email: payload.customer_email || null,
        shipping_city: payload.shipping_method === "delivery" ? (payload.shipping_city || "") : "איסוף עצמי",
        shipping_address: payload.shipping_method === "delivery" ? (payload.shipping_address || "") : "",
        shipping_cost: payload.shipping_method === "pickup" ? 0 : shippingCost,
        discount_amount: discountAmount,
        discount_type: couponRow ? couponRow.type : null,
        discount_value: couponRow ? Number(couponRow.value) : 0,
        notes: payload.notes || null,
        total: finalTotal,
      })
      .select("id, order_number, access_token")
      .single();

    if (orderErr || !order) {
      console.error("order insert failed:", orderErr);
      return jsonResponse({ error: "فشل إنشاء الطلب", detail: orderErr?.message }, 500);
    }

    // ── Insert order items ─────────────────────────────────────────────
    const itemsToInsert = orderItemsToInsert.map((it) => ({ ...it, order_id: order.id }));
    const { error: itemsErr } = await supabase.from("order_items").insert(itemsToInsert);
    if (itemsErr) {
      console.error("order_items insert failed:", itemsErr);
      // Roll back the order so we don't leave an empty shell
      await supabase.from("orders").delete().eq("id", order.id);
      return jsonResponse({ error: "فشل حفظ منتجات الطلب", detail: itemsErr.message }, 500);
    }

    return jsonResponse({
      success: true,
      order_id: order.id,
      order_number: order.order_number,
      access_token: order.access_token,
      total: finalTotal,
      coupon_id: couponRow?.id || null,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    console.error("web-create-order error:", msg);
    return jsonResponse({ error: msg }, 500);
  }
});