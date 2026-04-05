

# תיקון מק"ט + תמיכה בגלריית תמונות

## 1. תיקון שדה מק"ט — אותיות באנגלית בלבד

**בעיה:** בטופס מוצר (`ProductForm`) שדה המק"ט חסר `dir="ltr"` — מה שגורם למקלדת/IME לעבוד במצב RTL ומקשה על הקלדת אותיות באנגלית בלבד.

**פתרון:**
- הוספת `dir="ltr"` ו-`placeholder="e.g. SKU-001"` לשדה מק"ט ב-`ProductForm.tsx` (כמו שכבר קיים ב-`BundleForm`)
- אותו תיקון גם לשדה מק"ט בוריאציות (`VariationsManager.tsx`)

## 2. גלריית תמונות — העלאת מספר תמונות

**מצב נוכחי:** שדה `gallery_images` (JSON) כבר קיים ב-DB אבל רק מוצג read-only (מסנכרון WooCommerce). אין אפשרות להעלות תמונות נוספות ידנית.

**פתרון:**
- הוספת state `galleryImages` (מערך URLs) לטופס מוצר וטופס מארז
- כפתור "הוסף תמונות לגלריה" שמאפשר בחירת מספר קבצים (`multiple`)
- תצוגת grid של התמונות עם אפשרות מחיקה (X על כל תמונה)
- שמירת המערך ל-`gallery_images` ב-DB בפורמט `[{ src: "url" }]`
- טעינת הגלריה הקיימת בעריכה

## קבצים

| קובץ | שינוי |
|---|---|
| `src/pages/inventory/ProductForm.tsx` | `dir="ltr"` למק"ט + העלאת גלריה + שמירה |
| `src/pages/inventory/BundleForm.tsx` | העלאת גלריה + שמירה |
| `src/components/inventory/VariationsManager.tsx` | `dir="ltr"` לשדה מק"ט |

