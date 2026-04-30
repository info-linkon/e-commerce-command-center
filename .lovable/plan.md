## הבעיה

הזמנה #266 נוצרה באתר עם **תשלום במזומן** (`payment_method = 'cash'`). לכן `hyp-create-payment` מעולם לא רץ ו-`payment_link_url` נשאר `NULL` במסד.

בדף "סיכום הזמנה" (WebOrderSummary), כפתור "שלם בכרטיס אשראי" מוצג לכל הזמנה שאינה סגורה/משולמת — בלי קשר לאמצעי התשלום שנבחר. הקליק מוביל ל-`/pay/266` → Edge Function `pay-redirect` → המסך הקריטי "לינק תשלום לא זמין", **בקידוד שבור (mojibake)** כי ה-Response נשלח כ-string במקום bytes UTF-8 מקודדים מפורש.

## מה נתקן

### 1. `pay-redirect` — אם אין `payment_link_url`, צור אותו on-demand

במקום להחזיר "לינק לא זמין", הפונקציה תקרא ל-`hyp-create-payment` באופן פנימי (עם service role) על בסיס פרטי ההזמנה, תקבל URL חתום, תעדכן את ההזמנה, ותעשה 302 ישירות לדף התשלום של HYP. זה מטפל בכל המקרים:
- הזמנה שנוצרה במזומן והלקוח החליט אח"כ לשלם באשראי (המקרה הנוכחי).
- הזמנה שנוצרה כאשראי אבל ה-iframe לא הצליח להיווצר בזמן הצ'קאאוט.
- כל קליק חוזר על קישור ה-SMS שפג תוקפו.

רק אם `hyp-create-payment` נכשל (אישורי HYP חסרים, כשל רשת וכו') נציג עמוד שגיאה ידידותי בעברית עם פרטי יצירת קשר.

### 2. תיקון קידוד UTF-8 ב-`pay-redirect`

החלפת `new Response(htmlString, ...)` ב-`new Response(new TextEncoder().encode(htmlString), ...)` כדי להבטיח שעברית תוצג נכון בכל סביבת runtime.

### 3. `WebOrderSummary` — לא להציע "תשלום באשראי" כשלא רלוונטי

הסתרת ה-CTA כאשר `payment_method` הוא `cash` או `bit` (אופציונלית: גם "איסוף עצמי"). עדיין נציג אותו אם המסלול היה אשראי אבל ה-link עדיין לא נוצר. בנוסף, נחליף את הטקסט בכפתור עבור הזמנת מזומן ל-"שלם בכרטיס אשראי במקום מזומן" אם תרצה לאפשר שינוי אמצעי תשלום מאוחר יותר — או פשוט נסתיר.

## פרטים טכניים

**`supabase/functions/pay-redirect/index.ts`**
- קריאת `payment_method`, `customer_name`, `customer_phone`, `customer_email`, `total` יחד עם השדות הקיימים.
- אם `payment_link_url` חסר ו-`hyp_transaction_id` חסר וההזמנה במצב פעיל — `supabase.functions.invoke("hyp-create-payment", {...})`. בהצלחה: 302 ל-`payment_url`. בכישלון: עמוד HTML עם הודעת שגיאה.
- `function page()`: להחזיר `new Response(new TextEncoder().encode(html), { status, headers: htmlHeaders })`.

**`src/pages/web/WebOrderSummary.tsx`**
- בלוק ה-CTA (שורות 264–283): להוסיף בדיקה `order.payment_method !== 'cash' && order.payment_method !== 'bit'`. אופציונלית, להציג כפתור "שינוי אמצעי תשלום לאשראי" כשהמשתמש בחר במזומן — אבל זה דורש אישור.

## שאלה אחת לפני יישום

עבור הזמנת **מזומן** שנפתחה באתר — כשהלקוח נכנס לדף סיכום ההזמנה, מה ההתנהגות שתרצה?

