

# הוספת תמיכה בעברית לווריאציות, קטגוריות ותוכן אתר

## מצב נוכחי
- **וריאציות**: יש `name` (עברית) ו-`name_ar` (ערבית) בDB, אבל הטופס לא מציג שדה `name_ar`
- **קטגוריות**: יש רק `name` בDB — אין שדה עברי נפרד (השם הנוכחי הוא בעברית, חסר `name_he`)
- **תוכן אתר (CMS)**: כל השדות הם בערבית בלבד, אין שדות מקבילים בעברית

## שינויים נדרשים

### 1. מיגרציית DB — הוספת `name_he` לטבלת `categories`
```sql
ALTER TABLE categories ADD COLUMN name_he text;
```
(וריאציות כבר תומכות — יש `name` לעברית ו-`name_ar` לערבית)

### 2. `src/components/inventory/VariationsManager.tsx`
- הוספת שדה `name_ar` לטופס הווריאציה (כרגע חסר בUI)
- הצגת שני שדות: "שם (עברית)" ו-"اسم (ערבית)"
- שמירה ושליפה של `name_ar` מה-DB

### 3. `src/components/inventory/CategoryDialog.tsx`
- הוספת שדה "שם בעברית" (`name_he`) לדיאלוג הקטגוריה
- עדכון `onSave` להעביר את `name_he`

### 4. `src/pages/inventory/CategoriesPage.tsx`
- עדכון `handleSave` לכלול `name_he`

### 5. `src/lib/web-default-content.ts` — הוספת שדות `_he` ל-CMS
לכל שדה טקסט בתוכן האתר, הוספת שדה מקביל בעברית:
- `title` → הוספת `title_he`
- `subtitle` → הוספת `subtitle_he`
- `description` → הוספת `description_he`
- `cta_text` → הוספת `cta_text_he`
- וכן הלאה לכל שדה טקסט/textarea

ב-`defaultContent` — הוספת ערכי ברירת מחדל ריקים לשדות העבריים.
ב-`sectionFields` — הוספת שדות עם label שמציין "(עברית)" אחרי כל שדה ערבי.

## תוצאה
- בטופס וריאציה: שני שדות שם (עברית + ערבית)
- בדיאלוג קטגוריה: שני שדות שם (ערבית + עברית)
- בניהול תוכן אתר: כל שדה טקסט מופיע פעמיים — ערבית ועברית
- הכנה מלאה לאתר דו-לשוני בעתיד

