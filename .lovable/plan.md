# סבב QA — תיקון פערים שנמצאו

עברתי על כל מה שנעשה בסבבים הקודמים. רוב המשימות עובדות נכון. נמצאו 4 פערים שצריך לסגור כדי שהזרימה תהיה שלמה ולא תישבר.

## 1. SMS חשבונית — `{invoice_url}` לא מוחלף בפועל ⚠️ באג

**הבעיה:** התבנית החדשה `invoice_issued` משתמשת ב-`{invoice_url}`, אבל `supabase/functions/order-sms-trigger/index.ts` לא מבצע replace ל-placeholder הזה ולא קורא את `orders.invoice_url`. בנוסף, `CompleteOrderDialog` שומר נתיב יחסי (`/inv/{shortCode}`) שלא ניתן ללחוץ עליו מ-SMS.

**תיקון:**
- ב-`order-sms-trigger`: להוסיף תחליף `{invoice_url}` שקורא מ-`order.invoice_url`. אם הערך מתחיל ב-`/inv/` או ב-`/` → להוסיף prefix `https://elwejha.co.il`.
- ב-`CompleteOrderDialog.tsx`: לשמור URL מלא (`https://elwejha.co.il/inv/{shortCode}`) במקום נתיב יחסי, כך שגם פתיחה ישירה ב-CRM או בדואר תעבוד.

## 2. WebOrderConfirmation — לינק "חזרה לבית" שובר את `/he`

**הבעיה:** שני `<Link to="/">` קשיחים (שורות 164, 189) מובילים לערבית גם כשהמשתמש בעברית.

**תיקון:** לעבור דרך `localizedPath("/")` כמו בשאר הדפים. גם להחליף קריאת `useLanguage` אם חסרה.

## 3. SEO — חסר `hreflang` alternate בין `/` ל-`/he`

**הבעיה:** Google לא יודע שיש שתי גרסאות שפה לאותו דף, פוגע באינדוקס.

**תיקון:** ב-`index.html` להוסיף שני tags גנריים, וב-edge function `meta-tags`/`product-share` (אם נטען) להוסיף `<link rel="alternate" hreflang="ar" href="..."/>` ו-`hreflang="he"` עם `x-default` ל-ערבית. נתחיל בגרסה גלובלית ב-`index.html` בלבד אם ה-Edge Function לא רלוונטי לכל המסלולים.

## 4. אימות עקיף שלא נשבר כלום

לא נדרש שינוי קוד — רק לוודא:
- `useCreateExpense` חתימה תואמת לקריאה מ-CompleteOrderDialog ✓ (אומת).
- `useCreateDocument` מחזיר `short_code`/`doc_url` ✓ (אומת).
- `OrderTypeTab` הוסר ולא מיובא בשום מקום ✓ (אומת).
- כל ניווטי הדפים הציבוריים עוברים דרך `localizedPath` ✓ (פרט ל-WebOrderConfirmation שבסעיף 2).
- `pg_cron` רץ ל-`auto-cancel-pending` כל 10 דקות ✓ (מיגרציה קיימת).
- תבנית ברירת מחדל ל-`invoice_issued` קיימת ב-DB ✓ (מיגרציה קיימת).

## קבצים שיתעדכנו
- `supabase/functions/order-sms-trigger/index.ts` — תחליף `{invoice_url}`.
- `src/components/orders/CompleteOrderDialog.tsx` — שמירת URL מלא.
- `src/pages/web/WebOrderConfirmation.tsx` — `localizedPath` ב-2 לינקים.
- `index.html` — תגי `hreflang`.

זהו תיקון ממוקד וקטן יחסית. אחרי הביצוע אריץ build ואוודא שאין רגרסיות.
