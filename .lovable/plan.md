

# תיקונים — 4 נקודות

## 1. מארזים לא מופיעים באתר
**סיבה:** כל המארזים מסומנים `is_published = false`. השאילתה ב-`useWebProducts` מסננת רק `is_published = true`.
**פתרון:** אין באג בקוד — צריך לוודא שהמארזים מסומנים כמפורסמים. אבל גם כדאי לוודא שהם מופיעים ברשימת הפריטים (ProductsPage) כדי לערוך אותם.

**בעיה נוספת:** ב-`ProductsPage` (שורות 36-44) מסננים החוצה את ה-`bundleProductIds` מהרשימה — כלומר מוצרים שהם מארזים מוסתרים מדף הפריטים. זה בכוונה (כי יש דף מארזים נפרד), אבל צריך לוודא שמדף המארזים (`BundlesPage`) אפשר לשנות `is_published`.

**פתרון:** להוסיף בדף המארזים עמודה/אפשרות לשנות `is_published` + badge שמראה סטטוס פרסום. גם לוודא שב-`BundleForm` יש שדה "פורסם באתר".

## 2. מחיקת מוצרים עדיין נכשלת
**סיבה:** ה-cascading delete ב-`useDeleteProduct` לא מטפל ב-`order_items` ו-`inventory_log` שגם הם מקושרים ב-FK ל-`product_variations`.

**פתרון:** ב-`src/hooks/useProducts.ts`, להוסיף לפני מחיקת `product_variations`:
- `order_items` — לא ניתן למחוק פריטי הזמנות (נתונים עסקיים). במקום זה, ננתק את ה-FK או נעדכן ל-NULL. אבל מכיוון ש-`variation_id` הוא NOT NULL, הפתרון הנכון הוא **לשנות את ה-FK constraint ל-ON DELETE SET NULL** במיגרציה, או לחילופין — למחוק את ה-FK constraint ולהשאיר את ה-order_items כמו שהם.
- `inventory_log` — אותו דבר.

**הגישה:** מיגרציית DB שמשנה את ה-FK constraints של `order_items.variation_id` ו-`inventory_log.variation_id` ל-`ON DELETE SET NULL` (אחרי שנהפוך אותם ל-nullable).

## 3. באנרים — שדות עבריים
**סיבה:** טבלת `banners` מכילה רק `title` ו-`subtitle`, אין שדות `title_he` / `subtitle_he`.

**פתרון:**
- מיגרציית DB: הוספת `title_he TEXT`, `subtitle_he TEXT` לטבלת `banners`
- `WebBannersPage.tsx`: הוספת שדות "כותרת בעברית" ו"תת כותרת בעברית" בטופס
- `BannerSlider.tsx`: הצגת הטקסט לפי השפה הנבחרת

## 4. וריאציות מארז — שם בעברית
**סיבה:** טבלת `bundle_variations` מכילה רק `name`, אין `name_he`.

**פתרון:**
- מיגרציית DB: הוספת `name_he TEXT` לטבלת `bundle_variations`
- `BundleVariationsManager.tsx`: הוספת שדה "שם בעברית" בדיאלוג הוריאציה
- `WebProductPage.tsx`: הצגת שם הוריאציה לפי שפה

## מיגרציית DB
```sql
-- Banner Hebrew fields
ALTER TABLE banners ADD COLUMN title_he TEXT;
ALTER TABLE banners ADD COLUMN subtitle_he TEXT;

-- Bundle variation Hebrew name
ALTER TABLE bundle_variations ADD COLUMN name_he TEXT;

-- Allow deletion of products that have order history
ALTER TABLE order_items ALTER COLUMN variation_id DROP NOT NULL;
ALTER TABLE order_items DROP CONSTRAINT order_items_variation_id_fkey;
ALTER TABLE order_items ADD CONSTRAINT order_items_variation_id_fkey 
  FOREIGN KEY (variation_id) REFERENCES product_variations(id) ON DELETE SET NULL;

ALTER TABLE inventory_log ALTER COLUMN variation_id DROP NOT NULL;
ALTER TABLE inventory_log DROP CONSTRAINT inventory_log_variation_id_fkey;
ALTER TABLE inventory_log ADD CONSTRAINT inventory_log_variation_id_fkey 
  FOREIGN KEY (variation_id) REFERENCES product_variations(id) ON DELETE SET NULL;
```

## קבצים לעדכון
1. **`src/pages/admin/WebBannersPage.tsx`** — שדות `title_he`, `subtitle_he` בטופס
2. **`src/components/web/BannerSlider.tsx`** — הצגה לפי שפה
3. **`src/components/inventory/BundleVariationsManager.tsx`** — שדה `name_he` בדיאלוג
4. **`src/hooks/useBundleVariations.ts`** — שליחת `name_he` ב-create/update
5. **`src/pages/web/WebProductPage.tsx`** — הצגת שם וריאציית מארז לפי שפה
6. **`src/hooks/useProducts.ts`** — הסרת הטיפול הידני ב-`order_items`/`inventory_log` (ה-DB יטפל ב-SET NULL)
7. **`src/pages/inventory/BundlesPage.tsx`** — הוספת badge פרסום + כפתור toggle

