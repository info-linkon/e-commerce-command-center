// Printable 100×150mm shipping labels for deliveries (Olivery or any other company).
import { code128Svg } from "@/lib/code128";

export interface DeliveryLabelData {
  orderNumber: number | string;
  trackingNumber?: string | null; // Olivery sequence
  companyName?: string | null;
  customerName?: string | null;
  customerPhone?: string | null;
  address?: string | null;
  area?: string | null;
  subArea?: string | null;
  codAmount?: number | null;
  itemCount?: number | null;
  items?: { name: string; quantity: number }[];
  notes?: string | null;
  createdAt?: string | null;
}

const SENDER_NAME = "Elwejha";

const esc = (s: unknown) =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const safeBarcode = (text: string, opts?: Parameters<typeof code128Svg>[1]) => {
  try {
    return code128Svg(text, opts);
  } catch {
    return "";
  }
};

function labelHtml(d: DeliveryLabelData): string {
  const tracking = d.trackingNumber ? String(d.trackingNumber) : "";
  const orderNo = String(d.orderNumber);
  const cod = Number(d.codAmount ?? 0);
  const date = d.createdAt ? new Date(d.createdAt) : new Date();
  const items = (d.items || []).filter((i) => i.name);
  const shownItems = items.slice(0, 6);
  const moreItems = items.length - shownItems.length;

  return `
  <section class="label">
    <header>
      <div class="sender">
        <img src="/logo.webp" alt="" onerror="this.style.display='none'" />
        <div>
          <div class="sender-name">${esc(SENDER_NAME)}</div>
          <div class="muted">${esc(date.toLocaleDateString("he-IL"))}</div>
        </div>
      </div>
      <div class="company">${esc(d.companyName || "")}</div>
    </header>

    ${tracking ? `
    <div class="barcode main">
      ${safeBarcode(tracking, { height: 56, moduleWidth: 2 })}
      <div class="code">${esc(tracking)}</div>
    </div>` : ""}

    <div class="row two">
      <div class="box">
        <div class="lbl">رقم الطلب · מס׳ הזמנה</div>
        <div class="val big">#${esc(orderNo)}</div>
      </div>
      <div class="box cod ${cod > 0 ? "" : "paid"}">
        <div class="lbl">المبلغ للتحصيل · לגבייה</div>
        <div class="val big">${cod > 0 ? `₪${cod.toFixed(2)}` : "مدفوع · שולם"}</div>
      </div>
    </div>

    <div class="box recipient">
      <div class="lbl">المستلم · נמען</div>
      <div class="val name">${esc(d.customerName || "")}</div>
      <div class="val phone" dir="ltr">${esc(d.customerPhone || "")}</div>
      ${d.area || d.subArea ? `<div class="val area">${esc([d.area, d.subArea].filter(Boolean).join(" / "))}</div>` : ""}
      <div class="val addr">${esc(d.address || "")}</div>
    </div>

    <div class="box items">
      <div class="lbl">المحتويات · תכולה (${esc(d.itemCount ?? items.reduce((s, i) => s + i.quantity, 0))})</div>
      ${shownItems.map((i) => `<div class="item"><span>${esc(i.name)}</span><span>×${esc(i.quantity)}</span></div>`).join("")}
      ${moreItems > 0 ? `<div class="muted">+${moreItems}…</div>` : ""}
    </div>

    ${d.notes ? `<div class="box notes"><div class="lbl">ملاحظات · הערות</div><div class="val">${esc(d.notes)}</div></div>` : ""}

    <footer class="barcode small">
      ${safeBarcode(orderNo, { height: 26, moduleWidth: 2 })}
    </footer>
  </section>`;
}

const STYLES = `
  @page { size: 100mm 150mm; margin: 0; }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; background: #fff; color: #000; }
  body { font-family: "Cairo", Arial, "Noto Sans Hebrew", sans-serif; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .label {
    width: 100mm; height: 150mm; padding: 4mm; overflow: hidden;
    display: flex; flex-direction: column; gap: 1.5mm;
    page-break-after: always; break-after: page;
  }
  .label:last-child { page-break-after: auto; break-after: auto; }
  header { display: flex; justify-content: space-between; align-items: center; border-bottom: 0.6mm solid #000; padding-bottom: 1.5mm; }
  .sender { display: flex; align-items: center; gap: 2mm; }
  .sender img { width: 10mm; height: 10mm; border-radius: 50%; object-fit: cover; }
  .sender-name { font-weight: 800; font-size: 13pt; line-height: 1; }
  .company { font-weight: 800; font-size: 14pt; border: 0.5mm solid #000; padding: 0.5mm 2mm; border-radius: 1.5mm; }
  .muted { color: #444; font-size: 8pt; }
  .barcode { text-align: center; }
  .barcode svg { display: block; width: 100%; }
  .barcode .code { font-family: monospace; font-size: 13pt; font-weight: 700; letter-spacing: 1px; }
  .barcode.small { margin-top: auto; flex: none; }
  .label > * { flex: none; }
  .label > .items { flex: 1 1 auto; min-height: 8mm; overflow: hidden; }
  .barcode.small svg { width: 60%; margin: 0 auto; }
  .row.two { display: grid; grid-template-columns: 1fr 1fr; gap: 2mm; }
  .box { border: 0.4mm solid #000; border-radius: 1.5mm; padding: 1.5mm 2mm; }
  .lbl { font-size: 7.5pt; color: #333; font-weight: 700; }
  .val { font-size: 10pt; }
  .val.big { font-size: 15pt; font-weight: 800; line-height: 1.15; }
  .cod { background: #000; color: #fff; }
  .cod .lbl { color: #ddd; }
  .cod.paid { background: #fff; color: #000; }
  .cod.paid .lbl { color: #333; }
  .recipient .name { font-size: 13pt; font-weight: 800; line-height: 1.3; }
  .recipient .phone { font-size: 12pt; font-weight: 700; text-align: right; line-height: 1.3; }
  .recipient .area { font-size: 12pt; font-weight: 800; line-height: 1.3; }
  .recipient .addr { font-size: 10pt; line-height: 1.3; }
  .items .item { display: flex; justify-content: space-between; font-size: 8.5pt; border-bottom: 0.2mm dashed #999; }
  .notes .val { font-size: 9pt; }
  @media screen {
    body { background: #e5e5e5; padding: 8mm; }
    .label { background: #fff; margin: 0 auto 8mm; box-shadow: 0 1mm 4mm rgba(0,0,0,.2); }
  }
`;

export function buildDeliveryLabelsHtml(labels: DeliveryLabelData[]): string {
  return `<!doctype html>
<html lang="ar" dir="rtl">
<head>
<meta charset="utf-8" />
<title>מדבקות משלוח</title>
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;700;800&display=swap" rel="stylesheet" />
<style>${STYLES}</style>
</head>
<body>
${labels.map(labelHtml).join("\n")}
<script>
  window.addEventListener("load", function () {
    (document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()).then(function () {
      setTimeout(function () { window.focus(); window.print(); }, 150);
    });
  });
</script>
</body>
</html>`;
}

/**
 * Opens the print window synchronously (so popup blockers allow it), then loads the label data
 * and writes the labels into it. Throws if the popup is blocked or loading fails.
 */
export async function printDeliveryLabels(
  load: DeliveryLabelData[] | (() => Promise<DeliveryLabelData[]>),
): Promise<void> {
  const w = window.open("", "_blank", "width=480,height=720");
  if (!w) throw new Error("החלון נחסם על ידי הדפדפן – אפשר חלונות קופצים לאתר");
  w.document.write('<p dir="rtl" style="font-family:sans-serif;padding:16px">טוען מדבקות…</p>');
  try {
    const labels = typeof load === "function" ? await load() : load;
    if (!labels.length) throw new Error("אין משלוחים להדפסה");
    const html = buildDeliveryLabelsHtml(labels).replace(/src="\/logo\.webp"/g, `src="${window.location.origin}/logo.webp"`);
    w.document.open();
    w.document.write(html);
    w.document.close();
  } catch (e) {
    w.close();
    throw e;
  }
}
