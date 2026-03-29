

# שדרוג עיצוב האתר הציבורי — העתקה מדויקת מ-Alrahal

## הבעיה
האתר הנוכחי חסר Hero Section אמיתי, הפונטים לא מספיק טובים, והעיצוב הכללי לא ברמה של Alrahal.

## שינויים

### 1. פונט Cairo — `index.html` + `tailwind.config.ts` + `src/index.css`
- הוספת Google Fonts Cairo ל-`index.html`
- הוספת `fontFamily: { cairo: ["Cairo", "sans-serif"] }` ל-tailwind
- שינוי `body` ב-CSS ל-`font-cairo`

### 2. Hero Section בדף הבית — `WebHome.tsx`
העתקת המבנה המדויק מ-Alrahal Index.tsx:
- תמונת רקע מלאה עם gradient overlay (`from-[hsl(30,30%,15%)]/95`)
- Badge אנימטיבי (`bg-gold/20 text-gold`)
- כותרת עם `text-gradient-gold`
- תיאור + 2 כפתורי CTA (ראשי זהב + שני outline שקוף)
- אנימציות `animate-fade-in` עם `animationDelay`
- מתחת ל-Hero: `BannerSlider` (Carousel עם embla-carousel כמו ב-Alrahal)

### 3. BannerSlider — `BannerSlider.tsx`
שכתוב מלא בסגנון Alrahal — שימוש ב-Carousel של shadcn + embla-carousel-autoplay (כבר מותקן), במקום הקרוסלה הידנית הנוכחית.

### 4. WebHeader — כבר טוב, התאמות קלות
- הוספת `font-cairo`
- לוגו עם `drop-shadow` ו-`brightness-110`

### 5. WebFooter — כבר טוב, התאמות קלות
- הוספת `font-cairo`

### 6. WebProductCard — התאמה לסגנון Alrahal
- הוספת כפתור עגלה (`bg-primary/10 hover:bg-primary`)
- אפקט hover על תמונה (`scale-105`)

### 7. דפי תוכן — העתקה מדויקת מ-Alrahal
- **WebAboutPage**: Hero banner + Our Story + Stats + Values + FAQ + CTA (כמו AboutPage ב-Alrahal)
- **WebContactPage**: Hero banner + Contact info cards + Form (כמו ContactPage ב-Alrahal)
- **WebFAQPage**: Accordion (כמו FAQPage ב-Alrahal)
- **WebTrackOrderPage**: Icon + form + order details (כמו TrackOrderPage ב-Alrahal)

### 8. WebShopPage + WebCategoryPage
- הוספת פילטר/מיון כמו ב-Alrahal (Slider + Sort + Stock toggle)

### 9. WebProductPage
- כפתור הוספה `bg-gold text-gold-foreground hover:bg-gold/90` (כמו ב-Alrahal)

### 10. WebCartPage + WebCheckoutPage
- שימוש באותו מבנה של Alrahal

## קבצים לשינוי

| קובץ | שינוי |
|---|---|
| `index.html` | הוספת Google Fonts Cairo |
| `tailwind.config.ts` | הוספת `fontFamily: { cairo }` |
| `src/index.css` | `body` → `font-cairo` |
| `src/components/web/BannerSlider.tsx` | שכתוב — Carousel + autoplay |
| `src/components/web/WebProductCard.tsx` | כפתור עגלה + hover effects |
| `src/pages/web/WebHome.tsx` | Hero Section מלא כמו Alrahal |
| `src/pages/web/WebAboutPage.tsx` | שכתוב מלא כמו Alrahal |
| `src/pages/web/WebContactPage.tsx` | שכתוב מלא כמו Alrahal |
| `src/pages/web/WebFAQPage.tsx` | שכתוב עם Accordion |
| `src/pages/web/WebTrackOrderPage.tsx` | שכתוב כמו Alrahal |
| `src/pages/web/WebShopPage.tsx` | הוספת פילטרים |
| `src/pages/web/WebProductPage.tsx` | התאמת כפתורים |
| `src/pages/web/WebCartPage.tsx` | התאמת סגנון |
| `src/pages/web/WebCheckoutPage.tsx` | התאמת סגנון |

