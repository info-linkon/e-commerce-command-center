

# תוכנית תיקון RTL מלאה

## הבעיה
המערכת בעברית אבל יישור RTL לא עקבי: חלק מהדפים חסרים `dir="rtl"`, ערכים מספריים מיושרים שמאלה (`text-left`), כותרות טבלאות מוגדרות `text-right` ידנית במקום לתקן את הבסיס, וב-`justify-between` הסדר הפוך בקומפוננטות דוחות.

## שינויים

### 1. תיקון גלובלי — AppLayout + index.html
- **`src/components/layout/AppLayout.tsx`**: הוסיף `dir="rtl"` על ה-wrapper הראשי כדי שכל הדפים ירשו RTL אוטומטית
- כך לא צריך `dir="rtl"` בכל דף בנפרד

### 2. תיקון רכיב TableHead הבסיסי
- **`src/components/ui/table.tsx`**: שנה `text-left` ל-`text-right` ב-TableHead — זה יתקן את כל הטבלאות במערכת בבת אחת ויבטל את הצורך ב-`className="text-right"` בכל TableHead

### 3. תיקון DialogHeader/SheetHeader/AlertDialogHeader
- **`src/components/ui/dialog.tsx`**: שנה `sm:text-left` ל-`sm:text-right`
- **`src/components/ui/sheet.tsx`**: שנה `sm:text-left` ל-`sm:text-right`
- **`src/components/ui/alert-dialog.tsx`**: שנה `sm:text-left` ל-`sm:text-right`
- **`src/components/ui/drawer.tsx`**: שנה `sm:text-left` ל-`sm:text-right`

### 4. תיקון sidebar
- **`src/components/ui/sidebar.tsx`**: שנה `text-left` ל-`text-right` ב-sidebarMenuButtonVariants

### 5. תיקון קומפוננטות דוחות — סדר RTL
הבעיה: ב-`justify-between` האייקון מופיע משמאל והטקסט מימין, אבל הערכים המספריים מיושרים שמאלה.

- **`src/components/reports/OverviewTab.tsx`**: 
  - הפוך סדר אלמנטים בכרטיסי סיכום (label מימין, icon משמאל)
  - שנה `text-left` ל-`text-right` בערכים
- **`src/components/reports/CashflowTab.tsx`**: אותו תיקון לכרטיסי קופות
- **`src/components/reports/ExpensesTab.tsx`**: תיקון סדר בכרטיס סיכום

### 6. דף Dashboard
- **`src/pages/Dashboard.tsx`**: הוסיף `dir="rtl"` (למקרה ש-AppLayout לא מספיק)

### 7. ניקוי `dir="rtl"` מיותר מדפים בודדים
לאחר התיקון הגלובלי, ה-`dir="rtl"` בכל דף הוא מיותר אבל לא מזיק — ניתן להשאיר או לנקות. עדיף לנקות לקוד נקי יותר.

## סיכום קבצים לשינוי
| קובץ | שינוי |
|---|---|
| `src/components/layout/AppLayout.tsx` | הוסיף `dir="rtl"` |
| `src/components/ui/table.tsx` | `text-left` → `text-right` |
| `src/components/ui/dialog.tsx` | `sm:text-left` → `sm:text-right` |
| `src/components/ui/sheet.tsx` | `sm:text-left` → `sm:text-right` |
| `src/components/ui/alert-dialog.tsx` | `sm:text-left` → `sm:text-right` |
| `src/components/ui/drawer.tsx` | `sm:text-left` → `sm:text-right` |
| `src/components/ui/sidebar.tsx` | `text-left` → `text-right` |
| `src/components/reports/OverviewTab.tsx` | תיקון סדר RTL וערכים |
| `src/components/reports/CashflowTab.tsx` | תיקון סדר RTL וערכים |
| `src/components/reports/ExpensesTab.tsx` | תיקון סדר RTL |

