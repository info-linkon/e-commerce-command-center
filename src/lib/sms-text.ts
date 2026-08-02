export const SMS_MAX_CHARS = 260;

/**
 * Count visible characters (graphemes) so an emoji counts as 1,
 * not 2 UTF-16 code units.
 */
export function countSmsChars(text: string): number {
  if (!text) return 0;
  try {
    // @ts-ignore - Segmenter exists in all modern browsers
    if (typeof Intl !== "undefined" && (Intl as any).Segmenter) {
      // @ts-ignore
      const seg = new (Intl as any).Segmenter("he", { granularity: "grapheme" });
      return [...seg.segment(text)].length;
    }
  } catch {
    /* fall through */
  }
  return [...text].length;
}

const GSM_RE =
  /^[A-Za-z0-9@£$¥èéùìòÇØøÅåÆæßÉ !"#¤%&'()*+,\-./:;<=>?¡ÄÖÑÜ§¿äöñüà\u000A\u000D\u001B\u0020\[\]\\^{}|~€\u05D0-\u05EA\u0600-\u06FF]*$/;

/** True when the message contains characters outside the plain GSM/Unicode-cheap set (emoji etc.) */
export function hasUnicodeChars(text: string): boolean {
  // Anything above the BMP (emoji) or symbols forces UCS-2 at the provider
  return /[\u{1F000}-\u{1FAFF}\u{2190}-\u{27BF}\u{FE0F}\u{2600}-\u{26FF}]/u.test(text) || !GSM_RE.test(text);
}

/** Rough number of billable SMS parts at the provider. */
export function smsSegments(text: string): number {
  const len = countSmsChars(text);
  if (len === 0) return 0;
  const unicode = hasUnicodeChars(text);
  const single = unicode ? 70 : 160;
  const multi = unicode ? 67 : 153;
  return len <= single ? 1 : Math.ceil(len / multi);
}

export function applySmsVars(
  text: string,
  vars: { customer_name?: string | null; phone?: string | null; order_number?: string | number | null },
): string {
  return text
    .replace(/{customer_name}/g, vars.customer_name || "")
    .replace(/{phone}/g, vars.phone || "")
    .replace(/{order_number}/g, vars.order_number != null ? String(vars.order_number) : "");
}

export const EMOJI_LIST = [
  "😀","😁","😂","🤣","😊","😍","🥰","😎","🤩","😉","🙂","🤗","🤔","😴","🥳","😇",
  "👍","👏","🙏","💪","🤝","👋","✌️","🫶","❤️","💛","💚","💙","💜","🔥","✨","⭐",
  "🎉","🎊","🎁","🛍️","🛒","💰","💵","💳","🏷️","🔖","📦","🚚","🏠","📍","🕒","📅",
  "📞","📱","💬","📢","📣","✅","❗","⚠️","🆕","🆓","💯","🥇","🌟","☀️","🌙","🌸",
];
