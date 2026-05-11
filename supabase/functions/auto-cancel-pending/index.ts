import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

/**
 * Auto-cancels website orders stuck in `pending_payment` for over 1 hour.
 * Triggered by pg_cron every 10 minutes.
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const cutoff = new Date(Date.now() - 60 * 60 * 1000).toISOString();

    const { data: stale, error: selErr } = await supabase
      .from("orders")
      .select("id, order_number")
      .eq("status", "pending_payment")
      .eq("source", "website")
      .lt("created_at", cutoff);

    if (selErr) throw selErr;

    const cancelledIds: string[] = [];
    for (const o of stale || []) {
      const { error: upErr } = await supabase
        .from("orders")
        .update({ status: "cancelled" })
        .eq("id", o.id);
      if (upErr) {
        console.error(`Failed to cancel order ${o.order_number}:`, upErr);
        continue;
      }
      cancelledIds.push(o.id);
    }

    return new Response(
      JSON.stringify({
        success: true,
        scanned: stale?.length || 0,
        cancelled: cancelledIds.length,
        cancelled_ids: cancelledIds,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error("auto-cancel-pending error:", msg);
    return new Response(JSON.stringify({ success: false, error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});