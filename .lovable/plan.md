## הבעיה
היום יש שני מסלולים להשלמת הזמנה:
1. **CompleteOrderDialog** (כפתור "סמן כהושלמה") — פותח דיאלוג עלות משלוח, רושם הוצאה, מנפיק חשבונית מס/קבלה למזומן, שולח SMS.
2. **טוגל "סמן הזמנה כהושלמה" בדיאלוג רישום תשלום** (`PaymentSection`) — קורא ל-`useRecordPayment` עם `completeOrder: true` שמעדכן ישירות `status='completed'` ב-DB, **בלי דיאלוג משלוח, בלי `completed_by`, בלי הוצאת משלוח, בלי חשבונית אוטו'**. כך נסגרה הזמנה #340.

## הפתרון
לאחד למסלול אחד — הטוגל ב-`PaymentSection` לא יסגור את ההזמנה ישירות, אלא יפתח את `CompleteOrderDialog` מיד לאחר רישום התשלום המוצלח.

## שינויים

### 1. `src/hooks/usePayments.ts` — `useRecordPayment`
- להסיר את בלוק `if (input.completeOrder) { update status='completed' }`.
- להשאיר את הפרמטר `completeOrder` בחתימה (אופציונלי) רק לשם תאימות עם הודעת ה-toast, או להסיר לחלוטין ולעדכן את הקריאה.
- ה-toast יחזור תמיד ל-"התשלום נרשם".

### 2. `src/components/orders/PaymentSection.tsx`
- להוסיף state: `showCompleteDialog`.
- ב-`handleSubmit` → `onSuccess`: אם `completeOrder === true`, לסגור את דיאלוג התשלום ולפתוח את `CompleteOrderDialog` (`setShowCompleteDialog(true)`).
- לרנדר `<CompleteOrderDialog>` בתוך הקומפוננטה עם ה-props הקיימים (orderId, orderNumber, customerName, customerEmail, customerPhone, orderItems, shippingCost, discountAmount, hasInvoice).
- להסיר את לוגיקת `issueInvoice` המקבילה (חשבונית למזומן) — `CompleteOrderDialog` כבר מטפל בזה אוטומטית. הטוגל "הנפק חשבונית מס קבלה" בדיאלוג הופך למיותר כשמשלימים, אבל יישאר רלוונטי כשלא מסמנים השלמה — לכן: להציג את הטוגל רק כאשר `completeOrder === false`.

### 3. אין שינויי DB.

## מה משתפר
- כל השלמה — בין אם דרך הכפתור הירוק או דרך הטוגל בדיאלוג התשלום — תעבור באותו flow: דיאלוג עלות משלוח → רישום הוצאה → סטטוס completed → חשבונית אוטו' → SMS.
- `completed_by` יתועד תמיד (דרך `useUpdateOrderStatus`).
- לא יקרה יותר מצב כמו #340 שבו הזמנה נסגרת בלי הוצאת משלוח ובלי חשבונית.

## הערות
- שינוי התנהגות: משתמש שלוחץ "אשר תשלום" עם הטוגל "סמן הזמנה כהושלמה" דולק יראה צעד נוסף (דיאלוג המשלוח). זה הכוונה — זה בדיוק הצעד שחסר היום.
- ה-webhook מ-WooCommerce עדיין יכול לעדכן סטטוס ישירות (זו בעיה נפרדת שדנו בה קודם — לא בתוך הסקופ הזה).
