

# הוספת תמונות לערכים בדף אודות + חיבור ל-CMS

## בעיה
סקשן הערכים (values) בדף אודות משתמש בתמונות hardcoded מקומיות (about-value-1/2/3.jpg) ולא מחובר ל-CMS. בניהול תוכן אין שדה תמונה לערכים.

## שינויים

### 1. `src/lib/web-default-content.ts`
- הוספת שדה `image` לכל פריט ב-`defaultContent.about.values.items`
- הוספת `{ key: 'image', label: 'תמונה', type: 'text' }` ל-`sectionFields.about.values.arrayFields`

### 2. `src/pages/web/WebAboutPage.tsx`
- טעינת סקשן values מה-CMS באמצעות `useSiteSection("about", "values")`
- טעינת סקשן story מה-CMS באמצעות `useSiteSection("about", "story")`
- שימוש בנתוני ה-CMS לערכים (title, desc, image) במקום המערך ה-hardcoded
- fallback לתמונות המקומיות אם אין תמונה ב-CMS
- חיבור גם הסיפור שלנו (story) ל-CMS כדי שתמונת הסיפור תהיה ניתנת לעריכה

## תוצאה
- בניהול תוכן → אודות → ערכים: ניתן לעדכן תמונה לכל ערך
- בניהול תוכן → אודות → הסיפור שלנו: ניתן לעדכן תמונת הסיפור
- הדף מציג את התמונות מה-CMS

