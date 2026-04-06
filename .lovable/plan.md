

# תיקון חוסר התאמה בין תמונות CMS לדף אודות

## בעיה
דף אודות (WebAboutPage) לא משתמש בתמונות שמעודכנות בניהול התוכן:
1. **Hero** — שורה 97: משתמש בתמונת `aboutHero` hardcoded במקום `content.backgroundImage` מה-CMS
2. **תת-כותרת Hero** — שורה 109: טקסט hardcoded במקום `content.description`

תמונות הסיפור והערכים כבר מחוברות נכון (שורות 127, 82).

## פתרון — `src/pages/web/WebAboutPage.tsx`

### שינוי 1: תמונת Hero (שורה 97)
```
src={aboutHero}
```
→
```
src={content.backgroundImage || aboutHero}
```

### שינוי 2: תת-כותרת Hero (שורה 109)
```
وجهتكم الأولى لعالم الطبيعة والمغامرات
```
→
```
{content.description || "وجهتكم الأولى لعالم الطبيعة والمغامرات"}
```

## תוצאה
כל התמונות והטקסטים בדף אודות ישקפו את מה שמעודכן בממשק ניהול התוכן, עם fallback לתוכן ברירת מחדל.

