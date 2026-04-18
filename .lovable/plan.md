

## ההבנה

המשתמש רוצה שדף המוצר באתר יציג **רק** את הווריאציות שמופיעות בדף ניהול המארזים (`bundle_variations` + `bundle_variation_items`), ולא יערבב נתונים מ-`product_variations` כשמדובר במארז.

**המצב כיום במוצר #4:**
- רשום ב-`bundles` כ-`simple_bundle` ריק (אין `bundle_items`, אין `bundle_variations`).
- יש לו 5 רשומות "רפאים" ב-`product_variations` (מסונכרנות מ-WooCommerce).
- האתר מציג ומאפשר הזמנה של ה-5 הרפאים — וזה בדיוק מה שהמשתמש רוצה למנוע.

**הכלל החדש:** אם מוצר רשום בטבלת `bundles` — האתר יסתמך **בלעדית** על נתוני המארז.

---

## תוכנית

### 1. `src/pages/web/WebProductPage.tsx` — תיקון מרכזי
שינוי הלוגיקה כך שכשהמוצר הוא מארז (יש לו רשומה ב-`bundles`):
- **`variable_bundle`** → להציג רק `bundle_variations`. להזמין עם `bundleVariationId`.
- **`simple_bundle`** → להציג כמוצר פשוט בלי בורר. להזמין `product.id` בלבד, **בלי** להפיל לאחור ל-`product_variations[0]`.
- **לא מארז** (התנהגות נוכחית) → להציג `product_variations` כרגיל.

שינויים קונקרטיים:
- שורה 107: `const isVariable = !bundleData && product.product_type === "variable" && variations.length > 0;` (להוסיף `!bundleData`).
- שורה 165: להסיר את הפול-בק `variations?.[0]?.id`. אם זה מארז ללא ווריאציות זמינות — להזמין את `product.id` בלבד.
- אם המוצר הוא `simple_bundle` ריק (אין `bundle_items`) — להציג "אזל מהמלאי" / לחסום הוספה לסל (הגנה נוספת).

### 2. `src/hooks/useBundleStock.ts` — בדיקה מהירה
לוודא שהחישוב כבר מתבסס רק על טבלאות המארז. אם כן — לא נוגעים.

### 3. `src/pages/PosPage.tsx` — בדיקה מהירה
לוודא שבחירת מארז בקופה מתבססת רק על `bundle_variations`. אם כן — לא נוגעים.

### 4. מוצר #4 הספציפי
לאחר התיקון, המוצר יוצג באתר כמארז ריק לא זמין להזמנה — בדיוק מה שמופיע בדף ניהול המארזים. תוכל להגדיר לו רכיבים/ווריאציות ידנית בהמשך, או להחליט למחוק את ה-bundle.

### 5. סריקה גלובלית
שאילתת ביקורת לזיהוי כל המוצרים שיש להם גם רשומה ב-`bundles` וגם ב-`product_variations` — כדי לראות אם יש עוד מקרים שצריך לתת עליהם את הדעת:
```sql
SELECT p.product_number, p.name, b.bundle_type,
       (SELECT COUNT(*) FROM bundle_items WHERE bundle_id = b.id) AS items,
       (SELECT COUNT(*) FROM bundle_variations WHERE bundle_id = b.id) AS variations,
       (SELECT COUNT(*) FROM product_variations WHERE product_id = p.id) AS ghost_variations
FROM products p JOIN bundles b ON b.product_id = p.id
WHERE p.is_published = true;
```

---

## תוצאה מצופה

- מוצר עם `variable_bundle` ו-3 ווריאציות מארז → באתר יוצגו אותן 3 ווריאציות בדיוק (אותם שמות, מחירים, מק"טים).
- מוצר עם `simple_bundle` שמוגדר כראוי → יוצג כמוצר פשוט.
- מוצר עם `simple_bundle` ריק (כמו #4 כיום) → לא ניתן להזמנה באתר.
- אפס סיכוי שלקוח יזמין וריאציה שלא נראית בדף ניהול המארזים.

