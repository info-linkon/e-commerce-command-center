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
    const { order_id, trigger_type } = await req.json();
    if (!order_id || !trigger_type) {
      return new Response(JSON.stringify({ error: "order_id and trigger_type required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get order
    const { data: order, error: orderErr } = await supabase
      .from("orders")
      .select("*")
      .eq("id", order_id)
      .single();

    if (orderErr || !order) {
      return new Response(JSON.stringify({ error: "Order not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!order.customer_phone) {
      return new Response(JSON.stringify({ error: "No phone number on order" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get active template for this trigger
    const { data: template } = await supabase
      .from("sms_templates")
      .select("*")
      .eq("trigger", trigger_type)
      .eq("active", true)
      .limit(1)
      .single();

    if (!template) {
      return new Response(JSON.stringify({ skipped: true, reason: "No active template" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Replace placeholders
    let message = template.template_text
      .replace(/{customer_name}/g, order.customer_name || "")
      .replace(/{order_number}/g, String(order.order_number))
      .replace(/{total}/g, Number(order.total).toFixed(2))
      .replace(/{status}/g, order.status)
      .replace(/{phone}/g, order.customer_phone || "");

    // Call send-sms function
    const { error: smsErr } = await supabase.functions.invoke("send-sms", {
      body: { phone: order.customer_phone, message },
    });

    if (smsErr) {
      console.error("SMS trigger error:", smsErr);
      return new Response(JSON.stringify({ error: smsErr.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Order SMS trigger error:", errorMessage);
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
