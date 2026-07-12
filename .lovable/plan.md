## תיקון: SMS "הזמנה נוצרה" בהזמנות אשראי + תרגום עברית לאמצעי תשלום

### 1. SMS ייצא רק אחרי אישור תשלום (הזמנות אשראי)

**בעיה:** `web-create-order` שולח `order_created` SMS מיד עם יצירת ההזמנה — גם למי שבחר אשראי ולא סיים לשלם ב-HYP.

**פתרון:**
- `supabase/functions/web-create-order/index.ts`: לדלג על טריגר ה-SMS כש-`payment_method === "credit"`. הזמנות מזומן ממשיכות לשלוח מיד כרגיל.
- `supabase/functions/_shared/hyp-verify.ts`: אחרי אימות תשלום מוצלח (בסוף `recordSuccessfulPayment` לפני החזרת התוצאה), לירות `order_created` דרך `order-sms-trigger` — אבל **רק** אם עדיין לא נשלח (בדיקה ב-`notification_log` על `order_id` + `trigger_type='order_created'` עם `success=true`). כך:
  - הזמנת אשראי שהושלמה → SMS יוצא פעם אחת מ-hyp-verify.
  - הזמנת מזומן שאדמין הופך אותה לאשראי או תרחישים נדירים → הבדיקה מונעת כפילות.
- הזמנות שנתקעו ב-`pending_payment` (המשתמש נטש) לא יקבלו SMS — בדיוק הרצוי. הן ייסגרו אוטומטית ע"י `auto-cancel-pending`.
- להעדכן את ההערה הישנה ב-hyp-verify.ts שאומרת "The order_created SMS was already sent" — כבר לא נכון להזמנות אשראי.

### 2. תרגום עברית לאמצעי התשלום

**בעיה:** בעמוד הצ'קאאוט (`WebCheckoutPage.tsx`) והסיכום, ה-labels של אמצעי תשלום (`"الدفع عند الاستلام"`, `"بطاقة ائتمان"`) באים מ-`site_content` כטקסט ערבי בלבד — לא מתורגמים לעברית.

**פתרון:**
הוספת mapping לתרגום ידוע במקום התצוגה. במקום `{paymentSettings.cash.label}` להשתמש בפונקציה קטנה:
```ts
const translatePaymentLabel = (key: 'cash' | 'credit', arLabel: string) => {
  if (language === 'he') {
    if (key === 'cash') return 'תשלום במזומן במסירה';
    if (key === 'credit') return 'כרטיס אשראי';
  }
  return arLabel;
};
```
- מיושם ב-`WebCheckoutPage.tsx` (שורות 701, 715) וכל מקום אחר שמציג את ה-label (למשל `WebOrderSummary.tsx` אם רלוונטי — ייבדק).

### קבצים שישתנו
- `supabase/functions/web-create-order/index.ts` — דילוג SMS על credit
- `supabase/functions/_shared/hyp-verify.ts` — טריגר SMS אחרי אישור, עם הגנת ידמפוטנטיות
- `src/pages/web/WebCheckoutPage.tsx` — תרגום ה-labels

### לא נכלל
- שינוי מבנה DB או הוספת שדות `label_he` ל-payment settings (החלטה: תרגום קשיח בקוד כי יש רק 2 ערכים ידועים; אם בעתיד ירצו להוסיף אמצעי תשלום דינמיים, נוסיף אז).
