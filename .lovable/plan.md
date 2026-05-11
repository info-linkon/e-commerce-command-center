## למה מופיעה השגיאה "يوجد منتج غير صالح في السلة"

### האבחנה

המוצר בעגלה הוא **חבילת ג׳לסת אלריף** (`91e34f1f-...`), שהיא **bundle משתנה (variable)** עם 2 ואריאציות באקלוסיבי בטבלת `bundle_variations`:
- `שנטה הארייאף עם בידוד תרמי - כתום`
- `שנטה הארייאף עם בידוד תרמי - ירוק` ← זה שנבחר

**הבאג בקוד:**
1. ב-`WebProductPage.tsx` (שורה 204), כשמוסיפים bundle משתנה לעגלה, `variationId = activeBundleVariation.id` — כלומר ID מטבלת `bundle_variations`.
2. ב-`WebCheckoutPage.tsx` (שורות 232–282), הוולידציה מחפשת את ה-ID הזה בטבלת `product_variations` בלבד. לא נמצא.
3. נופל ל-fallback: מחפש "ברירת מחדל" ב-`product_variations` של אותו `product_id` — אבל ל-bundle הזה **אין כלל product_variations** (בדקתי: 0 שורות).
4. `orderVariationId` נשאר `null` → toast: "يوجد منتج غير صالح…".

זה סותר את הכלל בזיכרון: *"Bundles must always have a default variation for POS/Web cart compatibility"*. ה-bundle הזה נוצר/יובא בלי ברירת מחדל ב-`product_variations`.

יש כנראה bundles נוספים באותו מצב — להלן רשימת ה-bundles המשתנים שצריך לבדוק: `חבילת אלונאסה פרימיום`, `חבילת ג׳לסת אלריף`, `משענת יד מרכּא`, `ערכת קפה ותה אלרוחה פרימיום`, `ערקת קפה ותה רוחה בייסיק`.

### התיקון המוצע

**שלב 1 — תיקון נתונים (migration):**
לכל מוצר עם `product_type='variable'` שיש לו רשומה ב-`bundles` אבל אין לו אף רשומה ב-`product_variations` — ליצור אוטומטית `product_variation` בודדת בשם `"ברירת מחדל"` (כפי שכבר נהוג עבור simple bundles בקוד).

**שלב 2 — תיקון קוד (`WebProductPage.tsx`):**
ב-bundle משתנה, להפסיק להציב `variationId = activeBundleVariation.id`. במקום זאת:
- `variationId` = ה-`product_variation` של "ברירת מחדל" של מוצר ה-bundle (תואם לאיך ש-simple bundles עובדים היום).
- `bundleVariationId` ממשיך להחזיק את `activeBundleVariation.id` (כבר קיים בשורה 236).

כך כל פריט בעגלה מצביע על `product_variation` תקף, וגם המידע על ואריאציית ה-bundle שנבחרה נשמר ל-`web-create-order` / לרשימת הליקוט.

**שלב 3 — חיזוק checkout (`WebCheckoutPage.tsx`):**
אם בכל זאת `variationId` לא נמצא ב-`product_variations` אבל יש `bundleVariationId` ב-cart item — לבצע fallback אחרון דרך `bundles` → לאחזר את ברירת המחדל של ה-product. נותן רשת ביטחון לעגלות ישנות שכבר נשמרו ב-localStorage עם ה-ID הישן.

**שלב 4 — אימות:**
- להריץ את ה-migration ולוודא שכל ה-bundles המשתנים קיבלו "ברירת מחדל".
- לרענן את העגלה הקיימת ולהוסיף שוב את חבילת ג׳לסת אלריף; checkout אמור לעבור בלי השגיאה.
- לוודא ש-`web-create-order` עדיין רושם את `bundle_variation_id` הנכון בשורת ההזמנה.

### קבצים שייגעו
- מיגרציה חדשה תחת `supabase/migrations/`
- `src/pages/web/WebProductPage.tsx`
- `src/pages/web/WebCheckoutPage.tsx`
