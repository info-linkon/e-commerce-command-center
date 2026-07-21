## הבעיה
בקופה (POS) המוצר "ملقط فحم" מופיע ב-25₪ במקום 19₪. במסד: `products.sale_price = 19`, אבל לווריאציית "ברירת מחדל" יש `price = 25`.

הלוגיקה הנוכחית ב-`PosPage.tsx` (שורה 151):
```
vPrice = variation.price > 0 ? variation.price : product.sale_price
```
כלומר משתמשת ב-sale_price של המוצר רק כ-fallback אם price=0. זה שונה מהלוגיקה בסטורפרונט וב-`web-create-order` שכבר תוקנה לתת עדיפות ל-`products.sale_price` במוצרים פשוטים.

## התיקון
בקובץ `src/pages/PosPage.tsx`, בלולאה שבונה את `groupedProducts` מתוך `variations`:

- להתייחס ל-`products.sale_price` כמועמד למחיר אפקטיבי לצד `variation.price`, ולבחור את הנמוך מבין השניים (כשגם `product.sale_price > 0`).
- להשאיר את auto-swap מול `compare_at_price` כמו שהוא.
- הלוגיקה של מארזים (variable / simple) — לא נוגעים, כבר עובדת דרך `bundleBasePrice`.

הרעיון: התנהגות עקבית עם הסטורפרונט וה-`web-create-order` — מה שהלקוח רואה = מה שגובים = מה שהקופה מציגה.

## אימות
לפתוח את הקופה ולחפש "ملقط فحم" — צריך להופיע 19₪. גם לבדוק שמוצרים אחרים עם וריאציות בעלות מחירים שונים לא נפגעים (וריאציה במחיר גבוה/נמוך מ-sale_price של המוצר עדיין תציג את הנמוך).
