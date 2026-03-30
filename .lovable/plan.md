

# שיפור רספונסיביות מלאה למובייל

## סיכום
סריקת כל דפי האתר הציבורי ותיקון בעיות רספונסיביות: הדר, הירו, קטגוריות, כרטיסי מוצרים, דף מוצר, סל קניות, צ'קאאוט, פוטר, דף אודות ודף צור קשר.

## שינויים לפי קובץ

### 1. `WebHeader.tsx`
- הקטנת לוגו במובייל: `w-16 h-16 md:w-24 md:h-24`
- הקטנת גובה הדר: `h-16 md:h-24`
- הקטנת שם המותג: `text-lg md:text-2xl`
- הוספת `gap-0.5` בין אייקוני הפעולות במובייל

### 2. `WebHome.tsx`
- Hero: הקטנת `min-h` במובייל ל-`min-h-[350px]`, טקסט כותרת `text-2xl`, תת-כותרת `text-xl`
- Hero CTA: כפתורים `w-full sm:w-auto` בטלפון
- Features strip: מובייל `grid-cols-1` עם layout אופקי קומפקטי, הסתרת description
- קטגוריות: `grid-cols-2` עם `gap-3` במובייל, כותרת `text-base`
- מוצרים: `gap-3` במובייל, padding מצומצם

### 3. `WebProductCard.tsx`
- padding מצומצם במובייל: `p-3 md:p-4`
- מחיר וכפתור: `text-base md:text-lg`
- שם מוצר: `text-xs md:text-sm`

### 4. `WebProductPage.tsx`
- גלריה thumbnails: `grid-cols-4` במובייל במקום 5
- כפתור "הוסף לסלة" `w-full` במובייל (לא flex-1)
- quantity + button: `flex-col` במובייל, `flex-row` בדסקטופ
- padding מצומצם: `py-6 md:py-12`

### 5. `WebCartPage.tsx`
- סיכום הזמנה: להסיר `sticky` במובייל (כדי שלא יסתיר תוכן)
- תמונת פריט: `w-16 h-16 md:w-20 md:h-20`

### 6. `WebCheckoutPage.tsx`
- Layout: `grid-cols-1` בכל המצבים, סיכום הזמנה למטה
- inputs: גודל מתאים לטאצ' (כבר בסדר)

### 7. `WebFooter.tsx`
- מובייל: `grid-cols-2` במקום `grid-cols-1` לקישורים וקטגוריות
- padding מצומצם

### 8. `WebAboutPage.tsx`
- Hero: `h-[250px] md:h-[450px]`, כותרת `text-3xl md:text-5xl`
- Story image: `aspect-[4/3]` במובייל במקום square
- Stats: padding מצומצם, טקסט `text-2xl md:text-4xl`
- Values cards: תמונה `h-40 md:h-48`

### 9. `WebContactPage.tsx`
- Hero: padding `py-10 md:py-16`
- Form + info: כבר `grid-cols-1` במובייל, בסדר

### 10. `WebShopPage.tsx`
- Filter chips: scrollable אופקי עם `overflow-x-auto flex-nowrap` במובייל
- כותרת: `text-2xl md:text-3xl`

### 11. `WebLayout.tsx`
- WhatsApp button: `bottom-4 left-4` + `w-12 h-12` במובייל

## קבצים

| קובץ | שינוי |
|---|---|
| `src/components/web/WebHeader.tsx` | לוגו + גובה הדר רספונסיבי |
| `src/pages/web/WebHome.tsx` | Hero, features, grids מותאמים |
| `src/components/web/WebProductCard.tsx` | padding + font sizes |
| `src/pages/web/WebProductPage.tsx` | gallery + CTA layout |
| `src/pages/web/WebCartPage.tsx` | sticky fix + image sizes |
| `src/pages/web/WebCheckoutPage.tsx` | layout adjustments |
| `src/components/web/WebFooter.tsx` | grid cols במובייל |
| `src/pages/web/WebAboutPage.tsx` | hero + sections sizing |
| `src/pages/web/WebShopPage.tsx` | scrollable chips |
| `src/components/web/WebLayout.tsx` | WhatsApp button size |

