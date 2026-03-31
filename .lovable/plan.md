

# הצגת מארזים באתר ובקופה

## מצב נוכחי — הבעיות

**קופה (POS):** שולפת רק `product_variations` ומקבצת לפי מוצר. מארזים לא יוצרים `product_variations` — מארז פשוט משתמש ב-`bundle_items`, מארז עם וריאציות משתמש ב-`bundle_variations`. לכן **מארזים לא מופיעים בכלל בקופה**.

**אתר (Web Product Page):** המוצר כן מופיע (כי הוא ב-`products` עם `is_published`), אבל עבור מארז עם וריאציות — הדף מחפש `product_variations` שלא קיימות, ולכן לא מציג אפשרויות בחירה. מארז פשוט מופיע אבל בלי וריאציות (נכון).

## שינויים

### 1. `src/pages/PosPage.tsx` — הוספת מארזים לרשימת המוצרים
- שליפה נוספת: `bundles` עם `products(name, category_id, sale_price)` + `bundle_variations(id, name, price)`
- מיזוג לתוך `groupedProducts`:
  - **מארז פשוט**: כרטיס אחד עם "וריאציה" אחת (מחיר = `sale_price` מהמוצר)
  - **מארז עם וריאציות**: כרטיס אחד, לחיצה פותחת פופאפ עם `bundle_variations` (שם + מחיר)
- סימון מארזים עם badge "מארז" על הכרטיס
- שילוב בדיקת מלאי קיימת (`useBundlesStockBatch`)

### 2. `src/pages/web/WebProductPage.tsx` — תמיכה בוריאציות מארז
- כאשר המוצר הוא מארז עם וריאציות (`variable_bundle`):
  - שליפת `bundle_variations` במקום `product_variations`
  - הצגת כפתורי בחירה מ-`bundle_variations` (שם + מחיר)
  - בדיקת מלאי לכל וריאציית מארז בנפרד
  - הוספה לסל עם `bundleVariationId`

### 3. `src/hooks/useWebProducts.ts` — hook חדש לוריאציות מארז
- הוספת `useWebBundleVariations(bundleId)` — שולף `bundle_variations` עם שם ומחיר

## קבצים

| קובץ | שינוי |
|---|---|
| `src/pages/PosPage.tsx` | שליפת מארזים + מיזוג לגריד + badge |
| `src/pages/web/WebProductPage.tsx` | תמיכה בוריאציות מארז + מלאי |
| `src/hooks/useWebProducts.ts` | הוספת `useWebBundleVariations` |

