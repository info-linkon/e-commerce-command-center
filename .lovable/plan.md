

# הצגת "תיאור קצר" באתר

## הבעיה

ב-`ProductForm` וב-`BundleForm` יש שדות "תיאור קצר" (he/ar) שנשמרים ל-`products.short_description` / `short_description_ar`, אבל ב-`WebProductPage.tsx` אף פעם לא מציגים אותם — רק את `description` המלא. לכן "תיאור קצר" שהמשתמש מקליד נעלם בצד הציבורי, גם למוצרים פשוטים וגם למארזים (מארזים שואבים גם הם מאותה טבלת `products`, אז תיקון אחד מטפל בשניהם).

## הפתרון

ב-`src/pages/web/WebProductPage.tsx`, מתחת לשם המוצר ומעל ה-`description` הארוך, להוסיף בלוק `short_description` עם אותה לוגיקת שפה (עברית/ערבית) ואותו עיצוב מקוצר יותר.

### מבנה התצוגה שיתקבל:

```text
[שם המוצר]                       [כפתור שיתוף]
[תיאור קצר — בולד/קצת גדול יותר]   ← חדש
[תיאור מלא — מהקטע הקיים]
[מחיר]
[בחירת וריאציה / ערכה]
[כפתור הוספה לסל]
```

### לוגיקת שפה (זהה ל-description הקיים):

- `lang === "he"` → להציג `short_description || short_description_ar`
- `lang === "ar"` → להציג `short_description_ar || short_description`
- אם שניהם ריקים — לא להציג כלום (אין רווח/כותרת ריקים).

### עיצוב:

- אותו דפוס `dangerouslySetInnerHTML` כמו שכבר קיים (כי ה-RichTextEditor מחזיר HTML).
- קלאסים: `text-foreground font-medium leading-relaxed mb-3 prose prose-sm max-w-none` — מעט בולט יותר מהתיאור הארוך (`text-muted-foreground`) כדי לתת לו את התפקיד של "תקציר".

## קבצים שיושפעו

- **שינוי**: `src/pages/web/WebProductPage.tsx` — הוספת בלוק תצוגה ל-`short_description` בין `<h1>` לבלוק ה-`description` הקיים.

## בדיקת קצה

לאחר הביצוע, מומלץ לבדוק:
1. מוצר רגיל עם תיאור קצר בעברית בלבד ⇒ מוצג במצב `lang=he`, ובמצב `lang=ar` יציג את אותו טקסט (fallback).
2. מארז (simple/variable) שיש לו תיאור קצר ⇒ מוצג מעל התיאור המלא.
3. מוצר ללא תיאור קצר ⇒ אין רווח לבן/אלמנט ריק.

