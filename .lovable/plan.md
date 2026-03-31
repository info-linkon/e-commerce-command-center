

# חישוב מלאי מארזים לפי מרכיבים

## סיכום
המארז לא מנוהל במלאי באופן ישיר — המלאי שלו נגזר ממרכיביו. צריך ליצור פונקציית חישוב שבודקת את המלאי של כל מרכיב ומחזירה את הכמות המקסימלית האפשרית למארז/וריאציה.

## לוגיקה

**מארז פשוט (simple_bundle):**
- שולפים את `bundle_items` (variation_id + quantity)
- לכל מרכיב בודקים סה"כ מלאי (סכום מכל המחסנים)
- כמות מארזים אפשרית = `Math.floor(min(stock[i] / required[i]))` 
- אם 0 → "אזל מהמלאי"

**מארז עם וריאציות (variable_bundle):**
- לכל `bundle_variation` שולפים את `bundle_variation_items`
- אותו חישוב לכל וריאציה בנפרד
- וריאציה שמרכיב שלה חסר → מסומנת כלא זמינה

## שינויים

### 1. `src/hooks/useBundleStock.ts` — hook חדש
```typescript
function useBundleStock(bundleId: string, bundleType: string)
```
- שולף `bundle_items` (למארז פשוט) או `bundle_variations` + `bundle_variation_items` (למשתנה)
- שולף `inventory` מצטבר לכל variation_id רלוונטי
- מחשב כמות אפשרית לכל מארז/וריאציה
- מחזיר: `{ inStock: boolean, maxQuantity: number }` למארז פשוט, או `Map<variationId, { inStock, maxQuantity }>` למשתנה

### 2. `src/pages/PosPage.tsx` — סינון מארזים חסרים
- שימוש ב-hook החדש או שילוב הלוגיקה בשליפת ה-POS
- מארז פשוט שאזל → כרטיס מעומעם + "אזל"
- מארז עם וריאציות → וריאציה חסרה מעומעמת בפופאפ הבחירה

### 3. `src/pages/web/WebProductPage.tsx` — הצגת זמינות באתר
- עבור מוצרי מארז: שימוש ב-`useBundleStock` 
- כפתור "הוסף לסל" מושבת אם אזל
- וריאציה לא זמינה מסומנת

### 4. `src/components/web/WebProductCard.tsx` — badge "אזל מהמלאי"
- אם המוצר הוא מארז ואזל → הצגת badge

## קבצים

| קובץ | שינוי |
|---|---|
| `src/hooks/useBundleStock.ts` | חדש — חישוב מלאי מארז מתוך מרכיבים |
| `src/pages/PosPage.tsx` | עימעום מארזים חסרים + חסימה בווריאציות |
| `src/pages/web/WebProductPage.tsx` | הצגת זמינות + חסימת הוספה |
| `src/components/web/WebProductCard.tsx` | badge אזל מהמלאי |

