// Printable 4×6 inch shipping labels (Olivery, other couriers, or self-pickup).
import { code128Svg } from "@/lib/code128";
import logoUrl from "@/assets/logo.webp";

export interface DeliveryLabelData {
  orderNumber: number | string;
  trackingNumber?: string | null; // Olivery sequence
  companyName?: string | null;
  isPickup?: boolean;
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
  /** Box number (1-based) and total boxes, e.g. 2 of 3. */
  packageIndex?: number;
  packageCount?: number;
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

/** Expands each label into `count` copies numbered 1/count … count/count. */
export function expandPackages(labels: DeliveryLabelData[], count: number): DeliveryLabelData[] {
  const n = Math.max(1, Math.min(50, Math.floor(count) || 1));
  return labels.flatMap((l) =>
    Array.from({ length: n }, (_, i) => ({ ...l, packageIndex: i + 1, packageCount: n })),
  );
}

function labelHtml(d: DeliveryLabelData, logoSrc: string): string {
  const tracking = d.trackingNumber ? String(d.trackingNumber) : "";
  const orderNo = String(d.orderNumber);
  const cod = Number(d.codAmount ?? 0);
  const date = d.createdAt ? new Date(d.createdAt) : new Date();
  const items = (d.items || []).filter((i) => i.name);
  const pkg = d.packageCount && d.packageCount > 1 ? `${d.packageIndex}/${d.packageCount}` : "";
  const company = d.isPickup ? "استلام ذاتي · איסוף עצמי" : d.companyName || "";
  // Self-pickup labels use the order number as the main barcode.
  const mainCode = tracking || (d.isPickup ? orderNo : "");

  return `
  <section class="label" data-order="${esc(orderNo)}" data-pkg="${esc(pkg)}" data-pkg-index="${esc(d.packageIndex ?? 1)}">
    <header>
      <div class="sender">
        ${logoSrc ? `<img src="${logoSrc}" alt="" />` : ""}
        <div>
          <div class="sender-name">${esc(SENDER_NAME)}</div>
          <div class="muted">${esc(date.toLocaleDateString("he-IL"))}</div>
        </div>
      </div>
      <div class="head-right">
        ${pkg ? `<div class="pkg"><div class="lbl">كرتونة · קרטון</div><div class="pkg-val" dir="ltr">${esc(pkg)}</div></div>` : ""}
        <div class="company ${d.isPickup ? "pickup" : ""}">${esc(company)}</div>
      </div>
    </header>

    ${mainCode ? `
    <div class="barcode main">
      ${safeBarcode(mainCode, { height: 56, moduleWidth: 2 })}
      <div class="code">${esc(mainCode)}</div>
    </div>` : ""}

    <div class="row two">
      <div class="box">
        <div class="lbl">رقم الطلب · מס׳ הזמנה</div>
        <div class="val big">#${esc(orderNo)}</div>
      </div>
      <div class="box cod ${cod > 0 ? "" : "paid"}">
        <div class="lbl">${d.isPickup ? "للدفع · לתשלום" : "المبلغ للتحصيل · לגבייה"}</div>
        <div class="val big">${cod > 0 ? `₪${cod.toFixed(2)}` : "مدفوع · שולם"}</div>
      </div>
    </div>

    <div class="box recipient">
      <div class="lbl">${d.isPickup ? "الزبون · לקוח" : "المستلم · נמען"}</div>
      <div class="val name">${esc(d.customerName || "")}</div>
      <div class="val phone" dir="ltr">${esc(d.customerPhone || "")}</div>
      ${!d.isPickup && (d.area || d.subArea) ? `<div class="val area">${esc([d.area, d.subArea].filter(Boolean).join(" / "))}</div>` : ""}
      ${!d.isPickup && d.address ? `<div class="val addr">${esc(d.address)}</div>` : ""}
    </div>

    <div class="box items">
      <div class="lbl">المحتويات · תכולה (${esc(d.itemCount ?? items.reduce((s, i) => s + i.quantity, 0))})</div>
      <div class="item-list">
        ${items.map((i) => `<div class="item"><span>${esc(i.name)}</span><span>×${esc(i.quantity)}</span></div>`).join("")}
      </div>
    </div>

    ${d.notes ? `<div class="box notes"><div class="lbl">ملاحظات · הערות</div><div class="val">${esc(d.notes)}</div></div>` : ""}

    ${tracking ? `<footer class="barcode small">${safeBarcode(orderNo, { height: 26, moduleWidth: 2 })}</footer>` : ""}
  </section>`;
}

// 4×6 inch (101.6×152.4mm). The 5mm inner margin keeps content clear of the
// printer's non-printable edge, which is what was cutting off the top/logo.
const STYLES = `
  @page { size: 4in 6in; margin: 0; }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; background: #fff; color: #000; }
  body { font-family: "Cairo", Arial, "Noto Sans Hebrew", sans-serif; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .label {
    width: 4in; height: 6in; padding: 5mm 5mm 4mm; overflow: hidden;
    display: flex; flex-direction: column; gap: 1.5mm;
    page-break-after: always; break-after: page;
  }
  .label:last-child { page-break-after: auto; break-after: auto; }
  header { display: flex; justify-content: space-between; align-items: center; gap: 2mm; border-bottom: 0.6mm solid #000; padding-bottom: 1.5mm; }
  .sender { display: flex; align-items: center; gap: 2mm; }
  .sender img { width: 11mm; height: 11mm; border-radius: 50%; object-fit: cover; }
  .sender-name { font-weight: 800; font-size: 13pt; line-height: 1; }
  .head-right { display: flex; align-items: center; gap: 2mm; }
  .company { font-weight: 800; font-size: 13pt; border: 0.5mm solid #000; padding: 0.5mm 2mm; border-radius: 1.5mm; }
  .company.pickup { font-size: 10pt; background: #000; color: #fff; }
  .pkg { text-align: center; border: 0.6mm solid #000; border-radius: 1.5mm; padding: 0 2mm; line-height: 1.1; }
  .pkg .lbl { font-size: 6.5pt; }
  .pkg-val { font-size: 17pt; font-weight: 800; }
  .muted { color: #444; font-size: 8pt; }
  .barcode { text-align: center; }
  .barcode svg { display: block; width: 100%; }
  .barcode .code { font-family: monospace; font-size: 13pt; font-weight: 700; letter-spacing: 1px; }
  .barcode.small { margin-top: auto; }
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
  /* Long item lists: smaller font in two columns, then continuation labels (see FIT_SCRIPT). */
  .items.compact .item-list { display: grid; grid-template-columns: 1fr 1fr; column-gap: 3mm; }
  .items.compact .item { font-size: 7.5pt; line-height: 1.35; }
  .item span:first-child { overflow-wrap: anywhere; }
  /* Dense stage: tighter list, lower main barcode, drop the small order barcode
     (the order number is printed large anyway). */
  .label.dense .items.compact .item { font-size: 7pt; line-height: 1.2; }
  .label.dense .barcode.main svg { height: 44px; }
  .label.dense .barcode.small { display: none; }
  .label.dense .recipient .name, .label.dense .recipient .phone, .label.dense .recipient .area { line-height: 1.2; }
  .cont-note { font-size: 8pt; font-weight: 800; text-align: center; margin-top: 1mm; }
  .cont-head { display: flex; justify-content: space-between; align-items: center; border-bottom: 0.6mm solid #000; padding-bottom: 1.5mm; }
  @media screen {
    body { background: #e5e5e5; padding: 8mm; }
    .label { background: #fff; margin: 0 auto 8mm; box-shadow: 0 1mm 4mm rgba(0,0,0,.2); }
  }
`;

// Runs inside the print document after fonts load. Every item is always printed:
// 1) if the list overflows, switch to a compact two-column layout;
// 2) then a denser layout (smaller font, lower barcode, no small order barcode);
// 3) if it still overflows, move the remaining items to continuation labels
//    printed right after (box 1 only; other boxes point to box 1).
const FIT_SCRIPT = `
window.__fitLabels = function () {
  function over(el) { return el.scrollHeight > el.clientHeight; }
  function fits(label, box) { return !over(label) && !over(box); }
  function fit(label) {
    var box = label.querySelector(".items");
    if (!box || fits(label, box)) return;
    box.classList.add("compact");
    if (fits(label, box)) return;
    label.classList.add("dense");
    if (fits(label, box)) return;
    var list = box.querySelector(".item-list");
    var firstBox = (label.getAttribute("data-pkg-index") || "1") === "1";
    var note = document.createElement("div");
    note.className = "cont-note";
    note.textContent = firstBox
      ? "← המשך במדבקה הבאה · تكملة في الملصق التالي"
      : "← הרשימה המלאה בקרטון 1 · القائمة الكاملة على الكرتونة 1";
    box.appendChild(note);
    var moved = [];
    while (!fits(label, box) && list.children.length > 1) {
      moved.unshift(list.lastElementChild);
      list.removeChild(list.lastElementChild);
    }
    if (!moved.length) { note.remove(); return; }
    if (!firstBox) return;
    var cont = document.createElement("section");
    cont.className = "label cont";
    cont.setAttribute("data-pkg-index", "1");
    var pkg = label.getAttribute("data-pkg");
    cont.innerHTML =
      '<header class="cont-head"><div><div class="lbl">تكملة المحتويات · המשך תכולה</div>' +
      '<div class="val big">#' + label.getAttribute("data-order") + '</div></div>' +
      (pkg ? '<div class="pkg"><div class="pkg-val" dir="ltr">' + pkg + '</div></div>' : '') +
      '</header><div class="box items compact"><div class="item-list"></div></div>';
    var cl = cont.querySelector(".item-list");
    moved.forEach(function (m) { cl.appendChild(m); });
    label.parentNode.insertBefore(cont, label.nextSibling);
    fit(cont);
  }
  Array.prototype.slice.call(document.querySelectorAll("section.label")).forEach(fit);
};
`;

export function buildDeliveryLabelsHtml(labels: DeliveryLabelData[], logoSrc = ""): string {
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
${labels.map((l) => labelHtml(l, logoSrc)).join("\n")}
<script>${FIT_SCRIPT}</script>
</body>
</html>`;
}

let logoDataUrl: Promise<string> | null = null;
/** Logo as a data: URL, so the print document never depends on loading it over the network. */
function getLogoDataUrl(): Promise<string> {
  if (!logoDataUrl) {
    logoDataUrl = fetch(new URL(logoUrl, window.location.origin).toString())
      .then((r) => (r.ok ? r.blob() : Promise.reject(new Error(String(r.status)))))
      .then(
        (blob) =>
          new Promise<string>((resolve, reject) => {
            const fr = new FileReader();
            fr.onload = () => resolve(String(fr.result));
            fr.onerror = () => reject(fr.error);
            fr.readAsDataURL(blob);
          }),
      )
      .catch(() => {
        logoDataUrl = null;
        return "";
      });
  }
  return logoDataUrl;
}

/**
 * Prints labels through a hidden iframe (no new window / tab).
 * With Chrome started with --kiosk-printing this prints straight to the default
 * printer with no dialog; otherwise the normal print dialog opens.
 */
export async function printDeliveryLabels(
  load: DeliveryLabelData[] | (() => Promise<DeliveryLabelData[]>),
  options: { packages?: number } = {},
): Promise<void> {
  const [loaded, logo] = await Promise.all([typeof load === "function" ? load() : Promise.resolve(load), getLogoDataUrl()]);
  if (!loaded.length) throw new Error("אין משלוחים להדפסה");
  const labels = options.packages && options.packages > 1 ? expandPackages(loaded, options.packages) : loaded;

  const iframe = document.createElement("iframe");
  iframe.setAttribute("aria-hidden", "true");
  iframe.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden;";
  document.body.appendChild(iframe);
  const doc = iframe.contentDocument!;
  doc.open();
  doc.write(buildDeliveryLabelsHtml(labels, logo));
  doc.close();

  const win = iframe.contentWindow!;
  // Wait for fonts and images so the first print isn't missing the logo or Cairo font.
  await new Promise<void>((resolve) => {
    const done = () => resolve();
    if (doc.readyState === "complete") done();
    else win.addEventListener("load", done, { once: true });
    setTimeout(done, 4000);
  });
  try {
    await Promise.race([doc.fonts?.ready, new Promise((r) => setTimeout(r, 3000))]);
  } catch { /* ignore */ }

  // Make sure every item is printed (compact layout / continuation labels).
  try {
    (win as unknown as { __fitLabels?: () => void }).__fitLabels?.();
  } catch { /* ignore */ }

  const cleanup = () => setTimeout(() => iframe.remove(), 500);
  win.addEventListener("afterprint", cleanup, { once: true });
  setTimeout(() => iframe.isConnected && iframe.remove(), 120_000);
  win.focus();
  win.print();
}
