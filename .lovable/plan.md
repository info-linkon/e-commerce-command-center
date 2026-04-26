## טאב לוג פעילות משתמשים בדוחות

### גישה כללית
במקום להוסיף טבלה חדשה ולכתוב triggers על כל הטבלאות (פתרון יקר ושביר), ננצל את העובדה שהמערכת כבר מתעדת `created_by` + `created_at` בכל הפעולות המשמעותיות. נבנה **feed מאוחד בצד הלקוח** ששואב מכל המקורות הרלוונטיים, ממזג, ממיין לפי תאריך, ומציג בטבלה אחת עם פילטרים.

יתרונות:
- **אפס שינויים בסכמה** — שום מיגרציה, שום סיכון לנתונים קיימים
- **רטרואקטיבי** — כל ההיסטוריה הקיימת מופיעה מיידית
- **אין כפילות** — כל פעולה כבר נשמרת פעם אחת בטבלת המקור שלה

### מקורות שיאוחדו ל-feed
| מקור | סוג פעולה בלוג | פרטים מוצגים |
|---|---|---|
| `orders` (created_at) | יצירת הזמנה | מס׳ הזמנה, לקוח, סכום |
| `orders` (updated_at ≠ created_at) | עדכון הזמנה | מס׳ הזמנה, סטטוס נוכחי |
| `payments` | קבלת תשלום | מס׳ הזמנה, אמצעי, סכום |
| `intake_sessions` | קליטת מלאי | מחסן, ספק, סה״כ פריטים |
| `inventory_transfers` | העברת מלאי | מ-מחסן → ל-מחסן |
| `inventory_log` (action_type=adjustment) | התאמת מלאי ידנית | מוצר, שינוי |
| `expenses` | רישום הוצאה | תיאור, סכום |
| `cash_transfers` | העברה בין קופות | מ-קופה → ל-קופה, סכום |
| `documents` | הנפקת חשבונית | מס׳ חשבונית, סכום |

הערה: `payments`, `documents`, ו-`inventory_log` חסרים `created_by` ישיר — נציג אותם כפעולת מערכת (או נמשוך את ה-`created_by` של ההזמנה הקשורה כשרלוונטי, למשל `payments → orders.created_by`).

### קבצים חדשים
**`src/hooks/useActivityLog.ts`** — hook חדש:
- מקבל פילטרים: `dateFrom`, `dateTo`, `userId?`, `actionType?`
- מבצע ~9 שאילתות במקביל (`Promise.all`) למקורות לעיל, מסונן לפי טווח תאריכים
- ממפה כל שורה למבנה אחיד:
  ```ts
  type ActivityEntry = {
    id: string;
    timestamp: string;
    user_id: string | null;
    user_name: string | null; // מצורף מ-profiles
    action_type: 'order_create' | 'order_update' | 'payment' | 'intake' | 'transfer' | 'adjustment' | 'expense' | 'cash_transfer' | 'document';
    description: string;       // טקסט קריא בעברית
    reference_id?: string;     // לקישור (למשל id של הזמנה)
    reference_label?: string;  // למשל "הזמנה #1234"
    amount?: number;
  }
  ```
- מאחד הכל לרשימה אחת, ממיין לפי `timestamp DESC`, חותך ל-500 הראשונים
- שאילתה נפרדת ל-`profiles` (user_id, display_name) לרזולוציית שמות משתמשים

**`src/components/reports/ActivityLogTab.tsx`** — רכיב חדש:
- מקבל `startDate, endDate` (כמו שאר הטאבים)
- פילטרים פנימיים: בחירת משתמש (Select מ-profiles), בחירת סוג פעולה
- טבלה RTL עם עמודות: תאריך/שעה | משתמש | סוג פעולה | תיאור | הפניה (Link כשרלוונטי) | סכום
- Badges צבעוניים לפי סוג פעולה (כמו ב-`InventoryLogTab`)
- קישורים: הזמנה → `/crm/orders/:id`, קליטה → `/crm/inventory/intake-history`, וכד׳
- תצוגת mobile דרך `MobileCardList` (תואם לתבנית הקיימת)

### קובץ קיים שיתעדכן
**`src/pages/ReportsPage.tsx`** — הוספת `<TabsTrigger value="activity-log">לוג פעילות</TabsTrigger>` ו-`<TabsContent>` מתאים. הטאב יהיה אחרון.

### בלי שינויים בבק-אנד
- אין מיגרציה
- אין edge function
- אין שינוי ב-RLS (כל הטבלאות הקיימות כבר נגישות ל-authenticated)

### מה לא נכלל (במכוון)
- **מחיקות** — Postgres לא שומר היסטוריית מחיקות בלי triggers. אם זה קריטי בעתיד נוכל להוסיף טבלת `audit_log` ו-triggers, אבל זו עבודה נפרדת ומשמעותית.
- **שינויים על שדות לא-מרכזיים** (למשל עדכון תיאור מוצר) — `products.updated_at` לא יודע מי עדכן. אם תרצי כיסוי מלא של עריכות, נצטרך להוסיף `updated_by` לעמודות האלה ולבצע trigger — שוב, מהלך נפרד.

### שאלה לפני המעבר ליישום
האם הסקופ הנוכחי (פעולות עם `created_by` קיים = הזמנות, קליטות, העברות, הוצאות, העברות קופה, התאמות מלאי, תשלומים, חשבוניות) מספיק? או שחשוב לך שכבר עכשיו נכלול גם **מחיקות ועריכות של מוצרים/לקוחות/קטגוריות** (מה שידרוש מיגרציה + triggers)?
