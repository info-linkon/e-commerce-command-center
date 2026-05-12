## מטרה

1. לוודא שאירוע **Purchase** של Meta Pixel נורה בכל סיום הזמנה (כרגע רק PageView/ViewContent/AddToCart מופיעים).
2. ב-Product Feed וב-pixel events – ה-`item_group_id` (מזהה הקבוצה במטה) יהיה ה-**SKU של המוצר** במקום `product_number`.

---

## ניתוח (קצר)

**Purchase לא מופיע** – יש כמה כשלים אפשריים שמסבירים את התופעה:
- אירוע ה-Purchase נורה רק אחרי `await fetchOrderSummary` שדורש `access_token` מ-`sessionStorage`. אם המשתמש חזר מ-HYP בטאב/חלון אחר, או שמסך ה-iframe נשבר ל-top window בנסיבות מסוימות, ה-token חסר → הקריאה ל-`order-summary` נכשלת (401), ועל אף שהקוד עדיין יורה fbq, הוא רץ אחרי המתנה ארוכה ולעיתים אחרי שהמשתמש כבר עזב את הדף.
- ה-Pixel init רץ ב-`WebLayout` עם retry של עד 10 שניות. בזרימת `status=ok` ה-Purchase יורה לעיתים לפני שה-init הסתיים, ולמרות שהוא נכנס לתור – הוא מאוחר/לא נספר אם הדף נסגר.
- אין fallback: אם `order-summary` נכשל, אין "Purchase מינימלי" שנורה מיד עם הנתונים שכבר ידועים (orderNumber + amount מה-URL).

**SKU כ-item_group_id** – כיום ב-feed:
- `g:item_group_id` = `product_number` (מספרי).
- ב-pixel events `content_ids` כבר משתמשים ב-SKU (טוב), אבל אין שדה ייעודי לקבוצה.

---

## תוכנית

### 1. תיקון אירוע Purchase

`src/pages/web/WebOrderConfirmation.tsx`:
- לפני `await fetchOrderSummary`, לירות **Purchase מיידי** עם הנתונים הזמינים (orderNumber + Amount מה-URL כ-`value`, `currency: "ILS"`). זה מבטיח שה-event יירשם תמיד.
- אחרי שה-summary חוזר עם פירוט פריטים – לא לירות שוב (כפילות). העשרה מלאה (contents/SKUs) תיעשה רק אם ה-summary מצליח, ובמקרה זה ה-Purchase המיידי כבר הספיק.
- חלופה ניקיה יותר: להמתין ל-summary רק עד 1.5 שניות (Promise.race עם timeout). אם הספיק – לירות עם פירוט; אם לא – לירות מיד עם המינימום.

`src/lib/meta-pixel.ts`:
- להוסיף לוג מינימלי (`console.debug`) כשאירוע נורה לפני init – יעזור לאבחן בעתיד.
- לוודא שה-fallback init מסתיים גם בדף /order-confirmation (כבר קיים, רק לוודא שה-`pixel_id` נטען).

### 2. SKU כ-item_group_id

`supabase/functions/meta-product-feed/index.ts`:
- `groupId = p.sku || String(p.product_number)` (במקום רק `product_number`).
- כך כל הוריאציות של מוצר יקובצו ב-Catalog לפי ה-SKU של ה-Parent.

`src/pages/web/WebProductPage.tsx` ו-`src/pages/web/WebCheckoutPage.tsx` ו-`WebOrderConfirmation.tsx`:
- להוסיף לאירועי Pixel את `content_group_id` עם ה-parent SKU (כשרלוונטי), כדי שגם דיווחי הפיקסל יתאימו ל-Catalog.

---

## קבצים שישונו

- `src/pages/web/WebOrderConfirmation.tsx` – ירייה מיידית של Purchase.
- `src/lib/meta-pixel.ts` – לוג אבחון.
- `supabase/functions/meta-product-feed/index.ts` – `item_group_id` = SKU.
- `src/pages/web/WebProductPage.tsx`, `WebCheckoutPage.tsx` – הוספת `content_group_id` כש־SKU של ההורה זמין.

לא נוגע בלוגיקת תשלום/HYP/DB.
