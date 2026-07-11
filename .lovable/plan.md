## סקירה
שיפורים ותיקונים במערכת המוצרים, המארזים, הדוחות ועריכת קטגוריה.

---

### 1. מוצרים קשורים (Related Products)
- **DB**: טבלה חדשה `related_products` (product_id, related_product_id, sort_order, created_by). GRANTs + RLS (קריאה פומבית, כתיבה למחוברים).
- **Hook**: `useRelatedProducts.ts` — get/add/remove/reorder.
- **CRM**: טאב/סקשן חדש בטופס עריכת המוצר (`ProductForm.tsx`) — חיפוש והוספה ידנית של מוצרים קשורים, גרירה לשינוי סדר, הסרה.
- **Web**: קומפוננטה `RelatedProductsSection` בעמוד המוצר (`WebProductPage.tsx`) — סליידר בסגנון `ExclusiveDealsSlider`. אם אין קשורים — לא מציג כלום.

### 2. תמונות לוריאציות במארזים
- הוספת שדה `image_url` לטבלה `bundle_variations` (migration).
- ב-`BundleVariationsManager.tsx`: העלאת תמונה לוריאציית מארז (אותו זרימת העלאה+WebP כמו בוריאציות מוצר).
- הצגת התמונה ב-`WebProductPage` כשמוצגת הוריאציה שנבחרה במארז.

### 3. ביצועים למארזים (כמו בפריטים)
- דף חדש `BundlePerformancePage.tsx` המקביל ל-`ProductPerformancePage`: כמויות שנמכרו, הכנסות, רווח, לפי טווח תאריכים.
- קישור מדף רשימת המארזים (`BundlesPage.tsx`) — כפתור/אייקן "ביצועים" לכל מארז.
- מקור נתונים: `order_items` בהם `bundle_id` (או `bundle_variation_id`) מלאים.

### 4. ביצועי הפריטים שיכללו גם מכירות דרך מארזים
- ב-`ProductPerformancePage`: הרחבת החישוב כך שלכל וריאציה שנמכרה כחלק ממארז (`bundle_variation_items` שמפנה לוריאציה) — יתווספו הכמויות המתאימות לפי המכירות של אותו מארז.
- נוסחה: לכל שורת order_item של מארז → מכפילים את הכמות בכמות של הוריאציה בתוך הרכב המארז.
- מציג בעמוד הפריט תיוג "כולל מכירות במארזים".

### 5. מחיר מבצע (Original Price / Sale Price display)
- **DB**: עמודה חדשה `compare_at_price NUMERIC` לטבלת `products` וגם ל-`product_variations`.
- **CRM**: שדה "מחיר לפני מבצע" ב-`ProductForm` וב-`VariationsManager`. אופציונלי (null = בלי מבצע).
- **Web**: ב-`WebProductCard` וב-`WebProductPage` — אם `compare_at_price > sale_price` מציגים את המחיר המקורי עם קו חוצה (line-through), את מחיר המכירה בבולט, ותגית "מבצע"/הפרש באחוזים.

### 6. תיקון עריכת קטגוריה — שמירת ערכים קיימים
- ב-`CategoryDialog.tsx`: וידוא שאת ה-`useState` מאתחלים מ-`category` הקיים (name, display_order, image_url) גם ב-`useEffect` שרץ בכל פתיחה.
- שמירת ה-image_url הקיים אם המשתמש לא העלה חדש (במקום להפוך ל-null).

### 7. תיקון עלות בדוחות רווחיות
- ב-`ProfitabilityTab.tsx` (וכל hook רלוונטי): במקום להסתמך על `order_items.cost` (שיכול להיות 0), לעשות JOIN ל-`product_variations` ולקחת `cost_price` נוכחי.
- אם `order_items` הוא של מארז — לחשב עלות כסכום עלויות הרכיבים (variation.cost_price × qty בהרכב) × qty נמכר.
- מע"מ: לוודא שהחישוב `net = revenue/1.17 - cost` תקין ואחיד.

### 8. עלות מארז אוטומטית מהפריטים
- שדה `cost_price` במארז יישאר לשמירה ידנית (למקרים כמו חומרי אריזה נוספים).
- **חדש**: מציגים "עלות מחושבת מהרכיבים" ליד השדה — סכום `variation.cost_price × quantity` של כל הרכיבים.
- כפתור "עדכן לפי חישוב" שמעתיק את הערך המחושב לשדה הידני.
- בדוחות רווחיות של מארזים: משתמשים ב-`cost_price` הידני אם קיים, אחרת בחישוב האוטומטי.

---

### שלבי יישום מוצעים (סדר)
1. Migration אחד עבור: `related_products`, `bundle_variations.image_url`, `products.compare_at_price`, `product_variations.compare_at_price`.
2. תיקון `CategoryDialog` (בעיה קטנה, מהיר).
3. מחיר מבצע (DB→CRM→Web).
4. מוצרים קשורים (DB→hook→CRM→Web).
5. תמונות לוריאציות במארזים.
6. עלות מארז אוטומטית + תיקון דוח רווחיות.
7. ביצועי מארזים + ביצועי פריטים כולל מארזים.

### הערות טכניות
- כל שינוי DB בעל GRANTs + RLS נכונים.
- לא נוגעים ב-`src/integrations/supabase/types.ts` ידנית — יתעדכן אוטומטית לאחר migration.
- לא משנים סכימת `auth`/`storage`.
- שומרים על RTL, ערבית ראשית, Cairo font.
