

# הוספת מחיר משלוח למוצרים וחישוב בסל

## סיכום
הוספת עמודת `shipping_price` לטבלת `products`, הצגתה בטפסי מוצר ומארז, שמירת מחיר המשלוח בסל, וחישוב עלות משלוח = המקסימום מבין כל הפריטים בסל.

## לוגיקה
- כל מוצר/מארז יכול להגדיר מחיר משלוח (ברירת מחדל 0)
- בסל הקניות: עלות המשלוח = `Math.max(...items.map(i => i.shippingPrice || 0))`
- עלות המשלוח מוצגת בסיכום הסל ובצ'קאאוט, ונוספת לסה"כ

## שינויים

### 1. מיגרציה — עמודת `shipping_price`
```sql
ALTER TABLE products ADD COLUMN shipping_price numeric NOT NULL DEFAULT 0;
```

### 2. `ProductForm.tsx` + `BundleForm.tsx` — שדה מחיר משלוח
הוספת Input מספרי "מחיר משלוח" ליד שדות המחיר הקיימים

### 3. `web-cart-store.ts` — שמירת shippingPrice בסל
- הוספת `shippingPrice: number` ל-`CartItem`
- הוספת פונקציה `shippingCost()` שמחזירה את המקסימום

### 4. `WebProductPage.tsx` — העברת shippingPrice בהוספה לסל
בעת `addItem` — להעביר את `shipping_price` מהמוצר

### 5. `WebCartPage.tsx` — הצגת עלות משלוח בסיכום
שורה נוספת "تكلفة التوصيل" עם הערך, וסה"כ כולל משלוח

### 6. `WebCheckoutPage.tsx` — הצגה + שליחה עם משלוח
- הצגת שורת משלוח בסיכום
- `finalTotal` כולל משלוח
- שמירה ב-`total` של ההזמנה כולל משלוח

### 7. `PosPage.tsx` — העברת shippingPrice בקופה
בעת הוספה לעגלת POS, להעביר את מחיר המשלוח

## קבצים

| קובץ | שינוי |
|---|---|
| מיגרציה SQL | `shipping_price` ב-products |
| `src/pages/inventory/ProductForm.tsx` | שדה מחיר משלוח |
| `src/pages/inventory/BundleForm.tsx` | שדה מחיר משלוח |
| `src/lib/web-cart-store.ts` | `shippingPrice` + `shippingCost()` |
| `src/pages/web/WebProductPage.tsx` | העברת shippingPrice |
| `src/pages/web/WebCartPage.tsx` | הצגת עלות משלוח |
| `src/pages/web/WebCheckoutPage.tsx` | סה"כ כולל משלוח |
| `src/pages/PosPage.tsx` | העברת shippingPrice |

