# סימון חשבונית להזמנות + טאב "סוג הזמנה" בדוחות

## מטרה
1. כל הזמנה שהונפק עליה חשבונית (אוטומטית או ידנית) — תסומן בבירור.
2. אפשרות לסמן **ידנית** הזמנה כ"הופקה חשבונית" (למקרה של חשבונית שהוצאה מחוץ למערכת).
3. טאב חדש בדוחות → **"סוג הזמנה"** עם שני תתי-טאבים: **עם חשבונית** / **בלי חשבונית**.

## ניתוח המצב הקיים
- חשבוניות אשראי דרך HYP מופקות אוטומטית ב-EZCount, נשמרות בטבלת `documents` עם `order_id`, ו-`orders.invoice_url` מתעדכן.
- אין כיום אינדיקטור ויזואלי ברשימת ההזמנות שמראה אם יש חשבונית.
- אין דרך לסמן ידנית הזמנה (מזומן/Bit) כ"חשבונית הופקה ידנית".

## שינויים נדרשים

### 1. בסיס נתונים (Migration)
הוספת עמודה ל-`orders`:
```sql
ALTER TABLE public.orders 
  ADD COLUMN IF NOT EXISTS invoice_issued_manually boolean NOT NULL DEFAULT false;
```
- העמודה מתעדת סימון ידני בלבד.
- הזמנה תיחשב "עם חשבונית" אם: `invoice_url IS NOT NULL` **או** קיים `documents.status='issued'` עבורה **או** `invoice_issued_manually = true`.

### 2. עדכון `useOrders` hook
שינוי השאילתה לכלול ספירת מסמכים שהונפקו:
```ts
.select("*, warehouses(name), payments(cash_register_id), documents:documents!documents_order_id_fkey(id, status)")
```
(אם אין FK מוגדר — נשתמש ב-`documents(id, status)` ונסנן ב-client).

הוספת helper: `hasInvoice(order)` שמחזיר `true` אם:
- `order.invoice_issued_manually === true` או
- `order.invoice_url` קיים או
- יש מסמך אחד לפחות עם `status='issued'`.

### 3. תצוגה ב-`OrdersPage.tsx`
- **עמודה חדשה** "חשבונית" עם Badge:
  - 🟢 "אוטומטית" (יש document/invoice_url)
  - 🔵 "ידנית" (`invoice_issued_manually=true` ואין document)
  - ⚪ "—" (אין חשבונית)
- **פילטר חדש** ב-Select: "עם חשבונית" / "בלי חשבונית" / "הכל".

### 4. תצוגה ב-`OrderDetail.tsx`
- אם אין חשבונית אוטומטית — להוסיף **כפתור/Switch** "סמן כחשבונית הופקה ידנית" (Toggle של `invoice_issued_manually`).
- אם יש חשבונית אוטומטית — Badge "חשבונית הופקה" + לינק להורדה (`invoice_url`).
- אם הוסר הסימון הידני — Toggle off חוזר.

### 5. דוחות — טאב חדש "סוג הזמנה"
ב-`src/pages/ReportsPage.tsx`:
- הוספת `<TabsTrigger value="order-type">סוג הזמנה</TabsTrigger>`
- יצירת רכיב חדש `src/components/reports/OrderTypeTab.tsx` עם:
  - **תת-Tabs פנימי**: `with-invoice` / `without-invoice`.
  - שאילתה ל-`orders` בטווח התאריכים (`startDate`/`endDate`).
  - קביעת סטטוס חשבונית לכל הזמנה (לפי הלוגיקה מסעיף 2).
  - תצוגה: טבלה עם מס׳ הזמנה, לקוח, סכום, אמצעי תשלום, סטטוס, סוג חשבונית (אוטומטית/ידנית בטאב "עם").
  - סיכומי ראש: כמות הזמנות + סך כספי בכל קבוצה.
  - שימוש ב-`MobileCardList` לתצוגה רספונסיבית.

## קבצים שיושפעו

| קובץ | שינוי |
|------|--------|
| migration חדש | הוספת `invoice_issued_manually` |
| `src/hooks/useOrders.ts` | הרחבת select + helper `hasInvoice` |
| `src/pages/orders/OrdersPage.tsx` | עמודה + פילטר |
| `src/pages/orders/OrderDetail.tsx` | Toggle + תצוגת סטטוס חשבונית |
| `src/components/reports/OrderTypeTab.tsx` | חדש |
| `src/pages/ReportsPage.tsx` | רישום הטאב |

## תוצאה צפויה
- בכל מקום במערכת רואים מיידית אם להזמנה יש חשבונית.
- ניתן לסמן ידנית הזמנות שהוצאה להן חשבונית מחוץ למערכת.
- בדוחות אפשר לחתוך את הנתונים לפי "עם" / "בלי" חשבונית בטווח תאריכים.
