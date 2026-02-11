

# תוכנית בנייה - שלב 1: תשתית, אימות, ניווט ודשבורד

זהו השלב הראשון מתוך 8 שלבים. נבנה את הבסיס של המערכת כולל מסד נתונים, אימות משתמשים, מבנה ניווט RTL, ודשבורד ראשי.

---

## מה ייבנה בשלב הזה

### 1. מסד נתונים - טבלאות בסיס
יצירת הטבלאות הבאות ב-Supabase:

- **profiles** - פרופילי משתמשים (שם תצוגה, טלפון)
- **user_roles** - תפקידי משתמשים (עם enum: admin, user)
- **warehouses** - מחסנים (שם, כתובת, פעיל/לא)
- **cash_registers** - קופות מזומנים (שם, יתרת פתיחה, פעיל/לא)
- **products** - פריטים (שם, SKU, מחיר עלות, מחיר מכירה, סוג מוצר, מפורסם באתר, WooCommerce ID)
- **product_variations** - וריאציות (שם, SKU, מחיר, WooCommerce ID)
- **bundles** - מארזים (מוצר מארז, סוג: פשוט/עם משתנים)
- **bundle_items** - פריטי מארז (וריאציה + כמות)
- **bundle_variations** - וריאציות מארז (שם, מחיר)
- **bundle_variation_items** - פריטי וריאציית מארז
- **inventory** - מלאי (וריאציה x מחסן = כמות)
- **categories** - קטגוריות (שם, סדר תצוגה, WooCommerce ID)

כל הטבלאות יכללו RLS policies מתאימות.

### 2. אימות משתמשים
- דף התחברות בעברית (אימייל + סיסמה)
- הגנת מסלולים - רק משתמשים מחוברים נכנסים למערכת
- יצירת פרופיל אוטומטית בהרשמה (Trigger)
- ניהול Session עם onAuthStateChange

### 3. מבנה ניווט RTL
- Sidebar ימני קבוע עם תפריט ניווט
- סעיפי תפריט: דשבורד, מלאי, פריטי אתר, הזמנות, קופה, מסמכים, דוחות, הגדרות
- אייקונים לכל סעיף (Lucide icons)
- לוגו בראש הסרגל
- כפתור התנתקות

### 4. דשבורד ראשי
- כרטיסי סיכום: מכירות היום, הזמנות ממתינות, פריטים במלאי נמוך, סה"כ הכנסות החודש
- גרף מכירות שבועי (Recharts)
- רשימת פעולות אחרונות
- התראות מלאי נמוך

---

## פרטים טכניים

### מבנה תיקיות
```text
src/
  components/
    layout/
      AppSidebar.tsx        -- סרגל צד ראשי
      AppLayout.tsx          -- Layout wrapper עם RTL
      ProtectedRoute.tsx     -- הגנת מסלולים
    dashboard/
      StatsCards.tsx          -- כרטיסי סיכום
      SalesChart.tsx          -- גרף מכירות
      RecentActivity.tsx     -- פעולות אחרונות
      LowStockAlerts.tsx     -- התראות מלאי
  hooks/
    useAuth.tsx              -- Hook לניהול אימות
  pages/
    Auth.tsx                 -- דף התחברות
    Dashboard.tsx            -- דשבורד ראשי
    Index.tsx                -- Redirect לדשבורד
```

### SQL Migration - טבלאות בסיס
- יצירת enum לסוגי מוצרים: simple, variable
- יצירת enum לסוגי מארזים: simple_bundle, variable_bundle
- יצירת enum לתפקידים: admin, user
- יצירת כל הטבלאות עם foreign keys, indexes, ו-RLS policies
- Trigger ליצירת פרופיל אוטומטית בהרשמה

### RTL ועברית
- הוספת `dir="rtl"` ו-`lang="he"` ל-HTML
- עדכון index.css עם font-family עברי (system fonts)
- Sidebar בצד ימין

### הגנת אבטחה
- RLS על כל הטבלאות - רק משתמשים מאומתים
- תפקידים בטבלה נפרדת (user_roles) עם security definer function
- אין בדיקות הרשאה בצד לקוח

---

## סדר ביצוע
1. SQL Migration - יצירת כל הטבלאות, triggers, ו-RLS
2. עדכון RTL והגדרות עברית
3. בניית useAuth hook ודף התחברות
4. בניית Layout (Sidebar + ProtectedRoute)
5. בניית דשבורד עם כרטיסי סיכום וגרפים (נתונים ריקים בשלב זה)
6. הגדרת Routes ב-App.tsx

