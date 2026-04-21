

# בדיקה: עוד מקומות שיש לתקן בצד הציבורי

הצ'קאאוט עובד 🎉, אבל אחרי ההסרה של `public_insert` מ-RLS, יש עוד 3 מקומות בקוד הציבורי שעדיין ניגשים ישירות לטבלאות חסומות (`orders`, `order_items`, `coupons`) וייכשלו בשקט או יציגו שגיאות למשתמש.

## הבעיות שאותרו

### 1. `useWebBestSellers` (דף הבית) — חסום עכשיו
`useWebProducts.ts` קורא ישירות `supabase.from("order_items").select(...)` כדי לחשב את המוצרים הנמכרים ביותר. ל-anon אין SELECT על `order_items` ⇒ הקרוסלה "הנמכרים ביותר" בדף הבית תהיה ריקה.

### 2. `PaymentRedirect` — `/pay/:orderNumber` שבור
לינק התשלום מה-SMS (`/pay/229`) קורא ישירות `supabase.from("orders").select("payment_link_url, status, ...")`. ל-anon אין SELECT על `orders` ⇒ כל לקוח שלוחץ על לינק תשלום מ-SMS יקבל "הזמנה לא נמצאה".

### 3. `incrementCouponUsage` ו-`validateCoupon` — קופונים שבורים
- `validateCoupon` קורא `coupons` מהדפדפן בזמן שלקוח מקליד קוד קופון בצ'קאאוט.
- `incrementCouponUsage` מעדכנת `used_count` אחרי תשלום מוצלח.
- ל-anon אין גישה ל-`coupons` ⇒ כל קופון שמשתמש מנסה להזין יחזיר "קוד לא תקין", ו-`max_uses` לא ייאכף.

### 4. `WebCheckoutPage` — עדכון notes על כשל
שורה 373: אם `hyp-create-payment` נכשל, הקוד מנסה `supabase.from("orders").update({ notes: ... })` כדי לתייג את ההזמנה. ל-anon אין UPDATE על `orders` ⇒ העדכון יישתק (לא קריטי, אבל מחבל ב-debug של ops).

## הפתרון

### תיקון 1+3+4 — הרחבת `web-create-order` + Edge Function חדש לוולידציית קופון

**א. תיקון 4 (notes על כשל יצירת לינק)**: להעביר את עדכון ה-`notes` ל-`hyp-create-payment` עצמו (שכבר רץ עם service role) — אם יצירת הלינק נכשלת בתוך הפונקציה, היא תרשום את הסיבה בעמודת `notes`.

**ב. תיקון 3 (קופונים)**:
- **וולידציה בלייב** (כשהמשתמש מקליד קוד בצ'קאאוט): Edge Function חדש `web-validate-coupon` עם service role + `verify_jwt = false`. מקבל `code` ו-`subtotal`, מחזיר `{ valid, discount, code, type, value, min_order, error? }` בלבד — בלי `id`, `used_count` או שדות פנימיים.
- **בלי `incrementCouponUsage` בצד הלקוח**: ה-Edge Function `web-create-order` כבר מאתר את הקופון ומחשב הנחה. נוסיף לו: אחרי הצלחה, להגדיל `used_count` (אטומי ב-SQL: `UPDATE coupons SET used_count = used_count+1 WHERE id = ?`). למחוק את הלוגיקה של `hyp_coupon_id` ב-sessionStorage ואת `bumpCouponFromSession` ב-`WebOrderConfirmation` ו-ב-`WebCheckoutPage`.
- ב-`useCoupons.ts` — `validateCoupon` ו-`incrementCouponUsage` עוברים לקרוא ל-Edge Function (במקום `supabase.from('coupons')` ישיר).

### תיקון 2 — `PaymentRedirect` משתמש ב-`pay-redirect` הקיים

הפונקציה `pay-redirect` כבר קיימת (רשומה ב-`config.toml` עם `verify_jwt = false`) ועושה בדיוק מה שצריך — מחזירה 302 ל-`payment_link_url` או דף שגיאה. נשנה את `PaymentRedirect.tsx` שיעשה `window.location.href = "/functions/v1/pay-redirect?order=" + orderNumber` במקום לקרוא לטבלה ישירות. (אם `pay-redirect` לא תומך בכל מקרי הקצה — נרחיב אותו במקום לקרוא ל-DB מהדפדפן.)

### תיקון 1 — `web-best-sellers` Edge Function חדש

Edge Function זעיר `web-best-sellers` עם service role + `verify_jwt = false`:
- אוסף `order_items` (variation_id, quantity)
- מצרף ל-`product_variations` ואז ל-`products`
- מחזיר רשימת 12 מוצרים מובילים (אותו פורמט שהפרונט ציפה)
- `useWebBestSellers` יקרא ל-Edge Function במקום לטבלה ישירה.

## קבצים שיושפעו

**חדשים**
- `supabase/functions/web-validate-coupon/index.ts`
- `supabase/functions/web-best-sellers/index.ts`
- רישום ב-`supabase/config.toml` עם `verify_jwt = false` לשתיהן

**עדכון Edge Functions קיימים**
- `supabase/functions/web-create-order/index.ts` — להוסיף `UPDATE coupons SET used_count = used_count+1` אחרי הצלחה
- `supabase/functions/hyp-create-payment/index.ts` — בכישלון, לכתוב את הסיבה ל-`orders.notes`

**עדכון פרונט**
- `src/hooks/useWebProducts.ts` — `useWebBestSellers` ⇒ `functions.invoke("web-best-sellers")`
- `src/hooks/useCoupons.ts` — `validateCoupon` ⇒ `functions.invoke("web-validate-coupon")`; הסרת `incrementCouponUsage` הציבורית
- `src/pages/web/WebCheckoutPage.tsx` — הסרת `incrementCouponUsage`, `hyp_coupon_id` ב-sessionStorage, ועדכון `notes` הישיר
- `src/pages/web/WebOrderConfirmation.tsx` — הסרת `bumpCouponFromSession` והקריאות ל-`incrementCouponUsage`
- `src/pages/web/PaymentRedirect.tsx` — מעבר לשימוש ב-`pay-redirect` Edge Function (או רכיב פשוט שמפנה אליו)

## בונוס: בדיקת אבטחה

נריץ את `security--run_security_scan` של Lovable אחרי הסיום כדי לוודא שלא נשארו טבלאות עם חורים.

