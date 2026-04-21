

# תיקון תהליך הצ'קאאוט הציבורי

## הבעיה

הזמנות חדשות מהאתר נכשלות עם שגיאה 401 (`new row violates row-level security policy for table "orders"`), למרות שהוספנו policy של INSERT ל-anon. הסיבה: הקוד עושה `.insert(...).select().single()` — ה-`select()` דורש גם הרשאת **SELECT**, וזו לא הוענקה ל-anon (בכוונה — כדי לא לחשוף PII של הזמנות אחרות).

בנוסף, אחרי יצירת ההזמנה הקוד מנסה גם להכניס `order_items` ולקרוא ל-Edge Function `hyp-create-payment` שגם הוא צריך לקרוא/לכתוב לטבלת orders.

## הפתרון המומלץ — Edge Function ייעודי לצ'קאאוט

במקום לפתוח SELECT ציבורי על orders (חשיפת PII של כל הלקוחות = דליפת אבטחה חמורה), נעביר את כל יצירת ההזמנה ל-Edge Function אחד שרץ עם `service_role` ועוקף RLS באופן בקרי.

### שלבי הביצוע

**1. יצירת Edge Function `web-create-order`**
- מקבל מהדפדפן: פרטי לקוח, פריטי סל, משלוח, קופון, אופן תשלום
- ולידציה בצד השרת:
  - בדיקת מלאי בזמן אמת מול `inventory`
  - אימות מחירי מוצרים מול ה-DB (לא לסמוך על המחיר שהדפדפן שלח)
  - אימות הקופון (תוקף, max_uses, min_order)
  - חישוב הסכום הסופי בשרת
- יצירת רשומות `customers`, `orders`, `order_items` עם service role
- מחזיר ללקוח רק: `order_id`, `order_number`, `access_token`
- `verify_jwt = false` ב-`config.toml` (כמו שאר ה-Edge Functions הציבוריים)

**2. עדכון `WebCheckoutPage.tsx`**
- במקום שלושה `.insert()` ישירים, קריאה אחת ל-`supabase.functions.invoke("web-create-order", {...})`
- אחרי הצלחה — ניווט ל-`/order-confirmation/:orderNumber` (קיים)
- במקרה של תשלום אשראי, קריאה ל-`hyp-create-payment` עם ה-`order_id` שהוחזר

**3. החזרת ה-RLS על orders/order_items/customers/payments למצב מאובטח**
- הסרת ה-policies של `public_insert` שיצרנו במיגרציה הקודמת (כבר לא נחוצות — הכל עובר דרך Edge Function)
- הטבלאות חוזרות להיות `authenticated only`
- שום נתון רגיש לא יהיה חשוף ל-anon

**4. בדיקת תהליכים נוספים שעלולים להישבר**
- `WebOrderSummary` / `/order/:orderNumber` — כבר עובר דרך Edge Function `order-summary` עם service role ↦ ✅ תקין
- `hyp-callback` / `hyp-notify` / `pay-redirect` — Edge Functions עם service role ↦ ✅ תקין
- `order-confirmation` poll על orders — נצטרך לבדוק אם הוא קורא בלי auth; אם כן, לעטוף גם אותו

## פרטים טכניים

```text
Browser (anon)
  │
  ▼
[Edge Function: web-create-order]   ← service_role, verify_jwt=false
  │
  ├─ validate stock, prices, coupon
  ├─ INSERT customers, orders, order_items
  └─ return { order_id, order_number, access_token }
  │
  ▼
Browser → invoke("hyp-create-payment", { order_id })
       → navigate("/order-confirmation/:orderNumber?t=access_token")
```

יתרונות:
- אין דליפת PII (anon לא רואה הזמנות, לא לקוחות, לא תשלומים)
- אין מניפולציה של מחירים מהצד הציבורי (ולידציה בשרת)
- אין מניפולציה של קופונים (max_uses/expires_at נאכף בשרת)
- ולידציית מלאי אטומית בעת יצירת הזמנה

## קבצים שיושפעו

- **חדש**: `supabase/functions/web-create-order/index.ts`
- **חדש**: רישום ב-`supabase/config.toml` עם `verify_jwt = false`
- **שינוי**: `src/pages/web/WebCheckoutPage.tsx` (החלפת בלוק יצירת הזמנה)
- **שינוי**: `src/pages/web/WebOrderConfirmation.tsx` (רק אם נמצאות קריאות שדורשות auth)
- **מיגרציה חדשה**: הסרת `public_insert` מ-`orders`, `order_items`, `customers`, `payments`

