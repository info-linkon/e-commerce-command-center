// Admin-initiated reconcile for orders where HYP was paid but our automated
// verify chain (hyp-callback → hyp-verify-payment, hyp-notify) never wrote
// the success to the DB. Trust model: the admin has already confirmed the
// transaction succeeded in the HYP merchant portal, and supplies the HYP
// transaction Id + amount. We then run the same side-effects as a successful
// verify (order → processing, payments row, invoice, SMS/email, woo-sync)
// via the shared `applyHypSuccess` helper.
//
// Requires an authenticated admin JWT (see supabase/config.toml).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { applyHypSuccess } from "../_shared/hyp-verify.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ReconcileInput {
  order_id: string;
  hyp_transaction_id: string;
  amount?: number;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseService = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Authenticate the caller against Supabase Auth using the incoming JWT.
    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace(/^Bearer\s+/i, "");
    if (!token) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const authClient = createClient(supabaseUrl, supabaseAnon, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data: authData } = await authClient.auth.getUser(token);
    if (!authData?.user) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = (await req.json()) as ReconcileInput;
    const { order_id, hyp_transaction_id, amount } = body;

    if (!order_id || !hyp_transaction_id) {
      return new Response(
        JSON.stringify({ error: "order_id and hyp_transaction_id are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Service-role client for the actual writes (bypasses RLS, inserts
    // payment row, triggers invoice/SMS/email/woo-sync).
    const supabase = createClient(supabaseUrl, supabaseService);

    const { data: order, error: orderErr } = await supabase
      .from("orders")
      .select("id, status, total, customer_name, customer_email, customer_phone, source, hyp_transaction_id")
      .eq("id", order_id)
      .maybeSingle();

    if (orderErr || !order) {
      return new Response(JSON.stringify({ error: "order not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (order.hyp_transaction_id) {
      return new Response(
        JSON.stringify({
          error: "order already has a HYP transaction recorded",
          hyp_transaction_id: order.hyp_transaction_id,
        }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Idempotency: if a payment with this reference already exists for the
    // order, treat as already reconciled.
    const reference = `HYP-${hyp_transaction_id}`;
    const { data: existingPayment } = await supabase
      .from("payments")
      .select("id")
      .eq("order_id", order_id)
      .eq("reference", reference)
      .maybeSingle();
    if (existingPayment) {
      return new Response(
        JSON.stringify({ success: true, already_processed: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const effectiveAmount = Number(
      typeof amount === "number" && isFinite(amount) ? amount : order.total,
    );

    // Audit: record who triggered the manual reconcile before mutating state.
    await supabase.from("payment_events").insert({
      order_id,
      event_type: "hyp_manual_reconcile_requested",
      success: true,
      message: authData.user.email || authData.user.id,
      metadata: { hyp_transaction_id, amount: effectiveAmount, user_id: authData.user.id },
    });

    const result = await applyHypSuccess(supabase, supabaseUrl, supabaseService, {
      orderId: order_id,
      hypId: hyp_transaction_id,
      amount: effectiveAmount,
      orderSource: order.source,
      customerName: order.customer_name,
      customerEmail: order.customer_email,
      customerPhone: order.customer_phone,
      source: "manual_reconcile",
    });

    const status = result.verified ? 200 : 500;
    return new Response(JSON.stringify({ success: result.verified, ...result }), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    console.error("hyp-reconcile error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
