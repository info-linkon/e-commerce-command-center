## המטרה
לאפשר בחירת וריאציה ספציפית של מוצר (למשל: "כיסא – סגול") ב"מבצעים מיוחדים", כך שהיא תופיע בסליידר עם התמונה/השם/המחיר של אותה וריאציה ותוביל למוצר עם הוריאציה נבחרת מראש.

## שינויים

### 1. מסד נתונים
- `ALTER TABLE public.exclusive_deals ADD COLUMN variation_id uuid NULL REFERENCES public.product_variations(id) ON DELETE CASCADE;`
- שינוי אילוץ הייחודיות: מעכשיו זוג `(product_id, variation_id)` ייחודי (כדי לאפשר גם את המוצר כולו וגם וריאציה אחת שלו, או כמה וריאציות שונות).

### 2. עמוד ניהול – `ExclusiveDealsPage.tsx`
- אחרי בחירת מוצר מתוך החיפוש, אם למוצר יש וריאציות (חוץ מ"ברירת מחדל") – מוצג שלב שני עם רשימת הוריאציות + אפשרות "המוצר כולו (בלי וריאציה)".
- ברשימה הראשית מוצגים תמונת הוריאציה (אם יש), שם הוריאציה כתגית ליד שם המוצר, ומחיר הוריאציה.

### 3. Hook – `useExclusiveDeals.ts`
- `useExclusiveDealsAdmin`: להביא גם `product_variations(id, name, name_ar, price, compare_at_price, image_url, sku)`.
- `useAddExclusiveDeal`: לקבל `{ productId, variationId? }`.
- `useExclusiveDealsPublic`: להחזיר לכל שורה את הנתונים של הוריאציה (אם קיימת) כתחליף למחיר/תמונה/שם של המוצר, ולהעביר `variationId` ו־SKU של הוריאציה.

### 4. תצוגה – `ExclusiveDealsSlider.tsx` + `WebProductCard.tsx`
- כרטיס יקבל `variationId?` ו־`variationName?`.
- הקישור למוצר יהיה `/product/{productNumber}?v={variationId}` כשיש וריאציה.
- מוצגים שם + תגית וריאציה, תמונת הוריאציה, ומחיר/מחיר-לפני של הוריאציה.

### 5. עמוד מוצר – `WebProductPage.tsx`
- קריאת `?v=` מה־URL בטעינה ראשונית לבחירת `selectedVariation` (למוצר רגיל בלבד – לא לוריאציות של מארז בשלב הזה).

### היקף שלא נכלל
- וריאציות של מארזים (`bundle_variations`) לא נכללות כרגע. אם נדרש – אפשר להוסיף בגל שני עם עמודה מקבילה `bundle_variation_id`.

## שאלה קטנה
האם להוסיף תמיכה גם בוריאציות של מארזים באותה משימה, או להתמקד רק בוריאציות של מוצר רגיל כפי שביקשת בדוגמה?
