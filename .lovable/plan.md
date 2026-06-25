## הבעיה

בפופאפ עריכת באנר (וברוב הפופאפים) כפתור "שמור" נחתך בתחתית ואי-אפשר לגלול אליו. הסיבה: `DialogContent` משתמש ב-`grid gap-4` עם `overflow-y-auto` באותו אלמנט, וב-`DialogHeader`/`DialogFooter` יש `sticky` עם margins שליליים. השילוב הזה לא יציב — חלק מהטפסים (כמו `WebBannersPage`) בכלל לא משתמשים ב-`DialogFooter` אלא שמים את כפתור השמירה כילד רגיל, כך שהוא נדחף מתחת לגובה הנגלל הזמין.

## הפתרון

לשנות את `DialogContent` למבנה Flex עם גוף נגלל פנימי קבוע, כך שיעבוד נכון לכל קריאה קיימת בלי לשנות את ה-call-sites.

### שינויים ב-`src/components/ui/dialog.tsx`

1. **`DialogContent`** הופך ל-`flex flex-col` עם `overflow-hidden` (במקום `grid` + `overflow-y-auto`).
2. נוסיף עיבוד פנימי של `children`:
   - ילדים שהם `DialogHeader` → נשארים בראש כ-shrink-0 (ללא sticky/negative margin).
   - ילדים שהם `DialogFooter` → נשארים בתחתית כ-shrink-0.
   - שאר הילדים נעטפים אוטומטית ב-`<div class="flex-1 overflow-y-auto -mx-4 px-4 sm:-mx-6 sm:px-6">` כך שהם מקבלים גלילה משלהם, גם כשאין `DialogFooter`.
3. **`DialogHeader`/`DialogFooter`**: להסיר את `sticky`, `backdrop-blur` והמרג'ינים השליליים — לא נחוצים יותר כי הם יושבים מחוץ לאזור הגלילה. נשמור על ה-`border-b`/`border-t` לחזות הקיימת.
4. נשמור על אנימציית bottom-sheet במובייל ועל max-h של `92vh`/`90vh`.

### אותו תיקון ל-`src/components/ui/alert-dialog.tsx`

לעקביות — אותו עיבוד children (header/footer קבועים, גוף נגלל).

## תוצאה

- בכל פופאפ קיים, גם בלי לשנות את הקוד שלו, יהיה אזור גוף נגלל פנימית; הכפתורים בתחתית (גם אם הם רק `<Button>` רגיל בתוך הגוף) יישארו נגישים על-ידי גלילה.
- `DialogHeader`/`DialogFooter` (כשמשמשים) מוצמדים יציב לראש/תחתית בלי באגי sticky.
- אותה התנהגות בדסקטופ ובמובייל.
