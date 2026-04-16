const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { order_id } = await req.json();
    if (!order_id) {
      return new Response(JSON.stringify({ error: "order_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch order details
    const { data: order, error: orderErr } = await supabase
      .from("orders")
      .select("*, order_items(*, product_variations(name, sku, products(name, name_ar)))")
      .eq("id", order_id)
      .single();

    if (orderErr || !order) {
      return new Response(JSON.stringify({ error: "Order not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Read admin email from site_content settings
    const { data: emailConfig } = await supabase
      .from("site_content")
      .select("content")
      .eq("page", "settings")
      .eq("section", "notifications")
      .maybeSingle();

    const adminEmail = (emailConfig?.content as any)?.admin_email;
    if (!adminEmail) {
      return new Response(JSON.stringify({ skipped: true, reason: "no_admin_email" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build email content
    const items = (order.order_items || []) as any[];
    const itemsHtml = items.map((item: any) => {
      const productName = item.product_variations?.products?.name_ar || item.product_variations?.products?.name || "—";
      const varName = item.product_variations?.name || "";
      const sku = item.product_variations?.sku || "";
      return `<tr>
        <td style="padding:8px;border-bottom:1px solid #eee">${productName}${varName ? ` - ${varName}` : ""}</td>
        <td style="padding:8px;border-bottom:1px solid #eee">${sku}</td>
        <td style="padding:8px;border-bottom:1px solid #eee">${item.quantity}</td>
        <td style="padding:8px;border-bottom:1px solid #eee">₪${Number(item.unit_price).toFixed(2)}</td>
        <td style="padding:8px;border-bottom:1px solid #eee">₪${Number(item.total_price).toFixed(2)}</td>
      </tr>`;
    }).join("");

    const paymentLabel: Record<string, string> = { cash: "מזומן", credit: "אשראי", bit: "ביט" };
    const sourceLabel: Record<string, string> = { manual: "ידני", pos: "POS", website: "אתר" };

    const html = `
    <div dir="rtl" style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
      <h2 style="color:#333">הזמנה חדשה #${order.order_number}</h2>
      <p><strong>מקור:</strong> ${sourceLabel[order.source] || order.source}</p>
      <p><strong>לקוח:</strong> ${order.customer_name || "—"}</p>
      <p><strong>טלפון:</strong> ${order.customer_phone || "—"}</p>
      <p><strong>אימייל:</strong> ${order.customer_email || "—"}</p>
      ${order.shipping_city ? `<p><strong>עיר:</strong> ${order.shipping_city}</p>` : ""}
      ${order.shipping_address ? `<p><strong>כתובת:</strong> ${order.shipping_address}</p>` : ""}
      <p><strong>תשלום:</strong> ${paymentLabel[order.payment_method] || order.payment_method || "—"}</p>
      ${order.notes ? `<p><strong>הערות:</strong> ${order.notes}</p>` : ""}
      
      <table style="width:100%;border-collapse:collapse;margin:16px 0">
        <thead>
          <tr style="background:#f5f5f5">
            <th style="padding:8px;text-align:right">מוצר</th>
            <th style="padding:8px;text-align:right">מק״ט</th>
            <th style="padding:8px;text-align:right">כמות</th>
            <th style="padding:8px;text-align:right">מחיר</th>
            <th style="padding:8px;text-align:right">סה״כ</th>
          </tr>
        </thead>
        <tbody>${itemsHtml}</tbody>
      </table>
      
      <h3 style="color:#333">סה״כ: ₪${Number(order.total).toFixed(2)}</h3>
    </div>`;

    // Send via Inforu SMS API — or use a simple SMTP approach
    // For now, use a simple fetch to send via a generic email API
    // We'll use the Resend approach if available, otherwise log
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
    
    if (lovableApiKey) {
      // Try sending via Resend connector gateway
      const resendApiKey = Deno.env.get("RESEND_API_KEY");
      if (resendApiKey) {
        const emailRes = await fetch("https://connector-gateway.lovable.dev/resend/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${lovableApiKey}`,
            "X-Connection-Api-Key": resendApiKey,
          },
          body: JSON.stringify({
            from: "Elwejha <orders@elwejha.co.il>",
            to: [adminEmail],
            subject: `הזמנה חדשה #${order.order_number} — ₪${Number(order.total).toFixed(2)}`,
            html,
          }),
        });
        const emailData = await emailRes.json();
        console.log("Email sent via Resend:", JSON.stringify(emailData));
        return new Response(JSON.stringify({ success: true, provider: "resend" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Fallback: log the email content for manual review
    console.log(`Email notification for order #${order.order_number} to ${adminEmail}`);
    console.log("Subject:", `הזמנה חדשה #${order.order_number}`);
    
    return new Response(JSON.stringify({ success: true, provider: "log", note: "No email provider configured. Set RESEND_API_KEY for email delivery." }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Order email notify error:", errorMessage);
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
