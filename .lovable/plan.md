

# שלב 2: ניהול מלאי פנימי - פריטים, וריאציות, מחסנים, קטגוריות ומארזים

שלב זה בונה את מערכת ניהול המלאי המלאה - הליבה של המערכת.

---

## מה ייבנה

### 1. ניהול מחסנים (/inventory/warehouses)
- טבלת מחסנים עם שם, כתובת, סטטוס (פעיל/לא פעיל)
- הוספה, עריכה, מחיקה של מחסנים
- Dialog לטופס הוספה/עריכה

### 2. ניהול קטגוריות (/inventory/categories)
- טבלת קטגוריות עם שם וסדר תצוגה
- הוספה, עריכה, מחיקה
- גרירה לשינוי סדר (או כפתורי חצים)

### 3. ניהול פריטים (/inventory/products)
- רשימת מוצרים בטבלה עם חיפוש וסינון לפי קטגוריה
- הוספת מוצר חדש (פשוט או עם וריאציות)
- עריכת מוצר קיים
- מחיקת מוצר
- ניהול וריאציות בתוך דף המוצר (הוספה, עריכה, מחיקה)

### 4. ניהול מארזים (Bundles) (/inventory/bundles)
- יצירת מארז חדש (מארז פשוט או מארז עם וריאציות)
- בחירת פריטים (וריאציות) + כמויות שמרכיבים את המארז
- עריכה ומחיקה

### 5. תצוגת מלאי (/inventory)
- טבלה מרכזית: וריאציה x מחסן = כמות
- עדכון כמויות ישירות מהטבלה
- סינון לפי מחסן, מוצר, קטגוריה
- התראת מלאי נמוך (סף ברירת מחדל: 5)

---

## פרטים טכניים

### מבנה תיקיות חדש
```text
src/
  pages/
    inventory/
      InventoryIndex.tsx       -- תצוגת מלאי ראשית
      ProductsPage.tsx         -- ניהול פריטים
      ProductForm.tsx          -- טופס הוספה/עריכה מוצר
      WarehousesPage.tsx       -- ניהול מחסנים
      CategoriesPage.tsx       -- ניהול קטגוריות
      BundlesPage.tsx          -- ניהול מארזים
      BundleForm.tsx           -- טופס מארז
  components/
    inventory/
      ProductsTable.tsx        -- טבלת מוצרים
      VariationsManager.tsx    -- ניהול וריאציות בתוך מוצר
      InventoryTable.tsx       -- טבלת מלאי (כמויות)
      WarehouseDialog.tsx      -- Dialog להוספת/עריכת מחסן
      CategoryDialog.tsx       -- Dialog לקטגוריה
      BundleItemsPicker.tsx    -- בוחר פריטים למארז
  hooks/
    useProducts.ts             -- React Query hooks למוצרים
    useWarehouses.ts           -- hooks למחסנים
    useCategories.ts           -- hooks לקטגוריות
    useInventory.ts            -- hooks למלאי
    useBundles.ts              -- hooks למארזים
```

### ניווט - תפריט משנה למלאי
עדכון ה-Sidebar כך שלחיצה על "מלאי" תפתח תת-תפריט:
- מלאי (תצוגה ראשית)
- פריטים
- מחסנים
- קטגוריות
- מארזים

### React Query Hooks
כל hook יכלול:
- `useQuery` לשליפת נתונים
- `useMutation` להוספה, עריכה, מחיקה
- Invalidation אוטומטי של cache לאחר שינויים
- Toast notifications להצלחה/שגיאה

### Routes חדשים ב-App.tsx
```text
/inventory          -- תצוגת מלאי ראשית
/inventory/products -- ניהול פריטים
/inventory/products/new -- הוספת מוצר
/inventory/products/:id -- עריכת מוצר
/inventory/warehouses -- ניהול מחסנים
/inventory/categories -- ניהול קטגוריות
/inventory/bundles    -- ניהול מארזים
/inventory/bundles/new -- הוספת מארז
/inventory/bundles/:id -- עריכת מארז
```

### אין שינויי מסד נתונים
כל הטבלאות הנדרשות (products, product_variations, warehouses, categories, bundles, bundle_items, bundle_variations, bundle_variation_items, inventory) כבר קיימות מהשלב הקודם.

---

## סדר ביצוע
1. יצירת React Query hooks לכל הישויות (products, warehouses, categories, inventory, bundles)
2. עדכון Sidebar עם תת-תפריט למלאי
3. בניית דף מחסנים (הכי פשוט - נקודת התחלה טובה)
4. בניית דף קטגוריות
5. בניית דף פריטים עם טופס הוספה/עריכה + ניהול וריאציות
6. בניית דף מארזים עם טופס
7. בניית תצוגת מלאי ראשית (טבלת כמויות)
8. הוספת כל ה-Routes ל-App.tsx

