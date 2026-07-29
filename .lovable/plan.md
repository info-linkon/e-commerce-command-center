## הבעיה (מאומתת)

הזמנה 516 — "ערכת קפה ותה אלאריאف - ירוק":
- במוצר: `sale_price = 620`, `compare_at_price = 550` → האתר מציג (auto-swap) **550 ₪**.
- בהזמנה נשמר `unit_price = 620`, `total = 620`.

הסיבה: המוצר רשום בטבלת `bundles` כ-`simple_bundle`. ב-`supabase/functions/web-create-order/index.ts` יש ענף נפרד למארזים פשוטים שלוקח רק את `products.sale_price` ולא מחשב כלל `compare_at_price`, ולכן לוגיקת ה-auto-swap שתוקנה למוצרים רגילים לא חלה עליהם. HYP/הלינק ללקוח וסיכום ההזמנה פשוט מציגים את מה שנשמר ב-`order_items`, ולכן שם מופיע המחיר המלא.

## התיקון

1. **`supabase/functions/web-create-order/index.ts`** — בענף `simple_bundle` לטעון גם `compare_at_price` מהמוצר ולהחיל את אותה לוגיקת auto-swap (המחיר הנמוך מבין `sale_price` ל-`compare_at_price` הוא מה שהלקוח משלם). בפועל: להוסיף `compare_at_price` לשאילתת המוצרים של המארזים הפשוטים ולהציב `rawCompare` בענף המתאים — כך כל המסלולים (מוצר פשוט / משתנה / מארז פשוט / וריאציית מארז) משתמשים באותו כלל.

2. **בדיקת עקביות בקופה (POS)** — לוודא ש-`src/pages/PosPage.tsx` מחיל את אותו כלל גם על מארזים פשוטים; אם לא, ליישר קו.

3. **תיקון נתוני הזמנה 516** — עדכון `order_items.unit_price/total_price` ל-550 ועדכון `orders.total` ל-550 (אין דמי משלוח בהזמנה זו). ההזמנה בסטטוס `unfulfilled` ולא הונפקה חשבונית, לכן התיקון בטוח.

## פרטים טכניים

- כרגע `simpleBundlePriceByProduct` נטענת עם `select("id, sale_price")` בלבד — צריך להוסיף `compare_at_price` ולשמור זוג ערכים.
- כלל אחיד: `unitPrice = (compare > 0 && compare < price) ? compare : price`.
