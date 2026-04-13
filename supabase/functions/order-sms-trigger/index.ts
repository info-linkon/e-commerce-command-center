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

    // Get active templates for this trigger (there can be multiple — customer + admin)
    const { data: templates } = await supabase
      .from("sms_templates")
      .select("*")
      .eq("trigger", trigger_type)
      .eq("active", true);

    if (!templates || templates.length === 0) {
      return new Response(JSON.stringify({ skipped: true, reason: "No active template" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const results: any[] = [];

    for (const template of templates) {
      // Determine recipient phone
      const recipientType = template.recipient_type || "customer";
      const phone = recipientType === "custom" ? template.recipient_phone : order.customer_phone;

      if (!phone) {
        results.push({ template_id: template.id, skipped: true, reason: "No phone number" });
        continue;
      }

      // Replace placeholders
      const orderLink = `https://elwejha.co.il/order/${order.order_number}`;

      let message = template.template_text
        .replace(/{customer_name}/g, order.customer_name || "")
        .replace(/{order_number}/g, String(order.order_number))
        .replace(/{total}/g, Number(order.total).toFixed(2))
        .replace(/{status}/g, order.status)
        .replace(/{phone}/g, order.customer_phone || "")
        .replace(/{order_link}/g, orderLink);

      // Call send-sms function
      const { error: smsErr } = await supabase.functions.invoke("send-sms", {
        body: { phone, message },
      });

      if (smsErr) {
        console.error("SMS trigger error:", smsErr);
        results.push({ template_id: template.id, error: smsErr.message });
      } else {
        results.push({ template_id: template.id, success: true });
      }
    }

    return new Response(JSON.stringify({ success: true, results }), {
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
