

# תיקון: ביטול הזמנה + העברות מלאי

## הבעיות שאותרו

### 1. ביטול הזמנה לא מחזיר כסף לקופה
ב-`useCancelOrder` (`src/hooks/useOrders.ts`) הקוד רק מחזיר מלאי ומשנה סטטוס — לא נוגע ב-`payments` ולא בקופה. תוצאה: הזמנה במזומן שבוטלה — הכסף נשאר ביתרת הקופה לנצח.

### 2. ביטול ושיוך מלאי של מארזים — מנכים מהמקום הלא נכון
גם `useAssignWarehouse` וגם `useCancelOrder` מבצעים ניכוי/החזרה לפי `order_item.variation_id`. במארזים, ה-variation הזה הוא ה-"shell" (פגז המוצר) — לא מוחזק לו מלאי. הרכיבים האמיתיים נמצאים ב-`bundle_items` או ב-`bundle_variation_items`. תוצאה:
- בשיוך — המלאי של הרכיבים האמיתיים לא יורד (יוצר פגז מלאי שלילי על ה-shell, והרכיבים נשארים מלאים).
- בביטול — אותו הדבר במהופך.

הפיקינג עצמו (`order_picking_items`) **כן** מתפרק נכון לרכיבים, אבל פעולת ה-DB על `inventory` לא.

### 3. בהעברות מלאי לא מופיעות וריאציות של מארזים
זה למעשה **התנהגות נכונה** — מארזים לא אמורים להיות במלאי הפיזי, רק רכיביהם. אבל המשתמש מצפה לראות את הרכיבים (למשל "צבע אדום", "צבע ירוק") כדי להעביר אותם בנפרד. הסלקט מציג כל `product_variations` — כולל ה-shell של המארזים שמטעים. צריך **לסנן החוצה** מארזים מהסלקט.

### 4. אין חיפוש בסלקט של העברות מלאי
רשימה ארוכה של עשרות וריאציות ב-Select רגיל — קשה למצוא פריט. צריך Combobox עם חיפוש חופשי לפי שם מוצר/וריאציה/SKU.

## הפתרון

### תיקון 1+2: שכתוב `useCancelOrder` ו-`useAssignWarehouse`

**עזר משותף**: פונקציה פנימית `expandToInventoryRows(items)` שמקבלת order_items ומחזירה רשימת `{ variation_id, quantity }` של הרכיבים האמיתיים שצריך לנכות/להחזיר במלאי — תוך פירוק מארפים לפי `bundle_type` (אותה לוגיקה שכבר קיימת בבניית `pickingItems`).

**`useAssignWarehouse`**: להחליף את הלולאה של ניכוי המלאי כך שתפעל על תוצאת `expandToInventoryRows(items)` במקום ישירות על `order_items`. כך גם המלאי יורד נכון, גם הלוג נכון, וגם הסנכרון ל-Woo (שכבר רק על variation_ids אמיתיים) ייעשה לרכיבים האמיתיים.

**`useCancelOrder`**:
1. החזרת מלאי לפי `expandToInventoryRows(items)` (במקום ישירות על order_items).
2. **חדש** — החזרת תשלומים:
   - שליפת כל ה-`payments` של ההזמנה.
   - לכל תשלום מזומן עם `cash_register_id` — קריאה ל-`increment_cash_register(reg_id, -amount)` (RPC קיים, מקבל ערך שלילי).
   - מחיקת רשומות ה-`payments` (או סימונן כ-void — אבל מחיקה פשוטה יותר ועקבית עם לוגיקת היפוך מלאי).
   - רישום `payment_events` לתיעוד הביטול.

### תיקון 3+4: שיפור דיאלוג העברת מלאי

**ב-`src/pages/inventory/TransfersPage.tsx`**:
- שינוי ה-query `all-variations` כך שיסנן מוצרים שהם מארזים: אחרי השליפה של `product_variations` עם `products(name, name_ar, product_type)`, לסנן `product_type !== 'simple_bundle' && product_type !== 'variable_bundle'`. זה מסיר את ה-shell של המארפים מהרשימה.
- החלפת ה-`Select` של בחירת פריט ב-`Command` + `Popover` (Combobox עם חיפוש). שדה החיפוש יחפש לפי שם המוצר (he+ar), שם הוריאציה ו-SKU.
- תצוגה: "שם מוצר — שם וריאציה (SKU)". למוצרים `simple` עם variation בשם "Default" — להציג רק את שם המוצר כדי לא להטעות.

### בונוס איכות: עיגון לוגיקה

ליצור קובץ עזר חדש `src/lib/order-inventory.ts` עם הפונקציה `expandToInventoryRows(items)` כדי שגם השיוך וגם הביטול ישתמשו באותה לוגיקה (אחרת היא תיכפל ותיווצר שונות בעתיד).

## טכני: קבצים שיושפעו

- **חדש**: `src/lib/order-inventory.ts` — `expandToInventoryRows()` שמפרק מארזים לרכיבים.
- **שינוי**: `src/hooks/useOrders.ts`:
  - `useAssignWarehouse` — שימוש ב-`expandToInventoryRows` לניכוי מלאי.
  - `useCancelOrder` — שימוש ב-`expandToInventoryRows` להחזרת מלאי + לוגיקת החזרת תשלומים מזומן לקופה ומחיקת רשומות `payments`.
- **שינוי**: `src/pages/inventory/TransfersPage.tsx`:
  - סינון מארזים מה-query.
  - החלפת ה-`Select` ב-Combobox (Command + Popover) עם חיפוש.

## בדיקת קצה

לאחר הביצוע נריץ `tsc --noEmit` כדי לוודא שאין שבירה. נמליץ למשתמש לבדוק:
1. ביטול הזמנת POS שכללה תשלום במזומן ⇒ יתרת הקופה יורדת.
2. ביטול הזמנה שכללה מארז ⇒ המלאי של הרכיבים (ולא של ה-shell) חוזר.
3. דיאלוג העברת מלאי ⇒ חיפוש עובד, מארזים לא מופיעים, ורק רכיבים אמיתיים זמינים.

