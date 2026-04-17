// Short payment link handler: /functions/v1/pay-redirect?order=123
// - If the order is already paid or closed, shows an "already paid" HTML page
//   so the customer can't accidentally trigger a second charge by re-clicking
//   the SMS link after paying.
// - Otherwise 302s to the signed HYP URL stored on the order.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const htmlHeaders = { "Content-Type": "text/html; charset=utf-8" };

function page(title: string, bodyHtml: string, status = 200): Response {
  const html = `<!doctype html>
<html lang="he" dir="rtl">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>${title}</title>
  <style>
    body { font-family: system-ui, -apple-system, "Segoe UI", Arial, sans-serif; background: #f6f3ee; color: #222; margin: 0; padding: 0; }
    .wrap { max-width: 560px; margin: 10vh auto; padding: 2rem; background: #fff; border-radius: 16px; box-shadow: 0 4px 20px rgba(0,0,0,.06); text-align: center; }
    h1 { font-size: 1.5rem; margin: 0 0 .75rem; }
    p { color: #555; line-height: 1.6; }
    a.btn { display: inline-block; margin-top: 1.25rem; padding: .75rem 1.25rem; background: #c9a227; color: #fff; border-radius: 999px; text-decoration: none; font-weight: 600; }
  </style>
</head>
<body><div class="wrap">${bodyHtml}</div></body>
</html>`;
  return new Response(html, { status, headers: htmlHeaders });
}

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const orderNumber = url.searchParams.get("order");

  if (!orderNumber) {
    return page("מספר הזמנה חסר", `<h1>מספר הזמנה חסר</h1><p>הקישור אינו תקין.</p>`, 400);
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: order } = await supabase
      .from("orders")
      .select("payment_link_url, status, hyp_transaction_id")
      .eq("order_number", Number(orderNumber))
      .single();

    if (!order) {
      return page("הזמנה לא נמצאה", `<h1>הזמנה לא נמצאה</h1><p>בדוק את הקישור ונסה שוב, או פנה אלינו.</p>`, 404);
    }

    // Already paid — show friendly page, never forward to HYP
    const blockedStatuses = new Set(["processing", "picking", "shipping", "completed"]);
    if (order.hyp_transaction_id || blockedStatuses.has(order.status || "")) {
      return page(
        "ההזמנה כבר שולמה",
        `<h1>✔ ההזמנה כבר שולמה</h1>
         <p>הזמנה #${orderNumber} כבר שולמה. תודה על הרכישה!</p>
         <p>צוות השירות יתעדכן אוטומטית ויצור איתך קשר בקרוב.</p>
         <a class="btn" href="/">חזרה לדף הבית</a>`,
        200,
      );
    }

    if (order.status === "cancelled") {
      return page(
        "ההזמנה בוטלה",
        `<h1>ההזמנה בוטלה</h1>
         <p>הזמנה #${orderNumber} בוטלה. אם זו טעות, פנה אלינו בוואטסאפ.</p>
         <a class="btn" href="/">חזרה לדף הבית</a>`,
        200,
      );
    }

    if (!order.payment_link_url) {
      return page(
        "לינק תשלום לא זמין",
        `<h1>לינק תשלום לא זמין</h1><p>פנה אלינו כדי שנפיק לינק חדש.</p>`,
        404,
      );
    }

    return new Response(null, {
      status: 302,
      headers: { Location: order.payment_link_url },
    });
  } catch (e) {
    console.error("pay-redirect error:", e);
    return page("שגיאה", `<h1>שגיאה</h1><p>נסה שוב בעוד כמה רגעים או פנה אלינו.</p>`, 500);
  }
});
