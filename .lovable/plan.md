
# הטמעת Google Analytics 4 (GA4) באתר ELWEJHA

מזהה מדידה: `G-M0ST7YDS0C`

## מטרה
הטמעה מלאה של GA4 הכוללת:
1. טעינת תגית הבסיס בכל האתר הציבורי (ולא ב-CRM).
2. מעקב Page Views אוטומטי בכל ניווט (SPA).
3. מעקב אירועי E-commerce סטנדרטיים של GA4 במקביל ל-Meta Pixel הקיים.

---

## שלב 1 — טעינת תגית הבסיס

קובץ: `index.html`
- הוספת שני ה-`<script>` של gtag לתוך ה-`<head>` (ליד Meta Pixel הקיים).
- הסקריפט נטען עם `async`, ה-`config` הראשוני עם `send_page_view: false` כדי שנשלוט ידנית ב-page views (SPA — אחרת רק העמוד הראשון נספר).

## שלב 2 — Helper מרכזי

קובץ חדש: `src/lib/gtag.ts`
- ייצוא:
  - `GA_MEASUREMENT_ID = 'G-M0ST7YDS0C'`
  - `gtag(...args)` — wrapper בטוח (בודק `window.gtag`).
  - `gaPageView(path: string)` — שולח `page_view` עם `page_path` ו-`page_location`.
  - `gaEvent(name, params)` — wrapper כללי.
  - פונקציות ייעודיות ל-E-commerce: `gaViewItem`, `gaAddToCart`, `gaRemoveFromCart`, `gaBeginCheckout`, `gaPurchase`, `gaViewItemList`, `gaSearch`.
- כולן בנויות לפי סכמת GA4 הסטנדרטית (`items[]` עם `item_id` = מק"ט מוצר, `item_name`, `price`, `quantity`, `currency: 'ILS'`).

## שלב 3 — מעקב Page Views ב-SPA

קובץ: `src/components/web/WebLayout.tsx`
- בתוך `WebLayoutInner` להוסיף `useEffect` נוסף (מקביל לקיים של `fbqPageView`) שמפעיל `gaPageView(location.pathname + location.search)` בכל שינוי `pathname`.
- כך כל ניווט פנימי באתר הציבורי נספר ב-GA4. ה-CRM (`/crm/*`) לא נוגע בזה כי הוא לא עטוף ב-WebLayout.

## שלב 4 — אירועי E-commerce

חיבור האירועים לקוד הקיים, תוך שימוש ב-`product_number` / SKU כ-`item_id` (תואם לבחירה הקודמת ב-Meta Pixel):

| אירוע GA4         | מיקום                                                       |
|-------------------|-------------------------------------------------------------|
| `view_item`       | `src/pages/web/WebProductPage.tsx` בכניסה לעמוד מוצר        |
| `view_item_list`  | `src/pages/web/WebShopPage.tsx` + `WebCategoryPage.tsx`     |
| `search`          | `src/pages/web/WebSearchPage.tsx`                            |
| `add_to_cart`     | פעולת הוספה לסל ב-`WebProductPage.tsx` (ובמקומות נוספים אם יש) |
| `remove_from_cart`| הסרת פריט ב-`src/pages/web/WebCartPage.tsx`                  |
| `begin_checkout`  | מעבר ל-`src/pages/web/WebCheckoutPage.tsx`                   |
| `purchase`        | `src/pages/web/WebOrderConfirmation.tsx` (בדומה ל-Pixel `Purchase` הקיים, עם `transaction_id` = `order_number`) |

הקריאות נעשות לצד הקריאות הקיימות ל-Meta Pixel (לא במקומן).

## שלב 5 — בידוד מה-CRM

- אין טעינת gtag ב-CRM: התגית ב-`index.html` תיטען בכל מקרה, אבל `page_view`/אירועי מסחר נשלחים רק מקוד שעטוף ב-`WebLayout`. כך CRM לא מזהם דוחות תנועה.
- אופציונלי (מומלץ): ב-`AppLayout` של ה-CRM להגדיר `window['ga-disable-G-M0ST7YDS0C'] = true` כדי למנוע איסוף מ-CRM לחלוטין.

## שלב 6 — בדיקה
- בנייה ידנית של האתר, פתיחת DevTools → Network → סינון `collect?v=2` לוודא שליחה.
- ב-GA4 → Realtime לראות כניסות ואירועי `view_item` / `add_to_cart` / `purchase`.

---

## הערות
- אין שימוש ב-Consent Mode בשלב זה (לא קיים באתר Cookie Banner). אם תרצה — נוסיף בשלב נפרד.
- מזהה המדידה `G-M0ST7YDS0C` הוא ציבורי ולכן נשאר hardcoded בקוד (אין צורך ב-secret).
- אין שינויי DB / Edge Functions.

## קבצים שישתנו/ייווצרו
- `index.html` — הוספת gtag.
- `src/lib/gtag.ts` — חדש.
- `src/components/web/WebLayout.tsx` — page views.
- `src/pages/web/WebProductPage.tsx` — `view_item` + `add_to_cart`.
- `src/pages/web/WebShopPage.tsx`, `WebCategoryPage.tsx` — `view_item_list`.
- `src/pages/web/WebSearchPage.tsx` — `search`.
- `src/pages/web/WebCartPage.tsx` — `remove_from_cart`.
- `src/pages/web/WebCheckoutPage.tsx` — `begin_checkout`.
- `src/pages/web/WebOrderConfirmation.tsx` — `purchase`.
- (אופציונלי) `src/components/layout/AppLayout.tsx` — disable flag ל-CRM.
