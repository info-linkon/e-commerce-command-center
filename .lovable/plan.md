תוכנית לטיפול ב-6 הנושאים שהעלית, מאוחדים לפי הקבצים שמושפעים.

---

## 1) התראות מלאי נמוך — מצטבר על כל המחסנים

**קובץ:** `src/components/dashboard/LowStockAlerts.tsx`

כיום הקואירי שולף שורות `inventory` בודדות (לפי מחסן). נחליף לגישה שמסכמת לפי variation:
- שליפת כל ה-`inventory` עם variation+product
- קיבוץ ב-JS לפי `variation_id` וסיכום הכמויות
- סינון לכאלה ש-`sum ≤ 5` (סף קבוע כמו היום)
- מיון עולה, top 5

יוצג שם המוצר + הוריאציה + סה"כ כמות (בלי שם מחסן, כי זה מצטבר).

---

## 2) רווחיות — מע"מ ועלות מוצרים

**קובץ:** `src/components/reports/ProfitabilityTab.tsx`

נטפל בכמה דברים יחד:

**א. מע"מ מנוכה מהכנסות לפני חישוב הרווח:**
- כל הזמנה שומרת `includes_vat` (ברירת מחדל true) ושיעור מע"מ קבוע 17%.
- ההכנסה הנטו לחישוב רווחיות = `total_price / 1.17` כשההזמנה כוללת מע"מ.
- נשאיר את ה-`cost_price` כפי שהוא (כבר ללא מע"מ לפי [Financial Tracking](mem://features/financial-tracking)).

**ב. עמודות חדשות בקלפי הסיכום (6 → 7):**
- הכנסות ברוטו, מע"מ, הכנסות נטו, עלות סחורה, הוצאות תפעוליות, רווח גולמי, רווח נקי, % רווחיות.

**ג. עלות מארז (קשור גם לסעיף 4):**
- היום `cost_price` נשלף מ-`product_variations` של ה-variation שנמכר. במארזים יש default variation עם `cost_price=0`, מה שמייצר רווחיות מזויפת.
- שליפת ה-items תכלול גם `bundle_variation_id` ואת רכיביו (`bundle_variation_items → product_variations.cost_price`).
- אם `bundle_variation_id` קיים, העלות = sum(quantity × cost_price) של כל הרכיבים, כפול הכמות שנמכרה.

**ד. ציר תאריכים ברווחיות לפי תאריך:**
- היום הקוד עושה `toLocaleDateString("he-IL")` ובונה אובייקט; הסדר נשבר כי המפתחות הם מחרוזות בעברית.
- נשמור גם `dateKey` (ISO `YYYY-MM-DD`) למיון, ונציג `dateLabel` בפורמט עברי. נמיין `byDate` לפי `dateKey` עולה לפני העברה ל-Recharts.

---

## 3) עלות מארז במקומות נוספים

החישוב המתוקן ב-#2ג ישפיע על דוח הרווחיות. נבדוק מהר גם:
- `src/components/dashboard/StatsCards.tsx` — אם מציג רווח, להחיל אותה לוגיקה.
- `src/components/reports/SalesTab.tsx` — אם מציג עלות, להחיל אותה לוגיקה.

(אם השדות לא קיימים שם — לא נוגעים.)

---

## 4) סטטוס חדש "נמסר" (delivered) לפני "הושלמה"

זרימה חדשה: `pending → processing → picking → shipping → delivered → completed`.

**מסד נתונים (migration):**
- `ALTER TYPE order_status ADD VALUE 'delivered' BEFORE 'completed'`.
- אם נחסם בגלל enum reorder — נוסיף בסוף, ונסתמך על סדר UI.

**טריגר חשבונית אוטומטית:**
- מעבר ל-`delivered` יבצע את כל מה שהיום קורה ב-`completed`: הנפקת חשבונית (Ezcount), שליחת SMS `invoice_issued`, ועדכון Woo.
- מעבר ל-`completed` יישאר סגירה פיננסית סופית (קופה דחויה, כו'). 
- בפועל: ב-`useUpdateOrderStatus` כאשר `status === 'delivered'` נקרא ל-`ezcount-doc` ול-`order-sms-trigger` עם `delivered`.
- ב-`CompleteOrderDialog` נציע "סמן כנמסר + הנפק חשבונית" במקום ישר ל-completed; השלמה סופית תהפוך לכפתור נפרד.

**SMS template חדש:** `order_delivered` (טריגר חדש ב-enum `sms_templates.trigger`). המשתמש יוכל ליצור בעצמו דרך מסך התבניות.

**שילוב עם אפליקציית שליחים:**
- כן אפשר. דרך פתוחה: webhook ייעודי `delivery-webhook` שמקבל `tracking_number` או `order_number` + `status=delivered` ומבצע את