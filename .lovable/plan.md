

# תיקון Apple Pay בתוך iframe של HYP

## הבעיה

Apple Pay לא עובד בתוך ה-iframe של דף התשלום כי חסר סקריפט חובה שנדרש לפי הדוקומנטציה של HYP (סעיף "IFRAME Implementation").

## מה כבר קיים ותקין

- קובץ אימות הדומיין של Apple (`public/.well-known/apple-developer-merchantid-domain-association`) — **קיים**.
- מאפיין `allow="payment"` על ה-iframe — **קיים**.
- HTTPS — **תקין**.

## מה חסר

לפי הדוקומנטציה של HYP, כאשר דף התשלום מוצג בתוך iframe, חובה להוסיף סקריפט של CreditGuard ל-`<head>` של האתר:

```html
<script src="https://pps.creditguard.co.il/plugins/applePayOnIframe.js"></script>
```

בלי הסקריפט הזה, Apple Pay לא יכול לתקשר מתוך ה-iframe עם ה-Apple Pay session בדפדפן.

## הפתרון

### שינוי: `index.html`

הוספת תג ה-script של `applePayOnIframe.js` ל-`<head>` של הדף.

### פעולה נדרשת מהמשתמש (בפורטל HYP)

לפי הדוקומנטציה, יש גם לוודא שהדומיין מוגדר בפורטל HYP:
1. להיכנס ל-[Merchant Console](https://pay.hyp.co.il/p/?action=login).
2. ללכת ל-**הגדרות → Apple Pay**.
3. להוסיף את הדומיין של האתר (elwejha.co.il) תחת "Apple Pay".

## קבצים שיושפעו

- **שינוי**: `index.html` — הוספת שורת script אחת ל-`<head>`.

