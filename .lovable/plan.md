

# הוספת הגדרות אמצעי תשלום באתר

## סיכום
דף הגדרות חדש לבחירת אמצעי תשלום זמינים באתר (מזומן + אשראי HYP). ההגדרות נשמרות ב-`site_content` ומשפיעות על דף הצ'קאאוט — הלקוח בוחר אמצעי תשלום, ולפי הבחירה או שמופנה ל-HYP או שההזמנה נוצרת כ-"מזומן בעת מסירה".

## לוגיקה

- הגדרות נשמרות ב-`site_content` (page=`settings`, section=`payment_methods`)
- מבנה: `{ cash: { enabled: true, label: "الدفع عند الاستلام" }, credit: { enabled: true, label: "بطاقة ائتمان" } }`
- בצ'קאאוט: שליפת ההגדרות → הצגת radio buttons לבחירת אמצעי תשלום
- מזומן: הזמנה נוצרת עם `status: "pending"` + `payment_method: "cash"` (ללא HYP)
- אשראי: התנהגות נוכחית — `status: "pending_payment"` + redirect ל-HYP

## שינויים

### 1. `src/pages/admin/PaymentMethodsSettingsPage.tsx` — דף חדש
- Switch להפעלת/כיבוי כל אמצעי (מזומן, אשראי)
- שמירה ב-`site_content`
- לינק מדף ההגדרות הראשי

### 2. `src/pages/SettingsPage.tsx` — הוספת כרטיס "אמצעי תשלום באתר"

### 3. `src/App.tsx` — route חדש `/admin/payment-methods`

### 4. `src/pages/web/WebCheckoutPage.tsx` — בחירת אמצעי תשלום
- שליפת הגדרות מ-`site_content`
- הצגת radio buttons (מזומן / אשראי) לפי מה שמופעל
- אם רק אמצעי אחד מופעל — לא מציג בחירה, פשוט משתמש בו
- מזומן: יוצר הזמנה עם `status: "pending"`, `payment_method: "cash"` → redirect ישיר לדף אישור
- אשראי: התנהגות נוכחית (HYP redirect)

## קבצים

| קובץ | שינוי |
|---|---|
| `src/pages/admin/PaymentMethodsSettingsPage.tsx` | חדש — הגדרות אמצעי תשלום |
| `src/pages/SettingsPage.tsx` | כרטיס חדש |
| `src/App.tsx` | route חדש |
| `src/pages/web/WebCheckoutPage.tsx` | בחירת אמצעי תשלום + לוגיקת מזומן |

