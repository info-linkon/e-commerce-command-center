

# משיכת תמונות מוצרים מווקומרס ושמירה מקומית

## מצב נוכחי
- שדה `image_url` קיים במוצרים ובווריאציות — מאחסן URL חיצוני מהאתר
- אין שדה לגלריה (תמונות נוספות)
- Bucket `product-images` קיים ב-Supabase Storage

## שינויים

### 1. מיגרציה — הוספת שדה גלריה
- הוספת עמודה `gallery_images JSONB DEFAULT '[]'` לטבלת `products`
- מערך של אובייקטים: `[{ "src": "url_local", "woo_src": "url_original" }]`

### 2. Edge Function — action חדש `import_images` ב-`woo-sync/index.ts`
- עובר על כל המוצרים שיש להם `woo_id`
- שולף את המוצר מ-WooCommerce API (כולל `images[]`)
- לכל תמונה (ראשית + גלריה):
  - מוריד את הקובץ מה-URL של ווקומרס
  - מעלה ל-Supabase Storage (`product-images` bucket)
  - שומר את ה-URL המקומי
- מעדכן `image_url` (תמונה ראשית) ו-`gallery_images` (שאר התמונות) בטבלה
- עושה את אותו הדבר לווריאציות (תמונה ראשית בלבד)

### 3. עדכון `ProductForm.tsx` — הצגת גלריה
- הצגת כל תמונות הגלריה מתחת לתמונה הראשית ב-grid
- אפשרות מחיקת תמונה מהגלריה

### 4. כפתור הפעלה ב-`WooSyncPage.tsx`
- כפתור "משוך תמונות מווקומרס" שמפעיל את ה-action החדש
- מציג התקדמות

## קבצים לשינוי

| קובץ | שינוי |
|---|---|
| מיגרציה SQL | הוספת `gallery_images` לטבלת `products` |
| `supabase/functions/woo-sync/index.ts` | action `import_images` — הורדה מוו → העלאה ל-Storage |
| `src/pages/inventory/ProductForm.tsx` | הצגת גלריית תמונות |
| `src/pages/WooSyncPage.tsx` | כפתור "משוך תמונות" |

