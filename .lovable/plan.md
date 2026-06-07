
## הבעיה

ב-`useWebProducts.ts` הפונקציה `annotateOutOfStock` סוכמת `inventory.quantity` לפי כל הוריאציות של המוצר. למארזים יש וריאציית "ברירת מחדל" וירטואלית שתמיד עם כמות 0 במלאי (המלאי האמיתי מחושב דינמית מרכיבי המארז דרך `bundle_items` / `bundle_variation_items`). 

לכן: **כל המארזים מוחזרים עם `outOfStock: true`** למרות שהרכיבים שלהם במלאי.

## התיקון

לעדכן את `annotateOutOfStock` ב-`src/hooks/useWebProducts.ts` כך שיזהה מוצרי-מארז ויחשב להם את המלאי האמיתי לפי הרכיבים, בדומה ל-`useBundlesStockBatch`:

1. אחרי שליפת המוצרים – לבדוק ב-`bundles` אילו `product_id` הם מארזים (כולל `bundle_type`).
2. עבור מוצרים **שאינם** מארזים – ההתנהגות הקיימת (סכימת `inventory` של הוריאציות) נשמרת.
3. עבור מוצרים שהם מארזים:
   - `simple_bundle` – לטעון `bundle_items` ולחשב `maxQty = min(floor(stock(component) / qty))`. `outOfStock = maxQty <= 0`.
   - `variable_bundle` – לטעון את כל ה-`bundle_variations` של המארז ואת ה-`bundle_variation_items` של כולן. המארז זמין אם **לפחות וריאציה אחת** שלו מחזירה `maxQty > 0`.
4. את כל שליפות ה-`inventory` של רכיבי המארזים לאחד לקריאה אחת (`in('variation_id', allComponentVarIds)`) כדי למנוע N+1.

## מניעת רגרסיה

- להוסיף הערה ברורה ב-`annotateOutOfStock` שמסבירה שמארזים = וירטואליים ולא לסכום inventory ישירות.
- להוסיף בדיקת Vitest קצרה ב-`src/hooks/__tests__/useWebProducts.outOfStock.test.ts` שמדמה מוצר רגיל + מארז עם רכיב במלאי, ומוודאת שהמארז לא מסומן `outOfStock` (mock ל-`supabase.from`).

## קבצים שישתנו

- `src/hooks/useWebProducts.ts` – עדכון `annotateOutOfStock`.
- `src/hooks/__tests__/useWebProducts.outOfStock.test.ts` – בדיקה חדשה.

ללא שינויי DB, ללא שינוי UI, ללא נגיעה בשאר הקריאות לפונקציה.
