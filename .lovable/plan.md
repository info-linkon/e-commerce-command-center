

# שדרוג מארזים — אותם שדות כמו מוצרים

## סיכום
המארזים כבר יוצרים רשומת `products` מאחורי הקלעים, אז המבנה בDB תומך בכל השדות. הבעיה היא שטופס המארז (`BundleForm`) מציג רק שם ומחיר. צריך להעשיר אותו עם כל השדות שיש בטופס מוצר רגיל.

## שינויים

### 1. `src/pages/inventory/BundleForm.tsx` — שכתוב מלא
הפיכת הטופס לעשיר כמו `ProductForm`:
- **שמות בשתי שפות**: name (עברית) + name_ar (ערבית)
- **תיאור קצר**: short_description + short_description_ar
- **תיאור מלא**: description + description_ar
- **מק"ט** (SKU)
- **קטגוריה** — בחירה מרשימת הקטגוריות הקיימות
- **תמונה ראשית** — העלאה ל-Storage כמו במוצרים
- **מחיר מכירה + מחיר עלות**
- **סוג מארז** — פשוט/משתנה
- **מפורסם באתר** — Switch
- **וריאציות** — אם סוג = משתנה, הצגת `VariationsManager` (כמו במוצרים)
- שמירת כל השדות ל-`products` בעת יצירה/עדכון
- תמיכה בעריכה מלאה (כרגע עריכה לא שומרת)

### 2. `src/hooks/useBundles.ts` — הרחבת mutations
- `useCreateBundle`: שמירת כל שדות המוצר (תיאורים, קטגוריה, תמונה, ערבית)
- הוספת `useUpdateBundle`: עדכון שדות המוצר + פריטי המארז
- `useBundles`: הרחבת ה-select לכלול `products(name, name_ar, image_url, sale_price, category_id, categories(name))`

### 3. `src/pages/inventory/BundlesPage.tsx` — העשרת הטבלה
- הוספת עמודות: תמונה, קטגוריה, מחיר
- הצגת שם בערבית אם קיים

## קבצים

| קובץ | שינוי |
|---|---|
| `src/pages/inventory/BundleForm.tsx` | שכתוב — טופס עשיר כמו ProductForm |
| `src/hooks/useBundles.ts` | הוספת useUpdateBundle + הרחבת select |
| `src/pages/inventory/BundlesPage.tsx` | הוספת עמודות תמונה/קטגוריה/מחיר |

