

# תיקון וריאציות מארז — שילוב פריטים לכל וריאציה

## הבעיה
כרגע וריאציות המארז משתמשות ב-`VariationsManager` שיוצר `product_variations` — שזה לא קשור לפריטים במארז. הלוגיקה הנכונה: כל וריאציה של מארז היא **שילוב שונה של פריטים** עם מחיר משלה.

## המבנה בDB (כבר קיים!)
- `bundle_variations` — שם + מחיר + bundle_id
- `bundle_variation_items` — variation_id (של מוצר) + quantity + bundle_variation_id

## שינויים

### 1. `src/components/inventory/BundleVariationsManager.tsx` — קומפוננטה חדשה
מחליפה את `VariationsManager` עבור מארזים:
- רשימת וריאציות מארז קיימות (שם + מחיר + מספר פריטים)
- דיאלוג יצירה/עריכה:
  - שם הוריאציה (עברית)
  - מחיר
  - **בחירת פריטים**: אותו ממשק בחירת מוצר → וריאציה → כמות שקיים היום ב-BundleForm
- CRUD מלא: הוספה, עריכה, מחיקה

### 2. `src/hooks/useBundleVariations.ts` — hook חדש
- `useBundleVariations(bundleId)` — שליפת וריאציות + פריטים שלהן
- `useCreateBundleVariation` — יצירת וריאציה + פריטים
- `useUpdateBundleVariation` — עדכון
- `useDeleteBundleVariation` — מחיקה

### 3. `src/pages/inventory/BundleForm.tsx` — החלפת VariationsManager
- הסרת `VariationsManager` + import
- הצגת `BundleVariationsManager` כשסוג = "עם וריאציות"
- כשסוג = "פשוט" — הצגת פריטים כרגיל (bundle_items)
- כשסוג = "עם וריאציות" — הסתרת קטע "פריטים במארז" (כי הפריטים מוגדרים בכל וריאציה בנפרד)

## זרימה למשתמש

**מארז פשוט:** בוחרים פריטים + כמויות → מחיר אחד

**מארז עם וריאציות:**
- אין בחירת פריטים ברמת המארז
- יוצרים וריאציות, לכל אחת: שם, מחיר, ורשימת פריטים משלה
- דוגמה: "מארז קטן" = 2 כיסאות + שולחן ₪500, "מארז גדול" = 4 כיסאות + 2 שולחנות ₪900

## קבצים

| קובץ | שינוי |
|---|---|
| `src/components/inventory/BundleVariationsManager.tsx` | חדש — ניהול וריאציות מארז עם פריטים |
| `src/hooks/useBundleVariations.ts` | חדש — CRUD לוריאציות מארז |
| `src/pages/inventory/BundleForm.tsx` | החלפת VariationsManager, הסתרת פריטים כשמשתנה |

