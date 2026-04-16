

# תוכנית תיקונים ושיפורים - Elwejha

## סקירה
רשימת תיקוני באגים ושיפורי UX מקיפה למערכת הניהול ולאתר הציבורי.

---

## שלב 1: UX/UI ותצוגה

### 1.1 סגירת תפריט צדדי אוטומטית (Side Menu)
- ב-`AppSidebar.tsx`: שימוש ב-`useSidebar()` לקריאת `toggleSidebar` + `isMobile`
- סגירה אוטומטית בלחיצה על פריט בתפריט במובייל בלבד

### 1.2 תצוגת הנחות על מוצרים
- ב-`WebProductCard.tsx`: קבלת `salePrice` (מחיר מבצע) ו-`originalPrice` (מחיר מקורי) כ-props
- הצגת מחיר מקורי מחוק + אחוז הנחה כ-badge כשיש הפרש

### 1.3 תצוגת דמי משלוח בסה"כ
- ב-`WebCartPage.tsx`: כבר מוצג shipping cost, אך הסה"כ (Total) לא כולל אותו בתצוגה הנוכחית כאשר shippingCost = 0; יש להציג תמיד שורת משלוח (גם אם 0 = "חינם")

### 1.4 ניהול סדר באנרים
- ב-`WebBannersPage.tsx`: הוספת כפתורי חצים (למעלה/למטה) או drag-and-drop לשינוי `sort_order`
- עדכון ה-DB בשינוי סדר

### 1.5 תיקון Meta Pixel ID
- ב-`meta-pixel.ts` וב-`WebProductPage.tsx`: שינוי `content_ids` לשלוח SKU במקום variation UUID
- עדכון גם באירועי AddToCart ו-ViewContent

---

## שלב 2: קופה (Checkout) ומשלוחים

### 2.1 חסימת יעדי שילוח (Geo-blocking)
- ב-`WebCheckoutPage.tsx`: הוספת רשימת מדינות/ערים חסומות (ירדן, עומאן, אירופה)
- ולידציה בשדה עיר/מדינה שמונעת התקדמות לתשלום

### 2.2 שדה כתובת חובה
- ב-`WebCheckoutPage.tsx`: שדה `address` כבר קיים עם `required` כש-delivery נבחר
- יש לוודא שגם בהזמנות מה-CRM (OrderForm) שדה הכתובת תקין

### 2.3 עריכת כמויות בקופה (Checkout)
- ב-`WebCheckoutPage.tsx`: הוספת כפתורי +/- לשינוי כמות ליד כל פריט בסיכום ההזמנה
- שימוש ב-`updateQuantity` מה-cart store

### 2.4 גלילה בקופה
- כבר קיים `max-h-60 overflow-y-auto` ברשימת הפריטים (שורה 539)
- יש להגדיל את ה-max-height למסכים קטנים ולהוסיף scrollbar styling

### 2.5 אימות תשלום במזומן (OTP)
- יצירת Edge Function `send-cash-otp` ששולחת קוד אימות ב-SMS
- הוספת שלב אימות קוד בצ'קאאוט כשנבחר תשלום במזומן
- שמירת הקוד בטבלה זמנית או ב-session

---

## שלב 3: ניהול מלאי והזמנות

### 3.1 באג סטטוס ותשלום HYP
- בדיקת ה-flow ב-`hyp-create-payment` Edge Function
- וידוא שסטטוס ההזמנה מתעדכן נכון ושהניתוב ל-HYP פועל
- תיקון מקרי קצה שבהם ההזמנה נשארת ב-`pending_payment` ללא redirect

### 3.2 סנכרון מלאי
- בדיקת ה-Edge Functions `woo-stock-update` ו-`woo-sync`
- תיקון מנגנון ה-webhook וסנכרון דו-כיווני

### 3.3 עריכת הזמנות קיימות
- ב-`OrderDetail.tsx`: הוספת אפשרות לעריכת פריטים (הוספה/הסרה/שינוי כמות)
- עדכון סה"כ ההזמנה בהתאם

### 3.4 התראות במייל
- יצירת Edge Function `order-email-notify` לשליחת סיכום הזמנה למייל ההנהלה
- הפעלה אוטומטית ביצירת הזמנה חדשה

### 3.5 סימון עסקאות כולל/לא כולל מע"מ
- כבר קיים שדה `includes_vat` בטבלת orders
- יש להוסיף תצוגה ברורה ב-OrderDetail ואפשרות לשינוי ידני

---

## שלב 4: ליקוט ודשבורד

### 4.1 באג מעבר סטטוסים
- בדיקת ה-flow בין pending → picking → shipping → completed
- תיקון ולידציות שחוסמות מעבר שגוי

### 4.2 ליקוט מארזים שלמים
- ב-`PickingChecklist.tsx`: הוספת צ'קבוקס ברמת המארז שמסמן את כל הפריטים שבו בבת אחת
- כבר קיימת תצוגת קיבוץ לפי order_item (מארז)

---

## סדר עדיפויות מומלץ
1. סנכרון מלאי (3.2) - עדיפות עליונה
2. באג HYP (3.1) - קריטי
3. באג מעבר סטטוסים (4.1)
4. Geo-blocking (2.1)
5. עריכת הזמנות (3.3)
6. אימות מזומן OTP (2.5)
7. שאר שיפורי UX

## פרטים טכניים
- **קבצים עיקריים**: AppSidebar.tsx, WebProductCard.tsx, WebCheckoutPage.tsx, WebBannersPage.tsx, OrderDetail.tsx, PickingChecklist.tsx, meta-pixel.ts
- **Edge Functions חדשות**: send-cash-otp, order-email-notify
- **מיגרציות DB**: טבלת OTP codes (אם נדרש)
- **קבצים קיימים לעדכון**: web-cart-store.ts, useOrders.ts, usePickingItems.ts

