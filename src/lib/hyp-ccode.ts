export interface CCodeMessage {
  ar: string;
  he: string;
}

const MESSAGES: Record<string, CCodeMessage> = {
  "0":   { ar: "تمت العملية بنجاح", he: "התשלום אושר" },
  "33":  { ar: "البطاقة غير صالحة، جرّب بطاقة أخرى", he: "כרטיס לא תקין, נסה כרטיס אחר" },
  "36":  { ar: "انتهت صلاحية البطاقة", he: "פג תוקף הכרטיס" },
  "200": { ar: "رفض من شركة الائتمان", he: "סירוב מחברת האשראי" },
  "400": { ar: "مجموع العناصر لا يطابق المبلغ", he: "סכום הפריטים לא תואם לסכום" },
  "401": { ar: "الاسم الأول أو الأخير مطلوب", he: "שם פרטי או משפחה חסר" },
  "402": { ar: "وصف الصفقة مطلوب", he: "תיאור עסקה חסר" },
  "600": { ar: "تم فحص البطاقة دون شحن", he: "נבדק כרטיס ללא חיוב" },
  "700": { ar: "تمت الموافقة دون شحن", he: "אושר ללא חיוב" },
  "800": { ar: "صفقة مؤجلة", he: "עסקה דחויה" },
  "901": { ar: "المحطة غير مخوّلة لهذه العملية", he: "מסוף לא מורשה לפעולה" },
  "902": { ar: "فشل التحقق من الدفع", he: "אימות חתימה נכשל" },
  "903": { ar: "تجاوز الحد الأعلى للأقساط", he: "חריגה ממספר התשלומים" },
  "990": { ar: "تعذّر قراءة البطاقة، حاول مجدداً", he: "פרטי כרטיס לא נקראו, נסה שוב" },
  "997": { ar: "توكن غير صالح", he: "טוקן לא תקין" },
  "998": { ar: "تم إلغاء العملية", he: "העסקה בוטלה" },
  "999": { ar: "تعذّر الاتصال بمزود الدفع", he: "שגיאת תקשורת עם שירות התשלום" },
  "amount_mismatch": { ar: "عدم تطابق في المبلغ، تواصل مع الدعم", he: "אי התאמה בסכום, פנה לתמיכה" },
  "network_error":   { ar: "تعذّر التحقق من الدفع حالياً", he: "לא ניתן לאמת את התשלום כרגע" },
};

const DEFAULT: CCodeMessage = {
  ar: "تعذّر إتمام الدفع. إذا تم الخصم فسيتواصل معك فريقنا",
  he: "התשלום לא הושלם. אם חויבת, נציג יצור איתך קשר",
};

export function describeCCode(code: string | number | null | undefined): CCodeMessage {
  if (code === null || code === undefined || code === "") return DEFAULT;
  return MESSAGES[String(code)] ?? DEFAULT;
}

// Treat only CCode=0 as a real successful payment.
// 600/700/800 are documented "grey" states (card-check / postpone / approved-without-charge)
// that Hypay itself redirects to the failure page, so we must NOT mark them as paid.
export function isCCodeSuccess(code: string | number | null | undefined): boolean {
  return String(code ?? "") === "0";
}
