// Public coupon validation endpoint.
//
// The `coupons` table is restricted to authenticated CRM users (it contains
// usage counters and full configuration). To let storefront customers type a
// code and get instant feedback without exposing the table, we run validation
// here with the service role and return ONLY the public-safe fields the
// checkout UI needs to render the discount line. Crucially, this does NOT
// increment `used_count` — that happens atomically inside `web-create-order`
// when the order is actually persisted.

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

    const body = (await req.json().catch(() => ({}))) as {
      code?: string;
      subtotal?: number;
    };
    const code = String(body.code || "").trim().toUpperCase();
    const subtotal = Number(body.subtotal || 0);

    if (!code) return json({ valid: false, error: "كود فارغ" }, 400);

    const { data: coupon, error } = await supabase
      .from("coupons")
      .select("id, code, type, value, min_order, max_uses, used_count, expires_at, active")
      .eq("code", code)
      .eq("active", true)
      .maybeSingle();

    if (error || !coupon) return json({ valid: false, error: "كود الكوبون غير صالح" });

    if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) {
      return json({ valid: false, error: "انتهت صلاحية الكوبون" });
    }
    if (coupon.max_uses && coupon.used_count >= coupon.max_uses) {
      return json({ valid: false, error: "الكوبون مستنفد" });
    }
    if (subtotal < Number(coupon.min_order || 0)) {
      return json({
        valid: false,
        error: `الحد الأدنى للطلب: ₪${coupon.min_order}`,
        min_order: Number(coupon.min_order || 0),
      });
    }

    const value = Number(coupon.value || 0);
    const discount =
      coupon.type === "percentage"
        ? Math.min(subtotal, (subtotal * value) / 100)
        : Math.min(subtotal, value);

    // Public-safe shape only: no id, no used_count.
    return json({
      valid: true,
      coupon: {
        code: coupon.code,
        type: coupon.type,
        value,
        min_order: Number(coupon.min_order || 0),
      },
      discount,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    console.error("web-validate-coupon error:", msg);
    return json({ valid: false, error: msg }, 500);
  }
});