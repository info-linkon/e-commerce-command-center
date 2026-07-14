## מטרה
הוספת אפשרות "מחיר מבצע" (compare_at_price) למארזים — גם למארז הראשי וגם לכל וריאציית מארז.

## שינויים

### 1. מסד נתונים
- מיגרציה: `ALTER TABLE public.bundle_variations ADD COLUMN IF NOT EXISTS compare_at_price NUMERIC;`
- (למוצר הראשי של המארז כבר קיים `products.compare_at_price`.)

### 2. טופס המארז — `src/pages/inventory/BundleForm.tsx`
- הוספת שדה `compare_at_price` ל־state ולשמירה (על `products`).
- הצגתו ליד "מכירה" כשדה "מחיר מבצע (₪)" עם placeholder "0 = בלי מבצע".
- שמירה: `compare_at_price: form.compare_at_price > 0 ? form.compare_at_price : null`.

### 3. וריאציות מארז — `src/components/inventory/BundleVariationsManager.tsx` + `src/hooks/useBundleVariations.ts`
- הוספת שדה `compare_at_price` ל־state בדיאלוג (ליד "מחיר").
- טעינה מתוך `openEdit`/`openDuplicate`.
- העברת השדה ב־payload ל־mutations, והוספתו ל־`insert`/`update` בהוקים (null אם 0).
- הצגת המחיר המקורי מחוק ב־Badge כשקיים `compare_at_price > price`.

### 4. תצוגה בציבורי
לא נדרש שינוי — הקומפוננטות של המוצרים כבר משתמשות ב־`compare_at_price` דרך `WebProductCard`. עבור וריאציות מארז ייקרא מהוריאציה שנבחרה (כבר קורה בעמוד המוצר עבור `product_variations`; נשלים במקום שוריאציות מארז נטענות אם צריך — בהמשך אם נדרש).

## נקודות טכניות
- שם השדה זהה בכל המערכת: `compare_at_price` (הערך הגבוה, המחיר הישן/המחוק). `price`/`sale_price` = מחיר בפועל.
- לא נוגעים בסנכרון WooCommerce בשלב הזה אלא אם תבקש.