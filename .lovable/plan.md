## 1. ליקוט — שורה נפרדת לכל יחידה

היום `order_picking_items` נשמר עם שדה `quantity` (למשל x2), ומוצג כשורה אחת עם ×2. נשנה כך שכל יחידה תהיה שורה נפרדת עם checkbox משלה.

**שינויים:**
- `src/hooks/usePickingItems.ts` — בפונקציית `rebuildMissingPickingItems`, במקום להכניס רשומה אחת עם `quantity: N`, נכניס `N` רשומות עם `quantity: 1` (גם למוצרים רגילים וגם לרכיבי מארז — `component.quantity * item.quantity` נהפך ללולאה של יחידות בודדות).
- `src/components/orders/PickingChecklist.tsx` — נסיר את התווית `×{quantity}` (כל שורה = יחידה אחת). קיבוץ מארזים לפי `order_item_id` יישמר כמו היום, אבל בתוך המארז יופיעו כל היחידות כשורות נפרדות.
- הזמנות קיימות: הפעם הראשונה שנכנסים לליקוט של הזמנה שכבר יש לה רשומות עם quantity>1 — נשאיר כפי שהן (לא נשבור התנהגות של הזמנות פתוחות). ההתנהגות החדשה תחול על הזמנות שנוצרות מעכשיו + הזמנות שעדיין לא נבנה להן ליקוט.

> אם רוצים גם לפצל אוטומטית הזמנות פתוחות קיימות (שלא סומנו עדיין) — אפשר להוסיף מיגרציה נפרדת. תגיד אם צריך.

## 2. שמירת סינון בחזרה מהזמנה / מדוח

הבעיה: `useState` מקומי ב-`OrdersPage` וב-`ReportsPage` מאבד את הסינון בכל ניווט חזרה. הפתרון: להעביר את הסינון ל-URL query params, כך שהדפדפן עצמו משחזר אותם ב-Back.

**שינויים:**

### `src/pages/orders/OrdersPage.tsx`
- להחליף את ה-`useState` של `statusFilter`, `search`, `registerFilter`, `invoiceFilter` ב-`useSearchParams`.
- קריאה: מ-`searchParams.get("status") ?? defaultStatus ?? "all"` וכו'.
- כתיבה: `setSearchParams(next, { replace: true })` בכל שינוי, כך שלא מזהמים את היסטוריית הדפדפן בכל הקלדה.
- לינק להזמנה (`/crm/orders/:id`) נשאר Push רגיל → Back יחזיר את ה-URL עם הפילטרים.

### `src/pages/ReportsPage.tsx`
- אותה גישה עבור `period`, `fromDate`, `toDate`, וגם הטאב הפעיל (`tab`) של `<Tabs>` — לשנות מ-`defaultValue` ל-`value` שנשלט מ-URL, ולהחליף את קבועי מצב ב-`useSearchParams` עם `{ replace: true }`.
- תאריכים ישמרו כ-`yyyy-MM-dd` ב-URL, פרסינג ל-`Date` בקריאה.

**לא נוגעים** ב-`useOrders`/`useQuery` ולא בלוגיקת נתונים — רק שכבת ה-UI.

## סדר ביצוע

1. UI Reports + Orders — סינון ב-URL.
2. Picking — שינוי rebuild + הסרת ה-×N מה-UI.
