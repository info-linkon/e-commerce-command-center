

# תיקון: iframe תשלום HYP לא מוצג

## הבעיה
בקוד, `clearCart()` נקרא **לפני** `setHypPaymentUrl()` (שורה 224-225). זה מרוקן את הסל, מה שגורם ל-re-render, ואז הבדיקה `if (items.length === 0)` בשורה 234 מפנה ישירות ל-`/web/cart` — לפני שה-iframe מספיק להיטען.

## הפתרון
1. **העבר את `clearCart()`** לאחרי שה-iframe כבר מוצג, או לאחר שהתשלום הושלם בהצלחה
2. **שנה את הבדיקה** `if (items.length === 0)` כך שתתעלם כש-`hypPaymentUrl` קיים
3. הדרך הנכונה: בדוק `hypPaymentUrl` **לפני** הבדיקה של סל ריק

## שינויים בקובץ `src/pages/web/WebCheckoutPage.tsx`

- שורה 224: הזז את `clearCart()` — קרא לו רק בתשלום מזומן (שורה 192), ובמקרה של שגיאת HYP (שורה 217). ב-credit עם iframe, **אל תנקה את הסל** עד שהתשלום הושלם
- שורות 234-237: שנה את הבדיקה כך ש-`hypPaymentUrl` דורס את הניתוב לסל ריק:
  ```
  if (hypPaymentUrl) { /* show iframe */ }
  if (items.length === 0 && !hypPaymentUrl) { navigate to cart }
  ```
- בנוסף, נקה את הסל כשה-postMessage מגיע מה-iframe (הצלחת תשלום) — בתוך ה-handler של `hyp-payment-done`

| קובץ | שינוי |
|---|---|
| `src/pages/web/WebCheckoutPage.tsx` | תיקון סדר clearCart + בדיקת סל ריק |

