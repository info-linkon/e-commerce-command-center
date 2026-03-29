

# שדרוג ממשק ניהול אתר + קופונים

## סיכום
שלושה שינויים מרכזיים:
1. **שכתוב מלא של דף ניהול תוכן** — במקום הממשק הבסיסי הנוכחי, בניית מערכת עריכה עשירה כמו ב-Alrahal: תמיכה בשדות טקסט, textarea, תמונות (עם העלאה ל-Storage), מערכים דינמיים, וצבעים. הכל בדיאלוג עריכה מסודר.
2. **איחוד באנרים בתוך דף התוכן** — במקום דף באנרים נפרד, הבאנרים יהיו חלק מהלשוניות בדף ניהול התוכן (או ישארו כתת-פריט אבל ישודרגו עם העלאת תמונות).
3. **דף ניהול קופונים חדש** — טבלת `coupons` חדשה ב-DB + דף ניהול + אינטגרציה בצ'קאאוט.

## פירוט טכני

### 1. DB — מיגרציה: טבלת `coupons`
```sql
CREATE TABLE public.coupons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  type text NOT NULL DEFAULT 'percentage', -- 'percentage' | 'fixed'
  value numeric NOT NULL DEFAULT 0,
  min_order numeric NOT NULL DEFAULT 0,
  max_uses integer,
  used_count integer NOT NULL DEFAULT 0,
  single_use boolean NOT NULL DEFAULT false,
  active boolean NOT NULL DEFAULT true,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
-- Public SELECT for validation at checkout
CREATE POLICY "Anyone can view coupons" ON public.coupons FOR SELECT USING (true);
-- Admin management
CREATE POLICY "Authenticated can manage coupons" ON public.coupons FOR ALL TO authenticated USING (true) WITH CHECK (true);
```

### 2. שכתוב `src/lib/web-default-content.ts`
הוספת מבנה `sectionLabels`, `pageLabels`, `sectionFields` (עם FieldConfig) כמו ב-Alrahal — כך שכל סקשן בכל דף מוגדר עם סוגי שדות (text, textarea, image, array, color). הבאנרים יישארו כדף נפרד אבל ישודרגו.

### 3. שכתוב `src/pages/admin/WebContentPage.tsx`
העתקה של המנגנון מ-Alrahal AdminContent:
- דיאלוג עריכה עם `renderField` שתומך ב-text/textarea/image/array/color
- העלאת תמונות ל-bucket `product-images` (קיים ופתוח)
- תצוגת Cards לכל סקשן עם כפתור "ערוך"

### 4. שדרוג `src/pages/admin/WebBannersPage.tsx`
- הוספת העלאת תמונות (לא רק URL)
- הוספת כפתור עריכה (לא רק מחיקה)
- בחירת דף קישור מ-Select

### 5. קבצים חדשים
- `src/hooks/useCoupons.ts` — hooks: useCoupons, useCreateCoupon, useUpdateCoupon, useDeleteCoupon, useValidateCoupon, calcDiscount
- `src/pages/admin/AdminCouponsPage.tsx` — דף ניהול קופונים (כמו ב-Alrahal)

### 6. אינטגרציה בצ'קאאוט
- `src/pages/web/WebCheckoutPage.tsx` — הוספת שדה קוד קופון + ולידציה + חישוב הנחה

### 7. ניווט
- `AppSidebar.tsx` — הוספת "קופונים" לתת-תפריט ניהול אתר
- `App.tsx` — הוספת route `/admin/coupons`

## קבצים

| קובץ | שינוי |
|---|---|
| מיגרציה SQL | טבלת `coupons` |
| `src/lib/web-default-content.ts` | הוספת sectionLabels, pageLabels, sectionFields (FieldConfig) |
| `src/pages/admin/WebContentPage.tsx` | שכתוב מלא — עורך עשיר כמו Alrahal |
| `src/pages/admin/WebBannersPage.tsx` | שדרוג — העלאת תמונות + עריכה |
| `src/hooks/useCoupons.ts` | חדש — CRUD + ולידציה |
| `src/pages/admin/AdminCouponsPage.tsx` | חדש — דף ניהול קופונים |
| `src/pages/web/WebCheckoutPage.tsx` | הוספת קופון בצ'קאאוט |
| `src/components/layout/AppSidebar.tsx` | הוספת לינק קופונים |
| `src/App.tsx` | הוספת route קופונים |

