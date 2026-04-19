

## תוכנית

### 1. תיקון גלילה בסל בטלפון
**הבעיה**: בדף `/cart` (mobile), הגלילה נתקעת — צריך "להחזיר אצבע" כי כנראה יש overflow/touch handler שמפריע. סיכוי גבוה שזה נובע מ:
- ה-`<input type="number">` של הכמות תופס את ה-touch בתוך כרטיס הפריט
- אין `touch-action` מוגדר באזורים הרלוונטיים
- ב-`WebLayout` ייתכן וכפתור "checkout מורם" sticky חוסם את הגלילה במובייל

**תיקון מתוכנן ב-`src/pages/web/WebCartPage.tsx`**:
- להוסיף `touch-action: pan-y` לקונטיינר הראשי ולכרטיסי הפריטים
- להחליף את ה-`<input type="number">` בתצוגת מספר רגילה (span) עם כפתורי +/- בלבד (לפי דפוס שכבר משמש בדף checkout) — מונע לכידת מחוות גלילה ע״י ה-input
- לוודא שאין `overflow: hidden` בלתי-נחוץ על ה-container במובייל
- לבדוק ב-`WebLayout` / `WebBottomNav` אם יש שכבה sticky שתופסת אירועי touch (אם כן — להוסיף `pointer-events-none` לאזור הרקע שלה)

### 2. עריכת תוכן הזמנה בממשק הניהול
**מצב נוכחי**: `OrderDetail.tsx` מציג פריטים אך לא מאפשר עריכה אחרי יצירה.

**תיקון מתוכנן**:

**א. רכיב חדש `src/components/orders/OrderItemsEditor.tsx`**:
- כפתור "ערוך פריטים" בתוך כרטיס הפריטים ב-`OrderDetail`
- במצב עריכה: לכל שורה — שדה כמות + כפתור הסרה
- כפתור "הוסף פריט" → דיאלוג חיפוש מוצרים (משתמש ב-`useProducts` + `useBundles`) עם בחירת וריאציה (אם רלוונטי) וכמות
- חישוב מחדש של `subtotal`/`total` כולל משלוח קיים והנחת קופון קיימת
- כפתורי "שמור" / "ביטול" בתחתית

**ב. הרחבת `src/hooks/useOrders.ts`**:
- `useUpdateOrderItems(orderId)` mutation שמקבלת רשימת פריטים חדשה ומבצעת:
  1. השוואה מול `order_items` קיימים (insert/update/delete)
  2. עדכון מלאי בהתאם להפרשים (החזרת מלאי לפריטים שהוסרו/הוקטנו, ניכוי לפריטים שהוספו/גדלו) — רק אם ההזמנה כבר במצב שניכה מלאי (לפי הסטטוס)
  3. עדכון `subtotal` / `total` בטבלת `orders`
  4. רישום ב-`inventory_log` עם `created_by` ו-`reason: 'order_edit'`
  5. סנכרון ל-Woo דרך `syncOrderStatusToWoo` הקיים
- ולידציה: לא לאפשר עריכה אם ההזמנה במצב `completed` או `cancelled` (או — להציג אזהרה ולחייב אישור)
- שמירה אוטומטית של וריאציית "ברירת מחדל" עבור מארזים (אותו מנגנון מהאתר)

**ג. הרשאות**:
- בטבלת `orders` ו-`order_items` — לוודא ש-RLS מאפשר UPDATE/INSERT/DELETE למשתמשים מאומתים (CRM)
- אם חסר — להוסיף migration

### עקרונות
- אין שינויי DB אלא אם בדיקת RLS תראה שחסרות הרשאות
- כל פעולה תרשום `created_by` (audit trail — לפי memory)
- עדכון מלאי מותנה במצב הזמנה (לא לכפול ניכוי אם מלאי עוד לא הופחת)
- שמות מוצרים בערבית (`name_ar || name`) — לפי memory

### קבצים שיווצרו/ישונו
- `src/pages/web/WebCartPage.tsx` (תיקון גלילה)
- `src/components/orders/OrderItemsEditor.tsx` (חדש)
- `src/components/orders/AddOrderItemDialog.tsx` (חדש — חיפוש והוספת פריט)
- `src/pages/orders/OrderDetail.tsx` (שילוב ה-editor)
- `src/hooks/useOrders.ts` (mutation חדשה)
- migration לבדיקת RLS אם נדרש

