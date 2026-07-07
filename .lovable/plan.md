## מטרה
להוסיף TikTok Pixel לאתר הציבורי במקביל ל-Meta Pixel, כולל מעקב אירועים סטנדרטי (PageView, ViewContent, AddToCart, InitiateCheckout, Purchase) ודף הגדרות בממשק הניהול.

## מה ייבנה

### 1. הזרקת סקריפט הבסיס
`index.html` — הוספת bootstrap של TikTok Pixel (`ttq`) בתוך `<head>`, ללא `sdkid` קשיח. ה-ID יטען דינמית מ-`site_content` (בדיוק כמו Meta Pixel), כדי שניתן יהיה להחליף בלי דיפלוי.

### 2. Helper library
`src/lib/tiktok-pixel.ts` חדש — מקביל ל-`meta-pixel.ts`:
- `ttq(event, data?)` — עטיפה בטוחה
- `ttqPageView()`
- מיפוי אירועים סטנדרטיים של TikTok: `ViewContent`, `AddToCart`, `InitiateCheckout`, `CompletePayment` (זה השם ב-TikTok, מקביל ל-Purchase של Meta)

### 3. אתחול ומעקב ב-WebLayout
`src/components/web/WebLayout.tsx`:
- לקרוא `useSiteSection("settings", "tiktok_pixel")` במקביל ל-Meta
- לאתחל `ttq.load(pixelId)` כשה-ID מגיע (retry pattern זהה ל-Meta)
- לשלוח `ttqPageView()` בכל שינוי route (במקביל ל-`fbqPageView` ו-`gaPageView`)
- להוסיף `<noscript>` fallback ל-TikTok

### 4. ירי אירועי מסחר
בכל מקום שכבר יורה `fbq(...)` יתווסף `ttq(...)` מקביל:
- `WebProductPage` — `ViewContent`
- `web-cart-store` / רכיב "הוסף לסל" — `AddToCart`
- `WebCheckoutPage` — `InitiateCheckout`
- `WebOrderConfirmation` — `CompletePayment` (עם value + currency=ILS + contents)

(נאתר בפועל את כל הקריאות ל-`fbq(` ונשקף את כולן.)

### 5. דף הגדרות בממשק הניהול
`src/pages/admin/TikTokPixelSettingsPage.tsx` חדש — מקביל ל-`MetaPixelSettingsPage`:
- שדה `Pixel ID` (LTR, monospace)
- שמירה ל-`site_content` תחת `page="settings"`, `section="tiktok_pixel"`
- תיבת הסבר של אילו אירועים נשלחים

הוספת route חדש `/crm/admin/tiktok-pixel` ב-`App.tsx`, וכרטיס חדש ב-`SettingsPage.tsx` ליד Meta Pixel.

## פרטים טכניים

- אין צורך במפתח סודי או Edge Function — פיקסל של TikTok הוא client-side בלבד (בדומה ל-Meta Pixel), כך שה-ID נשמר ב-`site_content` הפומבי (אותה גישה כמו Meta).
- לא נוגעים באירועי GA4/Meta הקיימים, רק מוסיפים במקביל.
- אין שינוי ב-DB / migrations — משתמשים בטבלת `site_content` הקיימת עם `section` חדש.
- ה-Pixel ID `D95OKQJC77UCQSPIQSFG` מהדוגמה יוזן ידנית ע"י המשתמש בדף ההגדרות אחרי הפריסה (או ניתן לשמור אותו כברירת מחדל ראשונית — אשאל בהמשך אם רלוונטי).
- Advanced Matching / Events API (server-side) — לא נכלל בשלב זה; אפשר להוסיף בהמשך כ-Edge Function אם תרצה מעקב מדויק יותר עם iOS14+.

## מה לא בתוכנית
- Events API של TikTok (server-side deduplication) — דורש Access Token ו-Edge Function; מציע כשלב הבא.
- Catalog / Product Feed ל-TikTok — לא ביקשת, אפשר להוסיף בנפרד.
