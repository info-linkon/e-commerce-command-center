## מטרה

להוסיף בקופה (POS) אפשרות **לפצל תשלום** בין מספר אמצעים (למשל חלק מזומן + חלק אשראי + חלק bit), בלי לשבור שום זרימה קיימת — לא הזמנת מזומן רגילה, לא לינק HYP, לא הזמנות שמסתיימות מאוחר יותר ב־`PaymentSection`.

## איך זה ייראה למשתמש

בדיאלוג "צור הזמנה" של ה־POS, מתחת לשדה "שיטת תשלום" יופיע מתג חדש **"פיצול תשלום"**. כשהוא כבוי — שום שינוי, הכל עובד בדיוק כמו היום. כשהוא דלוק:

- שדה "שיטת תשלום" היחיד מוחלף ברשימת **שורות תשלום**, כל שורה: סכום + אמצעי (`מזומן` / `אשראי - רישום ידני` / `bit`) + (אם מזומן) קופה + שדה אסמכתא חופשי.
- כפתור "+ הוסף שורת תשלום" שמוסיף שורה חדשה עם הסכום שנותר עד ליעד.
- אינדיקטור: **סך השורות / סך ההזמנה / נותר**. הכפתור "צור ושלח להזמנות" מושבת כל עוד הסכום הכולל ≠ סך ההזמנה, או שיש שורת מזומן ללא קופה.
- במצב פיצול לא תוצג אופציית "לינק HYP" (זה זרם נפרד שלא מתאים לפיצול בקופה — הלקוח לא יכול לפצל לינק HYP יחיד מראש).

## שינויים טכניים

### 1. `src/pages/PosPage.tsx`

- מצב חדש: `splitMode: boolean` (ברירת מחדל `false`) ו־`splitLines: { amount: string; method: "cash"|"credit"|"bit"; cash_register_id: string; reference: string }[]`.
- כש־`splitMode=false` → הקוד הקיים רץ ללא שינוי (מסלול `paymentMethod` יחיד, כולל `credit_link`).
- כש־`splitMode=true`:
  - ולידציות חדשות לפני קריאה ל־`createOrder`: סכום השורות = `total`, אין שורת מזומן בלי קופה, כל סכום > 0.
  - קריאה ל־`createOrder.mutateAsync(...)` מועברת עם שדה חדש `payments: [...]` במקום `payment_method` / `cash_register_id` יחידים. עבור הקלט הזה `payment_method` של ההזמנה עצמה נשמר כ־`"split"` (טקסט חופשי בעמודה `orders.payment_method` שהיא כבר `text` nullable — לא enum, נבדק).
- ניקוי בסיום (איפוס `splitLines` ל־[] ו־`splitMode=false`).

### 2. `src/hooks/useOrders.ts` — `useCreateOrder`

הרחבה תואמת לאחור של ה־input:

```ts
payments?: { amount: number; payment_method: "cash"|"credit"|"bit"; cash_register_id?: string; reference?: string }[];
```

לוגיקה:

- אם `payments` קיים ולא ריק → לא מבצעים את ה־INSERT הבודד הקיים בשורות 154–182. במקומו:
  1. INSERT bulk לטבלת `payments` של כל השורות.
  2. עבור כל שורת מזומן עם קופה לא־"deferred" → קריאה ל־`increment_cash_register` RPC עם הסכום של אותה שורה (אותו אטומיזם כמו היום).
  3. שורות "deferred" — נשאר ל־DB trigger `sync_deferred_register_on_payment` להוסיף ל־balance רק כשההזמנה תושלם (כבר קיים).
- אם `payments` לא קיים → הקוד הקיים רץ כפי שהוא (אין רגרסיה למסלול הקיים, כולל `credit_link` שמשתמש ב־`skip_auto_payment`).

זה משתמש בדיוק באותו דפוס של `useRecordPayment` שכבר קיים ועובד עבור פיצול תשלום ב־`PaymentSection.tsx` — אין המצאה של מנגנון חדש.

### 3. ללא שינויי DB

- `payments.payment_method` כבר enum `cash | bit | credit` → תומך בכל השלוש.
- `orders.payment_method` היא `text` nullable → אפשר לשמור `"split"` כסימון אינפורמטיבי בלבד; שום קוד שבדקתי לא משווה ל־`"split"` ולכן זה לא ישבור הצגות (`PaymentSection` מסתכל על `payments` בפועל, לא על המחרוזת הזו).
- אין צורך במיגרציה.

## בדיקות רגרסיה שאעשה ידנית אחרי המימוש

1. הזמנת POS מזומן רגילה (ללא פיצול) → נוצרת עם payment יחיד, יתרת קופה עולה ב־RPC, כמו היום.
2. הזמנת POS אשראי (רישום ידני) רגילה → payment יחיד, ללא נגיעה בקופה.
3. הזמנת POS עם `credit_link` (HYP) → עדיין מדלגת על יצירת payment (skip_auto_payment), שולחת SMS.
4. הזמנת POS **בפיצול** מזומן+אשראי → שני records ב־`payments`, רק חלק המזומן עולה ביתרת הקופה.
5. הזמנת POS **בפיצול** מזומן בקופה רגילה + מזומן בקופה "deferred" → היתרה של הרגילה עולה מיד, של ה־deferred עולה רק כשההזמנה תושלם.
6. ביטול הזמנה מפוצלת → `useCancelOrder` הקיים כבר עובר על כל ה־payments ומחזיר לקופות (קוד קיים בשורות 400–445 של `useOrders.ts`), עובד אוטומטית.
7. פתיחת הזמנה מפוצלת ב־`OrderDetail` → `PaymentSection` כבר יודע להציג מספר תשלומים קיימים ולהציג סטטוס "שולם" כש־`totalPaid >= total`.

## קבצים שישתנו

- `src/pages/PosPage.tsx` — UI של פיצול + העברת `payments[]` במקום `payment_method` יחיד כשמופעל.
- `src/hooks/useOrders.ts` — תמיכה בשדה `payments[]` ב־`useCreateOrder`, מסלול חדש שעוקף את ה־INSERT הבודד.

## בלי לגעת

- `PaymentSection.tsx`, `useRecordPayment`, טריגרים, RLS, edge functions, `useCancelOrder` — כולם נשארים כפי שהם.
