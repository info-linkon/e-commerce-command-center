

# שימוש בתבנית 7 של HYP עם iframe

## סיכום
במקום redirect חיצוני לדף תשלום HYP, דף התשלום ייטען בתוך iframe באתר עצמו. תבנית 7 של HYP מותאמת להטמעה ב-iframe (עיצוב מינימלי ללא header/footer של HYP).

## שינויים

### 1. `supabase/functions/hyp-create-payment/index.ts`
- שינוי פרמטר `tmp` מ-`"1"` ל-`"7"` (תבנית 7)
- הוספת פרמטר `PageLang: "HEB"` (כבר קיים)

### 2. `src/pages/web/WebCheckoutPage.tsx`
- במקום `window.location.href = hypData.payment_url` → הצגת iframe
- הוספת state `hypPaymentUrl` — כשקיים, מציג iframe במסך מלא/מודאל
- ה-iframe יקבל את ה-`payment_url` מ-HYP כ-`src`
- עיצוב: iframe בגובה מלא עם כפתור "חזור" למקרה של בעיה
- האזנה ל-`postMessage` או שימוש ב-success/error URL redirect בתוך ה-iframe (HYP מפנה ל-success URL שנגדיר — נצטרך לטפל בזה)

### 3. טיפול בחזרה מתשלום
- ה-success URL של HYP (מוגדר בפורטל) יפנה ל-`/web/order-confirmation/...`
- כשה-iframe מנווט ל-URL הזה, נזהה את זה ונפנה את הדף הראשי (parent) לדף האישור
- שימוש ב-`onLoad` event על ה-iframe לזיהוי ניווט ל-success/error URL, או הוספת script קטן ב-`WebOrderConfirmation` שעושה `window.parent.location.href = ...` אם הוא בתוך iframe

### 4. `src/pages/web/WebOrderConfirmation.tsx`
- הוספת בדיקה: אם הדף נטען בתוך iframe (`window.self !== window.top`), שולח `postMessage` ל-parent עם ה-URL או מפנה ישירות את ה-parent

## קבצים

| קובץ | שינוי |
|---|---|
| `supabase/functions/hyp-create-payment/index.ts` | `tmp: "7"` |
| `src/pages/web/WebCheckoutPage.tsx` | iframe במקום redirect + האזנה ל-postMessage |
| `src/pages/web/WebOrderConfirmation.tsx` | זיהוי iframe + הפניית parent |

