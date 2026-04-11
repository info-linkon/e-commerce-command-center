import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const orderNumber = url.searchParams.get("order");

  if (!orderNumber) {
    return new Response("<h1>מספר הזמנה חסר</h1>", {
      status: 400,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: order } = await supabase
      .from("orders")
      .select("payment_link_url")
      .eq("order_number", Number(orderNumber))
      .single();

    const paymentUrl = order?.payment_link_url;
    if (!paymentUrl) {
      return new Response("<h1>לינק תשלום לא זמין</h1>", {
        status: 404,
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    }

    return new Response(null, {
      status: 302,
      headers: { Location: paymentUrl },
    });
  } catch (e) {
    console.error("pay-redirect error:", e);
    return new Response("<h1>שגיאה</h1>", {
      status: 500,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }
});
