

# תיקון RTL בדיאלוג הקופה — Select Component

## בעיה
רכיב ה-`SelectItem` ב-`select.tsx` משתמש בערכי padding קשיחים (`pl-8 pr-2`) ומיקום אייקון V (`left-2`) שלא מתהפכים ב-RTL. גם `SelectLabel` סובל מאותה בעיה. לכן למרות שהוספת `dir="rtl"` לדיאלוג — הטקסט בתוך ה-dropdown עדיין נראה מיושר לשמאל.

## פתרון
שינוי `select.tsx` לשימוש ב-Tailwind logical properties שמתהפכים אוטומטית לפי כיוון:

| מקורי | מתוקן |
|---|---|
| `pl-8 pr-2` | `ps-8 pe-2` |
| `left-2` | `start-2` |

### קובץ: `src/components/ui/select.tsx`
- **SelectLabel** (שורה 97): `pl-8 pr-2` → `ps-8 pe-2`
- **SelectItem** (שורה 108): `pl-8 pr-2` → `ps-8 pe-2`
- **SelectItem check icon** (שורה 113): `left-2` → `start-2`

שינוי זה ישפיע על כל ה-Select בכל המערכת — כך שכל dropdown יתמוך ב-RTL אוטומטית.

