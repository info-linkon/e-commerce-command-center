# סגירת חודש לקופות (ספירת מזומן ואישור)

בסוף כל חודש כל משתמש סופר את המזומן בקופה, מזין את הסכום שנספר בפועל, והמערכת משווה מול היתרה המחושבת. אחרי האישור החודש נסגר ונעול, והחודש הבא מתחיל מהסכום שאושר — כך שאם יש בלגן, בודקים רק את התקופה שמאז הסגירה האחרונה.

## איך זה יעבוד

1. בדף הקופות (`/crm/cash-registers`) יתווסף לכל קופה כפתור "סגירת חודש" וסטטוס: "החודש טרם נסגר" / "נסגר ב-…".
2. בלחיצה נפתח דיאלוג סגירה שמציג:
   - החודש הנסגר (ברירת מחדל: החודש הקודם, ואם כבר נסגר — החודש הנוכחי)
   - יתרת פתיחה (הסכום שאושר בסגירה הקודמת)
   - פירוט התנועות בתקופה: תשלומים, הוצאות, העברות נכנסות/יוצאות
   - היתרה הצפויה לפי המערכת
   - שדה חובה: "סכום שנספר בפועל" + שדה הערות
3. הפרש מוצג בזמן אמת (עודף/חוסר). מותר לסגור גם עם פער — הפער נשמר עם ההערה, והיתרה של הקופה מתעדכנת אוטומטית לסכום שנספר. תנועת התאמה מתועדת כדי שהדוחות יישארו עקביים.
4. לאחר האישור התקופה **נעולה**: אי אפשר להוסיף/לערוך/למחוק תשלומים, הוצאות והעברות בתאריכים שבתוך התקופה הסגורה עבור אותה קופה. ניסיון כזה ייחסם עם הודעה ברורה.
5. בעלים (owner) בלבד יכול לפתוח מחדש חודש שנסגר (עם תיעוד מי פתח ומתי).
6. טאב חדש "סגירות חודש" בדוחות: היסטוריית כל הסגירות לפי קופה וחודש — צפוי, נספר, פער, מי סגר ומתי.

## הרשאות

כל משתמש מחובר יכול לבצע סגירה לקופה, והסגירה נרשמת על שמו (`closed_by`). בעלים רואה את כל הסגירות ורק הוא יכול לפתוח מחדש.

## פרטים טכניים

**טבלה חדשה `cash_register_closings`** (דרך `supabase--run_sql`, כולל GRANT + RLS):
`id`, `cash_register_id`, `period_start` (date), `period_end` (date), `opening_balance`, `expected_balance`, `counted_balance`, `difference` (generated/מחושב), `notes`, `closed_by`, `closed_at`, `reopened_by`, `reopened_at`, `is_open` (boolean). אינדקס ייחודי על (`cash_register_id`, `period_start`) עבור סגירות פעילות.

**נעילה בצד DB** — פונקציה `is_period_locked(register_id, ts)` (security definer) + טריגרים BEFORE INSERT/UPDATE/DELETE על `payments`, `expenses`, `cash_transfers` שמעלים חריגה כשהתאריך נופל בתוך תקופה סגורה של אותה קופה. זה מבטיח שהחסימה תקפה גם דרך POS, הזמנות ועריכת סכומים ב-`OrderDetail`.

**התאמה אוטומטית** — כשיש פער, הסגירה מעדכנת את `cash_registers.current_balance` ואת `opening_balance` הבא לסכום שנספר, ורושמת רשומת התאמה כדי שהחישוב ב-`useRegistersBreakdown` (`opening + payments - expenses + transfers`) ימשיך להסתדר מול היתרה בפועל.

**קוד**:
- הוק חדש `src/hooks/useCashClosings.ts` — `useCashClosings`, `useRegisterPeriodSummary(registerId, from, to)`, `useCloseCashPeriod`, `useReopenCashPeriod`.
- דיאלוג חדש `src/components/cash/CloseMonthDialog.tsx`.
- עדכון `src/pages/CashRegistersPage.tsx` — כפתור/סטטוס לכל קופה; `useRegistersBreakdown` יחושב מהסגירה האחרונה ואילך.
- טאב חדש `src/components/reports/ClosingsTab.tsx` + רישום ב-`src/pages/ReportsPage.tsx`.
- הודעות שגיאה ידידותיות בעברית כשפעולה נחסמת בגלל חודש סגור (ב-`usePayments.ts`, `useExpenses.ts`, `useCashTransfers.ts`, `OrderDetail.tsx`).
