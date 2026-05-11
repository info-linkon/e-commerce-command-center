
## תוכנית תיקונים

### 1. דיאלוג עלות משלוח לפני "הושלמה"
- בלחיצה על "סמן כהושלמה" ב-`OrderDetail` ייפתח דיאלוג חדש `CompleteOrderDialog`:
  - שדה "עלות משלוח בפועל" (₪) — חובה, ברירת מחדל 0
  - בחירת קופה למשיכת ההוצאה (`cash_register_id`)
  - שדה הערה אופציונלי
- בעת אישור: יוצר רשומה ב-`expenses` (description: "משלוח להזמנה #N", payment_source: cash, cash_register_id, amount, created_by) ואז מעדכן את ההזמנה ל-completed.
- אם הסכום > 0 והקופה היא קופת מזומן רגילה — תופחת מהיתרה דרך הלוגיקה הקיימת ב-`useExpenses`.

### 2. הנפקת חשבונית מס/קבלה (320) אוטומטית
- ב-`useUpdateOrderStatus` (אחרי המעבר ל-completed המוצלח), אם לא קיים מסמך 320 פעיל להזמנה → קריאה ל-`ezcount-doc` עם `doc_type: "invoice_receipt"`, פרטי לקוח + items + payments מההזמנה.
- שליחה אוטומטית ללקוח: לא להעביר `dont_send_email: true` (יישלח מייל מ-EZCount). בנוסף, הוספת trigger SMS חדש `invoice_issued` עם לינק קצר `/inv/:short_code` שיישלח ללקוח (אם יש טלפון).
- שמירה: שדה `invoice_issued_manually` יישאר false (אוטומטי). הגנת כפ