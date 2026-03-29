

# תוכנית: אתר אינטרנט ציבורי + ממשק ניהול אתר

## סיכום

בניית אתר חנות ציבורי ב-`/web` (ללא צורך בהתחברות) שקורא מוצרים מאותם טבלאות קיימות (`products`, `categories`, `product_variations`) עם `is_published=true`, בתוספת ממשק ניהול תוכן, באנרים ודפים סטטיים בפאנל הניהול הקיים.

## מבנה DB חדש

### טבלאות חדשות
1. **`site_content`** — תוכן דינמי לדפי האתר (כמו ב-Alrahal)
   - `id`, `page` (text), `section` (text), `content` (jsonb), `updated_at`
   - unique constraint על `(page, section)`
   - RLS: select לכולם (public), insert/update/delete ל-authenticated

2. **`banners`** — באנרים לסליידר
   - `id`, `title`, `subtitle`, `image_url`, `link`, `sort_order`, `active`, `created_at`
   - RLS: select לכולם, manage ל-authenticated

### שינויים בטבלאות קיימות
- הוספת `slug` לטבלת `categories` (text, nullable) — לניווט URL-friendly

## קבצים חדשים — אתר ציבורי

כל דפי האתר הציבורי יהיו תחת `/web/*` ויעבדו ללא אימות.

### Layout ציבורי
- `src/components/web/WebLayout.tsx` — Header + Footer + WhatsApp float
- `src/components/web/WebHeader.tsx` — לוגו, ניווט, עגלה, חיפוש (מותאם למותג שלך — שחור/זהב)
- `src/components/web/WebFooter.tsx` — קישורים, פרטי קשר, רשתות חברתיות
- `src/components/web/WebProductCard.tsx` — כרטיס מוצר ציבורי
- `src/components/web/BannerSlider.tsx` — קרוסלת באנרים

### דפי חנות
- `src/pages/web/WebHome.tsx` — דף ראשי: hero, באנרים, קטגוריות, מוצרים מומלצים, CTA
- `src/pages/web/WebCategoryPage.tsx` — תצוגת מוצרים בקטגוריה עם סינון ומיון
- `src/pages/web/WebProductPage.tsx` — דף מוצר בודד עם גלריה, בחירת וריאציה, הוספה לעגלה
- `src/pages/web/WebCartPage.tsx` — עגלת קניות
- `src/pages/web/WebCheckoutPage.tsx` — השלמת הזמנה (שם, טלפון, כתובת → insert to orders)
- `src/pages/web/WebSearchPage.tsx` — חיפוש מוצרים

### דפי תוכן
- `src/pages/web/WebAboutPage.tsx` — אודות (תוכן מ-site_content)
- `src/pages/web/WebContactPage.tsx` — צור קשר + טופס
- `src/pages/web/WebFAQPage.tsx` — שאלות נפוצות
- `src/pages/web/WebTrackOrderPage.tsx` — מעקב הזמנה (מספר הזמנה + טלפון)

### תשתית
- `src/lib/web-cart-store.ts` — zustand cart store (persist)
- `src/lib/web-default-content.ts` — תוכן ברירת מחדל + הגדרות שדות לעריכה (כמו Alrahal)
- `src/hooks/useWebProducts.ts` — שאילתות מוצרים ציבוריות (רק `is_published=true`, ללא auth)
- `src/hooks/useSiteContent.ts` — קריאת/כתיבת תוכן אתר
- `src/hooks/useBannersPublic.ts` — שאילתת באנרים פעילים

## קבצים חדשים — ממשק ניהול אתר

בפאנל הניהול הקיים (Protected), תחת תפריט "ניהול אתר":

- `src/pages/admin/WebContentPage.tsx` — עריכת תוכן דפים (כמו AdminContent ב-Alrahal): tabs לכל דף, עריכת כל סקשן
- `src/pages/admin/WebBannersPage.tsx` — ניהול באנרים (CRUD, העלאת תמונה, סדר, הפעלה/כיבוי)
- `src/pages/admin/WebSettingsPage.tsx` — הגדרות אתר (לוגו, שם חנות, פרטי קשר, רשתות חברתיות, משלוח, ניווט)

## שינויים בקבצים קיימים

| קובץ | שינוי |
|---|---|
| `src/App.tsx` | הוספת routes ציבוריים `/web/*` (ללא Protected) + routes ניהול אתר |
| `src/components/layout/AppSidebar.tsx` | הוספת קבוצת "ניהול אתר" בתפריט: תוכן, באנרים, הגדרות |
| `src/index.css` | הוספת CSS variables למותג האתר (gold, desert gradients) |
| מיגרציה SQL | יצירת טבלאות `site_content`, `banners`, הוספת `slug` ל-`categories` |

## עיצוב

האתר הציבורי ישתמש בצבעי המותג ELWEJHA (שחור + זהב) שכבר מוגדרים ב-CSS variables. ה-Header וה-Footer יהיו כהים (dark theme) עם זהב כצבע הדגשה. גוף האתר בהיר.

## זרימת הזמנה מהאתר

```text
לקוח בוחר מוצרים → עגלה → צ'קאאוט (שם, טלפון, כתובת) 
→ INSERT to orders (source='website', status='pending') + order_items 
→ דף אישור + לינק למעקב
```

ההזמנה נכנסת למערכת כ-pending ועוברת את אותו תהליך (שיוך מחסן → ליקוט → משלוח).

## סדר ביצוע

1. מיגרציה: `site_content`, `banners`, `slug` ל-categories
2. תשתית: hooks, cart store, default content
3. Layout ציבורי (Header, Footer)
4. דפי חנות (Home, Category, Product, Cart, Checkout)
5. דפי תוכן (About, Contact, FAQ, Track Order)
6. ממשק ניהול (Content, Banners, Settings)
7. עדכון App.tsx routes + Sidebar

