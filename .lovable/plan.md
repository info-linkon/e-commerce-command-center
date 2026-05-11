# סבב 2 — תיקונים נותרים

## 1. Meta Pixel — אירוע Purchase + מקטים

**הבעיה:** אירוע `Purchase` לא נורה כי `order-summary` לא מחזיר items ל-pixel, ו-`content_ids` משתמש במספר הזמנה במקום מק"ט.

### שינויים
- **`supabase/functions/order-summary/index.ts`** — להוסיף `sku` בכל item שמוחזר (גם variation וגם bundle_variation). זה ציבורי בלי חשיפת מידע רגיש.
- **`src/pages/web/WebOrderConfirmation.tsx`** — `firePurchasePixel` יקבל את ה-items מהsummary, יבנה `content_ids` ממקטים, `contents: [{id: sku, quantity}]`, `num_items`, `value`, `currency`. נוודא שהפונקציה אכן רצה גם במסלול הצלחה רגיל וגם בפלואו verify fallback (היום ב-fallback היא לא נקראת אחרי הצלחה).
- **`src/pages/web/WebProductPage.tsx`** ו-**`src/pages/web/WebCheckoutPage.tsx`** — להחליף את ה-`content_ids` שמשתמשים ב-product_number/order_number ב-SKU של ה-variation. אם אין SKU — fallback ל-product_number.
- **`src/lib/meta-pixel.ts`** — להרחיב טיפוס ולתעד שדות מומלצים (contents/content_type=product).

## 2. שפה בכתובת — prefix `/he`

**הבעיה:** החלפת שפה לא משנה את ה-URL, לא ניתן לשתף לינק עברי ויש מקומות שלא תורגמו.

### שינויים
- **`src/hooks/useLanguage.tsx`** — לקרוא את השפה מ-`location.pathname` (`/he` prefix → `he`, אחרת `ar`). `toggleLang` יבצע `navigate` לאותו נתיב עם/בלי `/he`. שמירה ב-localStorage נשארת רק כ-fallback ראשוני.
- **`src/App.tsx`** — להוסיף עץ ראוטים מקביל תחת `/he` שמצביע לאותם דפים תחת `<WebLayout />`. הראוטים הציבוריים בלבד (home/shop/category/product/cart/checkout/order-confirmation/order/search/about/contact). CRM ו-`/inv`,`/pay` נשארים בלי prefix.
- **`src/components/web/WebLayout.tsx`** וכל קומפוננטה שמשתמשת ב-`Link`/`navigate` בנתיבים ציבוריים — להוסיף helper `webPath(path)` שמחזיר `/he/...` כשהשפה היא he. לרכז את זה ב-`useLanguage` כ-`localizedPath()`.
- **שיתוף/SEO**: `meta-tags` Edge Function ו-`sitemap`/feeds — להוסיף לינק עברי כאלטרנטיבה (`<link rel="alternate" hreflang="he" />`).
- **תרגומים חסרים**: לסרוק את `WebLayout`, פוטר, `WebHome`, `WebShopPage`, `WebCheckoutPage` על מחרוזות hardcoded ולהעביר ל-`t(ar, he)`. סבב מיקוד על המקומות שהמשתמש סימן בתמונה (יזוהו בהרצה).

## 3. תבנית SMS — `invoice_issued`

הטריגר נוסף בסבב הקודם ל-enum, אך אין תבנית UI ניהולית.

### שינויים
- **`src/pages/admin/SmsTemplatesPage.tsx`** — להוסיף את `invoice_issued` לרשימת הטריגרים עם תיאור: "נשלח כשהונפקה חשבונית/קבלה אוטומטית". משתנים זמינים: `{order_number}`, `{customer_name}`, `{invoice_url}`, `{total}`.
- **Migration נתונים** — INSERT תבנית ברירת מחדל אחת (ערבית) אם לא קיימת.

## הערות טכניות
- שינוי ה-prefix העברי הוא הכי רחב — עלול לגעת ב-15-25 קבצים. נוסיף helper מרכזי כדי למזער שינויים ולשמור על עקביות.
- אחרי השינויים נריץ build ונאמת ב-preview שניתן לשתף `/he/product/123` ושאירוע Purchase נורה עם content_ids נכונים.
