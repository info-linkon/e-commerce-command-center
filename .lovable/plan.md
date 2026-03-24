

# תיקון תהליך הזמנת POS — עובדת כמו הזמנת אתר

## הבעיה

הזמנת POS נכנסת ישר כ-`completed` ומורידה מלאי אקראית. היא לא עוברת את התהליך הסדור: pending → שיוך מחסן → ליקוט → completed.

## הפתרון

הזמנת POS תיכנס כ-`pending` (כמו הזמנת אתר), עם שיוך מחסן מיידי. גריעת מלאי תתבצע דרך `useAssignWarehouse` הקיים — אותו תהליך בדיוק.

## שינויים

### 1. `src/pages/PosPage.tsx`
- הוספת בחירת **מחסן** (חובה) בדיאלוג התשלום
- שימוש ב-`useWarehouses()` ו-`useAssignWarehouse()`
- שינוי הזרימה:
  1. יצירת הזמנה בסטטוס `pending` (במקום `completed`)
  2. קריאה ל-`assignWarehouse` עם המחסן שנבחר — זה מוריד מלאי, יוצר פריטי ליקוט, ומעביר ל-`processing`
  3. רישום תשלומים כרגיל
- הסרת הלוגיקה הישנה שמעדכנת מלאי ידנית

### 2. `src/hooks/useOrders.ts` — `useCreateOrder`
- הסרת הבלוק שמוריד מלאי עבור `status === "completed"` (שורות 106-136)
- גריעת מלאי POS תעבור דרך `useAssignWarehouse` בלבד — מקור אמת אחד

### סיכום הזרימה החדשה

```text
POS:  יצירת הזמנה (pending) → שיוך מחסן (processing + גריעת מלאי) → תשלום
אתר: webhook (pending) → שיוך מחסן (processing + גריעת מלאי) → תשלום
```

שתי הזרימות זהות מרגע יצירת ההזמנה.

## קבצים לשינוי

| קובץ | שינוי |
|---|---|
| `src/pages/PosPage.tsx` | הוספת בחירת מחסן, שינוי ל-pending + assignWarehouse |
| `src/hooks/useOrders.ts` | הסרת גריעת מלאי מ-useCreateOrder |

