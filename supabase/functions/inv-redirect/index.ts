// Public short invoice link handler: /functions/v1/inv-redirect?code=XXXX
// Looks up the document by short_code via service role (bypasses RLS) and 302s
// to the doc_url so anyone with the link can open it without logging in.

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
  </style>
</head>
<body><div class="wrap">${bodyHtml}</div></body>
</html>`;
  return new Response(new TextEncoder().encode(html), { status, headers: htmlHeaders });
}

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");

  if (!code) {
    return page("קוד מסמך חסר", `<h1>קוד מסמך חסר</h1><p>הקישור אינו תקין.</p>`, 400);
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: doc } = await supabase
      .from("documents")
      .select("doc_url, status")
      .eq("short_code", code)
      .maybeSingle();

    if (!doc) {
      return page("מסמך לא נמצא", `<h1>מסמך לא נמצא</h1><p>הקישור אינו תקין או שהמסמך אינו זמין.</p>`, 404);
    }

    if (!doc.doc_url) {
      if (doc.status === "failed") {
        return page("הפקת המסמך נכשלה", `<h1>הפקת המסמך נכשלה</h1><p>פנה לתמיכה לבדיקה.</p>`, 410);
      }
      return page("המסמך עדיין בהפקה", `<h1>המסמך עדיין בהפקה</h1><p>נסה שוב בעוד דקה.</p>`, 202);
    }

    return new Response(null, { status: 302, headers: { Location: doc.doc_url } });
  } catch (e) {
    console.error("inv-redirect error:", e);
    return page("שגיאה", `<h1>שגיאה</h1><p>נסה שוב בעוד כמה רגעים.</p>`, 500);
  }
});