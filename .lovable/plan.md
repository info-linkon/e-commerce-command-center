

# תוכנית שיפורים כוללת — רשימת ההערות שלך

## סיכום: 16 שיפורים מחולקים ל-5 שלבים לוגיים

---

## שלב 1: שיפורי מוצרים ומארזים

### 1.1 שמות בעברית + ערבית (מוצרים + תיאורים)
- הוספת עמודות `name_ar`, `description_ar`, `short_description_ar` לטבלת `products`
- הוספת `name_ar` לטבלת `product_variations`
- עדכון `ProductForm.tsx` — שדה שם ותיאור כפול (עברית/ערבית) זה-ליד-זה
- הצגה דו-לשונית ברשימת המוצרים

### 1.2 הרחבת שדה תיאור
- שינוי שדה "תיאור קצר" מ-Input ל-Textarea
- הגדלת rows של "תיאור מלא" ל-6-8 שורות

### 1.3 תמונות מוצרים
- הוספת Storage bucket `product-images`
- הוספת רכיב העלאת תמונה ב-`ProductForm.tsx` עם תצוגה מקדימה
- שמירת URL בשדה `image_url` הקיים בטבלה

### 1.4 עריכת מארזים + מארז בתוך מארז
- יצירת דף `BundleEditForm.tsx` (כרגע יש רק יצירה)
- בפריטי מארז: הצגת שם מוצר + וריאציה (לא רק שם וריאציה)
- אפשרות לבחור מארז כפריט בתוך מארז

### 1.5 מחיר עלות = ללא מע"מ תמיד
- הוספת הערה ויזואלית ליד שדה מחיר עלות: "ללא מע״מ"
- שינוי label ל: `מחיר עלות (ללא מע״מ)`

---

## שלב 2: שיפורי מלאי

### 2.1 תצוגת מלאי מצטבר
- הוספת תצוגה שמציגה סה"כ מלאי לכל וריאציה (סיכום מכל המחסנים)
- Toggle בין "לפי מחסן" ל"מצטבר"

### 2.2 חסימת עריכת מלאי מתצוגת מלאי
- הסרת Input מעמודת כמות ב-`InventoryIndex.tsx`
- הצגת המספר כטקסט בלבד (read-only)

### 2.3 הורדת מלאי (פחת) — דף ייעודי
- דף חדש `InventoryWriteOffPage.tsx`
- בחירת מחסן, חיפוש פריטים, הזנת כמות להורדה + סיבה
- לוג תנועות עם `action_type: "write_off"`
- Route חדש `/inventory/write-off` + פריט בתפריט

---

## שלב 3: שיפורי הזמנות

### 3.1 כתובת משלוח בהזמנה חדשה
- הוספת שדות כתובת (רחוב, עיר, מיקוד, מדינה) ב-`OrderForm.tsx`
- שמירה בעמודות `shipping_address`, `shipping_city`, `shipping_postcode`, `shipping_country`

### 3.2 סימון מע"מ בהזמנה
- הוספת עמודה `includes_vat` (boolean, default true) לטבלת `orders`
- כפתור Toggle בדף ההזמנה וב-`OrderForm` — "כולל מע״מ" / "ללא מע״מ"
- שימוש בחישוב רווחיות: אם כולל מע״מ, מפחית 17% מהמחיר לצורך חישוב רווח נקי

### 3.3 מקור הזמנה + עובד מבצע
- הוספת עמודה `created_by` (uuid, nullable) לטבלת `orders`
- הצגת מקור ההזמנה + שם העובד שביצע (מ-profiles) ב-OrderDetail ו-OrdersPage

### 3.4 מסך ליקוט הזמנות
- דף חדש `PickingQueuePage.tsx` — רשימת הזמנות שממתינות לליקוט או בתהליך
- מציג: מספר הזמנה, לקוח, מחסן, סטטוס ליקוט, כפתור כניסה לליקוט
- Route: `/orders/picking`

### 3.5 מסך הזמנות במשלוח
- דף חדש `InDeliveryPage.tsx` — הזמנות ששויכו למשלוח ועדיין לא נמסרו
- מציג: מספר הזמנה, לקוח, חברת משלוח, סטטוס משלוח, כתובת
- Route: `/orders/in-delivery`

---

## שלב 4: מעקב משתמשים (Audit)

### 4.1 תיעוד מי ביצע כל פעולה
- הוספת `created_by` לטבלאות שחסר בהן: `orders` (כבר יש ב-intake, expenses, inventory_log)
- עדכון כל mutation (יצירת הזמנה, שיוך מחסן, ביטול, תשלום, קליטה) לשמור את `auth.uid()`
- הצגת שם המשתמש המבצע בלוגים ובדפי הפירוט

---

## שלב 5: לקוחות (CRM בסיסי)

### 5.1 טבלת לקוחות + כרטיס לקוח
- טבלה חדשה: `customers` — `id, name, phone, email, city, notes, created_at`
- הוספת `customer_id` (nullable) לטבלת `orders`
- דף `CustomersPage.tsx` — רשימת לקוחות עם חיפוש
- כרטיס לקוח: שם, טלפון, LTV (סה"כ הזמנות), ממוצע עסקה, מספר הזמנות, תדירות, היסטוריית הזמנות
- ב-`OrderForm` — אפשרות לבחור לקוח קיים או ליצור חדש
- Route: `/customers` + פריט בתפריט

---

## שינויי DB (מיגרציות)

```sql
-- 1. שמות ערבית
ALTER TABLE products ADD COLUMN name_ar text, ADD COLUMN description_ar text, ADD COLUMN short_description_ar text;
ALTER TABLE product_variations ADD COLUMN name_ar text;

-- 2. מע"מ + מקור
ALTER TABLE orders ADD COLUMN includes_vat boolean DEFAULT true;
ALTER TABLE orders ADD COLUMN created_by uuid REFERENCES auth.users(id);

-- 3. לקוחות
CREATE TABLE customers (...);
ALTER TABLE orders ADD COLUMN customer_id uuid REFERENCES customers(id);
```

## קבצים חדשים
| קובץ | תיאור |
|---|---|
| `InventoryWriteOffPage.tsx` | דף פחת/הורדת מלאי |
| `PickingQueuePage.tsx` | מסך ליקוט הזמנות |
| `InDeliveryPage.tsx` | מסך הזמנות במשלוח |
| `CustomersPage.tsx` | רשימת לקוחות |
| `CustomerDetail.tsx` | כרטיס לקוח |

## קבצים לשינוי
| קובץ | שינוי |
|---|---|
| `ProductForm.tsx` | שמות ערבית, תמונות, תיאור מורחב, הערת מע"מ |
| `BundleForm.tsx` | עריכה, מארז בתוך מארז, הצגת שם מוצר+וריאציה |
| `InventoryIndex.tsx` | תצוגה מצטברת, חסימת עריכה |
| `OrderForm.tsx` | כתובת, מע"מ, בחירת לקוח, created_by |
| `OrderDetail.tsx` | מקור + עובד, מע"מ |
| `OrdersPage.tsx` | עמודת מקור |
| `AppSidebar.tsx` | פריטים חדשים בתפריט |
| `App.tsx` | routes חדשים |
| `useOrders.ts` | created_by, customer_id |
| `PosPage.tsx` | created_by |

