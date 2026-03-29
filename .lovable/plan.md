

# שדרוג עיצוב האתר הציבורי — בסגנון Alrahal מתקדם

## סיכום

העיצוב הנוכחי בסיסי מדי — צבעים קשיחים בקוד (hardcoded HSL), ללא אנימציות, ללא CSS utilities מתקדמים. נייבא את מערכת העיצוב של Alrahal (צבעי desert/gold/sand/warm, גרדיאנטים, אנימציות) ונשדרג את כל הרכיבים כדי שיראו מקצועיים ומודרניים, תוך שמירה על המיתוג שלך (שחור + זהב).

## שינויים

### 1. מערכת עיצוב — `src/index.css` + `tailwind.config.ts`

הוספת CSS variables חדשים לאתר הציבורי (בתוך scope `.web`):
- `--sand`, `--desert`, `--gold`, `--warm` — צבעי Alrahal מותאמים למיתוג שלך
- Utility classes: `.text-gradient-gold`, `.bg-desert-gradient`, `.bg-sand-gradient`
- Keyframes: `fade-in`, `slide-in-right` — אנימציות כניסה

ב-`tailwind.config.ts`:
- הוספת צבעים: `sand`, `desert`, `gold`, `warm` (כמו ב-Alrahal)
- הוספת אנימציות: `fade-in`, `slide-in-right`

### 2. `WebHeader.tsx` — Header מתקדם
- רקע `bg-desert` עם צל (`shadow-lg`)
- לוגו גדול יותר עם drop-shadow
- ניווט desktop עם אפקטי hover לזהב
- אייקון עגלה עם badge `bg-gold`
- תפריט מובייל עם חלוקה ברורה ואנימציה

### 3. `WebFooter.tsx` — Footer מקצועי בסגנון Alrahal
- Grid 4 עמודות: מותג + קישורים + קטגוריות + צור קשר
- אייקוני רשתות חברתיות בעיגולים זהב
- קישורי מדיניות פרטיות/תנאי שימוש
- copyright דינמי

### 4. `WebHome.tsx` — דף בית מתקדם
- **Hero section**: תמונת רקע מלאה עם gradient overlay, badge אנימטיבי, כפתורי CTA כפולים, אנימציות fade-in
- **Features strip**: `bg-card` עם אייקונים בעיגולי `bg-gold/10`
- **קטגוריות**: כרטיסים עם hover `-translate-y-1` ו-`border-gold/40`
- **מוצרים מומלצים**: רקע `bg-sand-gradient` עם כפתור "ערض הكل"
- **CTA section**: `bg-desert-gradient` עם כפתור זהב

### 5. `WebProductCard.tsx` — כרטיס מוצר בסגנון Alrahal
- אפקט hover: `shadow-xl`, `-translate-y-1`, scale על תמונה
- badge קטגוריה
- כפתור "הוסף לסלة" בעיגול `bg-primary/10`
- מחיר בצבע primary

### 6. `WebProductPage.tsx` — דף מוצר משודרג
- שימוש ב-`bg-card`, `border-border` במקום `bg-gray-*`
- כפתורי וריאציות עם `border-primary` + `bg-primary`
- כפתור הוספה `bg-gold text-gold-foreground`
- quantity selector עם borders מתאימים

### 7. `WebCartPage.tsx` — עגלה בסגנון Alrahal
- כרטיסי פריטים ב-`bg-card border-border rounded-xl`
- כפתור "מעבר לתשלום" ב-`bg-gold`
- סיכום הזמנה ב-sidebar sticky
- כפתור ריקון עגלה עם hover לdestructive

### 8. `WebCheckoutPage.tsx` — צ'קאאוט מקצועי
- שימוש ברכיבי shadcn (Input, Label, Button)
- סיכום הזמנה ב-`bg-card border-border`
- כפתור שליחה `bg-gold`

### 9. `WebShopPage.tsx` + `WebCategoryPage.tsx`
- כפתורי סינון קטגוריות: `bg-gold text-gold-foreground` כשפעיל, `bg-card` כשלא
- שלדי טעינה עם `bg-card border-border`

### 10. `BannerSlider.tsx` — קרוסלה בסגנון Alrahal
- שימוש ב-embla-carousel-autoplay (כבר מותקן)
- gradient overlay מלמטה עם כותרת ותת-כותרת
- חצי ניווט `bg-background/80`

### 11. דפי תוכן (About, FAQ, Contact, Track)
- החלפת `text-gray-*` ב-`text-foreground`, `text-muted-foreground`
- שימוש ב-`bg-card`, `border-border` לכרטיסים

### 12. `WebLayout.tsx` — הוספת WhatsApp float
- כפתור WhatsApp צף קבוע בפינה שמאלית תחתונה

## קבצים לשינוי

| קובץ | שינוי |
|---|---|
| `src/index.css` | הוספת CSS variables (sand/desert/gold/warm) + utility classes (gradients, text-gradient-gold) |
| `tailwind.config.ts` | הוספת צבעים + אנימציות (fade-in, slide-in-right) |
| `src/components/web/WebHeader.tsx` | עיצוב מחודש בסגנון Alrahal |
| `src/components/web/WebFooter.tsx` | Footer 4 עמודות מקצועי |
| `src/components/web/WebLayout.tsx` | הוספת WhatsApp float |
| `src/components/web/WebProductCard.tsx` | כרטיס מוצר מתקדם עם hover effects |
| `src/components/web/BannerSlider.tsx` | קרוסלה עם autoplay + gradient overlay |
| `src/pages/web/WebHome.tsx` | דף בית מלא: hero, features, categories, products, CTA |
| `src/pages/web/WebProductPage.tsx` | דף מוצר עם semantic colors |
| `src/pages/web/WebCartPage.tsx` | עגלה בסגנון Alrahal |
| `src/pages/web/WebCheckoutPage.tsx` | צ'קאאוט מקצועי |
| `src/pages/web/WebShopPage.tsx` | חנות עם semantic colors |
| `src/pages/web/WebCategoryPage.tsx` | קטגוריה עם semantic colors |
| `src/pages/web/WebSearchPage.tsx` | חיפוש עם semantic colors |
| `src/pages/web/WebAboutPage.tsx` | אודות עם semantic colors |
| `src/pages/web/WebContactPage.tsx` | צור קשר עם semantic colors |
| `src/pages/web/WebFAQPage.tsx` | FAQ עם semantic colors |
| `src/pages/web/WebTrackOrderPage.tsx` | מעקב הזמנה עם semantic colors |
| `src/pages/web/WebOrderConfirmation.tsx` | אישור הזמנה עם semantic colors |

## עקרון מנחה

כל `text-gray-*`, `bg-gray-*`, `border-gray-*` מוחלפים ב-semantic tokens: `text-foreground`, `text-muted-foreground`, `bg-card`, `bg-muted`, `border-border`. הצבעים הקשיחים `hsl(36,56%,51%)` מוחלפים ב-`text-gold`, `bg-gold`. זה מבטיח עקביות ותמיכה בתמות.

