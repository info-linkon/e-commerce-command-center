# הצגת מזומן רק מהזמנות שהושלמו — דשבורד ודוחות

## מטרה
בכל מקום בדשבורד ובדוחות שמסכם תשלומי **מזומן**, לכלול רק תשלומים השייכים להזמנות בסטטוס `completed`. תשלומי אשראי וביט נשארים כפי שהם (כל הסטטוסים).

## מקומות שישתנו

### 1. `src/components/dashboard/StatsCards.tsx` (כרטיס "כסף נכנס")
- שאילתת ה-`payments` תורחב ל-`select("amount, payment_method, orders!inner(status)")` עם סינון על תאריך התשלום.
- חישוב `cashTotal` יסונן גם ב-`p.orders.status === "completed"` בנוסף ל-`payment_method === "cash"`.
- `creditTotal` ו-`bitTotal` ימשיכו לכלול את כל התשלומים (ללא סינון סטטוס).
- `totalIncome` יחושב כ-`cashTotal + creditTotal + bitTotal` כדי שיהיה עקבי עם הפירוט.

### 2. `src/components/reports/CashflowTab.tsx`
**א. גרף "התפלגות אמצעי תשלום" (pieData):**
- בעת הצבירה לפי שיטה, עבור `payment_method === "cash"` נכלול רק תשלומים שבהם `orders.status === "completed"`. שאר השיטות נשארות.

**ב. טבלת "תשלומים בתקופה":**
- להוסיף `orders(order_number, status)` ל-select, ולסנן בצד הקליינט: תשלומי מזומן יוצגו רק אם ההזמנה שלהם `completed`. אשראי/ביט מוצגים תמיד.
- כך הטבלה תואמת לחישוב היתרה ולתרשים.

## מקומות שלא משתנים
- `OverviewTab` — מסכם הזמנות והוצאות, לא מסכם תשלומי מזומן ישירות.
- `OrderTypeTab` — מציג הזמנות לפי `payment_method` של ההזמנה (לא רשומות payments).
- `RecentActivity`, `SalesChart`, `ExpensesTab`, `ProfitabilityTab`, `SalesTab` — לא מסכמים מזומן.
- יתרות הקופות עצמן כבר מחושבות נכון ע"י טריגר ה-DB (`requires_completed_order`).

## שינויי קבצים
- `src/components/dashboard/StatsCards.tsx`
- `src/components/reports/CashflowTab.tsx`

ללא שינויי DB.
