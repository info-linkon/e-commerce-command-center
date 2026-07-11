## قسم "صفقات حصرية / מבצעים מיוחדים"

### מיקום
בעמוד הבית (`WebHome.tsx`), **מעל** קטע "الأكثر مبيعاً" ומתחת ל"منتجات مميزة".

### תצוגה (סליידר מוצרים)
- דסקטופ: 4 מוצרים גלויים
- טאבלט: 3
- מובייל: 1.5–2 מוצרים (peek) עם החלקה חופשית
- מבוסס על רכיב `Carousel` (embla) הקיים בפרויקט – אותו סגנון של הבאנרים
- חצי ניווט בדסקטופ, גרירה במובייל
- כותרת דו־לשונית: صفقات حصرية / מבצעים מיוחדים + באדג' זהב "🔥"
- כרטיס מוצר: `WebProductCard` הקיים (בלי לשנות עיצוב הכרטיס עצמו)
- אם אין מוצרים מוגדרים – הקטע לא נטען כלל

### ניהול מהאדמין
דף חדש ב־CRM: **`/crm/admin/exclusive-deals`**
- קישור מ־Sidebar תחת "אדמין / הגדרות אתר"
- טבלה של מוצרים שסומנו כ"מבצע חצרי"
- כפתור "הוסף מוצר" → דיאלוג חיפוש מוצרים (לפי שם/SKU) → בחירה
- אפשרות סידור בגרירה (sort_order)
- כפתור הסרה מהקטע
- טוגל active לכל שורה (הצג/הסתר בלי למחוק)

### מבנה נתונים
טבלה חדשה **`exclusive_deals`**:
```
id            uuid PK
product_id    uuid → products(id) ON DELETE CASCADE (unique)
sort_order    int  default 0
active        bool default true
created_at    timestamptz
created_by    uuid
```
- GRANT SELECT ל־anon+authenticated, ALL ל־service_role
- RLS: קריאה פומבית לכולם; כתיבה רק ל־authenticated (בהתאמה לדפוסים הקיימים במיזם, ראה `banners`).

### קבצים חדשים
1. `src/hooks/useExclusiveDeals.ts` – `useExclusiveDealsPublic()`, `useExclusiveDealsAdmin()`, `useAddExclusiveDeal()`, `useRemoveExclusiveDeal()`, `useReorderExclusiveDeals()`, `useToggleExclusiveDeal()`
2. `src/components/web/ExclusiveDealsSlider.tsx` – הסליידר בעמוד הבית
3. `src/pages/admin/ExclusiveDealsPage.tsx` – ניהול

### קבצים לעריכה
- `src/pages/web/WebHome.tsx` – הוספת `<ExclusiveDealsSlider />` מעל "الأكثر مبيعاً"
- `src/App.tsx` – route ל־`/crm/admin/exclusive-deals`
- `src/components/layout/AppSidebar.tsx` – פריט תפריט חדש
- `supabase/migrations/*` – יצירת הטבלה + GRANTs + RLS

### שאילתת המוצרים
דומה ל־`useWebBestSellers`/`useWebProducts`: JOIN עם `products` + `categories!products_category_id_fkey(name, name_he)` + חישוב `outOfStock`. סינון: `active=true` + מוצר `active=true` + לא מוסתר.

### הבהרות שאני מניח (אשנה אם תרצה אחרת):
- אין מחיר "לפני מבצע" נפרד – משתמשים ב־`sale_price` הקיים של המוצר כמו בכל שאר הקטעים (אין שדה חדש של אחוז הנחה).
- אין תאריך תפוגה אוטומטי – הכל ידני דרך active/הסרה.
- הקטע מוצג רק אם יש לפחות מוצר אחד פעיל.
