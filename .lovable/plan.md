

## ההבנה

המשתמש רוצה כלל ברור וגלובלי:
**האתר יציג רק נתונים מהמקום הנכון:**
- מוצר רגיל (`product_type` ≠ `bundle`) → רק מ-`product_variations`.
- מוצר שהוא מארז (יש לו רשומה ב-`bundles`) → רק מ-`bundle_items` / `bundle_variations` / `bundle_variation_items`.

**כל נתון "רפאים" שנמצא במקום הלא נכון — יימחק מה-DB.**
דוגמה: מוצר #4 הוא `simple_bundle` אבל יש לו 5 רשומות ב-`product_variations` שסונכרנו מ-WooCommerce. הרשומות האלה צריכות להימחק.

---

## בדיקה ראשונית — מה יש כיום ב-DB

לפני המחיקה, ארוץ סריקה כדי לזהות **את כל** ה"רפאים":
```sql
SELECT p.product_number, p.name, b.bundle_type,
       COUNT(pv.id) AS ghost_variations
FROM products p
JOIN bundles b ON b.product_id = p.id
LEFT JOIN product_variations pv ON pv.product_id = p.id
GROUP BY p.id, b.bundle_type
HAVING COUNT(pv.id) > 0;
```
זה יראה לכל מוצר-מארז כמה ווריאציות "רפאים" יש לו ב-`product_variations`.

---

## תוכנית הביצוע

### שלב 1 — הרצת סקירה (קריאה בלבד)
ארוץ את השאילתה לעיל וגם בדיקה הפוכה (מוצרים שאינם מארזים אבל יש להם רשומות בטבלאות מארז — אם רלוונטי).

### שלב 2 — בדיקת תלויות לפני מחיקה
לוודא שה-`product_variations` ה"רפאים" לא משמשים ב:
- `inventory` (יש להם מלאי?)
- `order_items` (הופיעו בהזמנות קיימות?)
- `bundle_items` / `bundle_variation_items` (משמשים כרכיב במארז אחר?)
- `intake_session_items`, `inventory_log`, `inventory_transfer_items`

**אם יש תלויות בהזמנות קיימות** — לא נמחק את הווריאציה (היסטוריית ההזמנה חייבת להישמר). במקום זאת, נסיר רק את ה-`inventory` שלהן (כדי שלא יוצגו כ"במלאי" באתר). הקוד באתר כבר מתעלם מהן (אחרי התיקון הקודם), אז זה מספיק.

**אם אין תלויות** — נמחק את הווריאציה לחלוטין (כולל `inventory` שלה).

### שלב 3 — Migration למחיקה
לבנות migration שמבצע את הניקוי לפי הבדיקות:
1. למחוק רשומות `inventory` עבור כל ווריאציה "רפאים".
2. למחוק רשומות `product_variations` שאין להן תלות בהזמנות.
3. עבור ווריאציות עם היסטוריית הזמנות — להשאיר את הרשומה אבל להסיר מ-`inventory`.

### שלב 4 — הקשחת הסנכרון מ-WooCommerce
הבעיה המקורית: `woo-sync` / `woo-product-sync` יוצר רשומות ב-`product_variations` גם למוצרים שמוגדרים אצלנו כמארזים. צריך לתקן כך שאם מוצר רשום ב-`bundles` — הסנכרון **לא** ייצור עבורו רשומות ב-`product_variations`.

קבצים לעדכון:
- `supabase/functions/woo-sync/index.ts`
- `supabase/functions/woo-product-sync/index.ts`
- `supabase/functions/woo-webhook/index.ts`

לפני יצירת/עדכון `product_variations` — לבדוק האם ל-`product_id` יש רשומה ב-`bundles`. אם כן — לדלג.

### שלב 5 — אימות אחרי המחיקה
- לוודא שמוצר #4 באתר מוצג כ"מארז ריק לא זמין".
- לוודא שמוצרים רגילים אחרים לא נפגעו.
- לוודא שהזמנות קיימות (179, 203) עדיין מציגות תקין את הפריטים שהוזמנו.

---

## הערה חשובה

המחיקה היא פעולה הרסנית. אם בשלב 1 אגלה שיש הרבה ווריאציות "רפאים" עם היסטוריית הזמנות — אעצור ואחזיר אליך לפני המחיקה כדי לאשר את ההיקף.

