

# תיקונים ושיפורים — 5 נקודות

## 1. תמונות קטגוריות בדף המתגר (Shop) לא מתעדכנות
**בעיה:** בדף `WebShopPage.tsx` שורה 40, סדר העדיפות הפוך — קודם בודק `categoryImageMap[cat.id]` (תמונה hardcoded) ורק אח"כ `cat.image_url` (מה-DB). בדף הבית (`WebHome.tsx` שורה 186) הסדר נכון.

**תיקון:** `src/pages/web/WebShopPage.tsx` שורה 40 — להפוך את הסדר:
```typescript
const imgSrc = (cat as any).image_url || categoryImageMap[cat.id];
```

## 2. שגיאה במחיקת מוצרים (מארזים ישנים)
**בעיה:** כשמוחקים מוצר שיש לו וריאציות או מארז מקושר, ה-DB זורק שגיאת FK constraint (`product_variations_product_id_fkey`, `bundles_product_id_fkey`). הקוד הנוכחי ב-`useDeleteProduct` מוחק רק את המוצר עצמו.

**תיקון:** `src/hooks/useProducts.ts` — לעדכן את `useDeleteProduct` שימחק קודם:
1. `bundle_items` שמקושרים למארזים של המוצר
2. `bundle_variation_items` שמקושרים ל-`bundle_variations` של המארזים
3. `bundle_variations` של המארזים
4. `bundles` של המוצר
5. `product_variations` של המוצר
6. ולבסוף — המוצר עצמו

גם להוסיף אישור (confirm dialog) לפני מחיקה.

## 3. מק"ט לכל וריאציה — כבר קיים ✓
השדה כבר קיים בטופס הווריאציות.

## 4. קטגוריות ווריאציות בעברית — כבר קיים ✓
הוטמע בשיחה הקודמת.

## 5. כפתור שינוי שפה לעברית באתר
**תיקון:** הוספת כפתור toggle שפה (AR ↔ HE) ב-`WebHeader.tsx` + יצירת context לניהול שפת התצוגה + עדכון הקומפוננטות הציבוריות להציג טקסט לפי השפה הנבחרת.

### קבצים חדשים:
- `src/hooks/useLanguage.tsx` — Language context עם state (ar/he), שמור ב-localStorage

### קבצים לעדכון:
- `src/components/web/WebHeader.tsx` — כפתור AR/HE ליד האייקונים
- `src/components/web/WebLayout.tsx` — עטיפה ב-LanguageProvider, שינוי `dir` לפי שפה
- `src/components/web/WebProductCard.tsx` — הצגת `name` או `name_ar` לפי שפה
- `src/pages/web/WebHome.tsx` — הצגת תוכן CMS לפי שפה (שדות `_he`)
- `src/pages/web/WebAboutPage.tsx` — הצגת תוכן CMS לפי שפה
- `src/pages/web/WebShopPage.tsx` — תיקון תמונות + כותרות לפי שפה

## סיכום שינויים:
1. **שורה אחת** — `WebShopPage.tsx` סדר תמונות
2. **פונקציה אחת** — `useDeleteProduct` מחיקה מדורגת
3. **קובץ חדש** — `useLanguage.tsx` context
4. **~6 קבצים** — חיבור toggle שפה

