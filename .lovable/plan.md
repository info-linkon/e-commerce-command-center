

# תוכנית רספונסיביות מלאה למערכת הניהול (Admin)

## סיכום
המערכת כרגע בנויה לדסקטופ — טבלאות רחבות, layout קבוע בקופה, וסיידבר שלא מותאם למובייל. התוכנית הופכת את כל הדפים לרספונסיביים עם גישת mobile-first.

## עקרונות

- **טבלאות** → במובייל הופכות לכרטיסיות (cards) מוערמות
- **קופה (POS)** → העגלה עוברת ל-Drawer תחתון במקום פאנל צד
- **סיידבר** → כבר `offcanvas` במובייל (shadcn sidebar), רק לוודא שה-trigger נגיש
- **טפסים** → עמודות הופכות ל-stack
- **כותרות + כפתורים** → stack אנכי במובייל

---

## שלבים

### 1. AppLayout — header מובייל
- הוספת שם הדף ב-header
- וידוא ש-`SidebarTrigger` בולט במובייל (hamburger)
- הוספת padding תחתון (`pb-20`) במובייל למניעת חפיפה עם תוכן

### 2. רכיב `MobileCardList` — תחליף טבלה במובייל
- רכיב חדש שמקבל data + field definitions
- בדסקטופ מציג `Table`, במובייל מציג כרטיסיות
- ישמש בכל הדפים: הזמנות, מוצרים, לקוחות, מחסנים, משלוחים, הוצאות, מארזים

### 3. דפי רשימה — התאמה למובייל
כל הדפים הבאים יקבלו:
- כותרת + כפתורים: `flex-wrap` עם stack במובייל
- שורת חיפוש + פילטרים: `flex-col` במובייל
- טבלה → כרטיסיות במובייל דרך `MobileCardList`

**דפים:**
- `OrdersPage` (8 עמודות → כרטיס עם שדות מרכזיים)
- `ProductsPage` (7 עמודות → כרטיס)
- `BundlesPage`
- `CustomersPage`
- `DeliveriesPage`
- `WarehousesPage`
- `ExpensesPage`
- `InventoryIndex` (תצוגת מלאי)
- `TransfersPage`
- `InventoryLogPage`

### 4. קופה (POS) — רספונסיבית
הדף הכי קריטי — כרגע `flex` אופקי עם עגלה קבועה בצד:
- במובייל: הסתרת פאנל העגלה → כפתור FAB צף "עגלה (N)" שפותח `Drawer` תחתון
- גריד מוצרים: `grid-cols-2` במובייל (כבר קיים חלקית)
- דיאלוג יצירת הזמנה: `max-w-full` במובייל

### 5. טפסים — stack אנכי
- `ProductForm` — שדות ב-grid שהופך ל-1 עמודה
- `BundleForm` — אותו דבר
- `OrderForm` — שדות לקוח + שורות הזמנה
- `OrderDetail` — סיכום + פעולות

### 6. דשבורד
- `StatsCards` — כבר grid רספונסיבי, לוודא `grid-cols-2` במובייל
- `SalesChart` — `min-h` מתאים במובייל
- כותרת קטנה יותר במובייל

### 7. דפי הגדרות ואדמין
- `SettingsPage`, `HypSettingsPage`, `MetaPixelSettingsPage`, `SmsTemplatesPage`
- בעיקר טפסים — stack אנכי + `max-w-full`

---

## פירוט טכני

### רכיב `MobileCardList`
```text
Props:
- data: T[]
- columns: { label: string, render: (item: T) => ReactNode, hideOnMobile?: boolean }[]
- onRowClick?: (item: T) => void
- actions?: (item: T) => ReactNode

Desktop: renders <Table>
Mobile: renders stacked <Card> list
Switch via useIsMobile()
```

### POS Drawer (מובייל)
```text
Desktop: flex gap-4 → products panel + cart panel side by side
Mobile:  
  - products panel full width
  - FAB button fixed bottom-right: "עגלה (3)"
  - Click → Drawer from bottom with cart items + checkout button
```

### טבלאות → כרטיסיות
```text
Desktop:
┌──────┬────────┬────────┬───────┐
│ מס׳  │ לקוח   │ סה״כ   │ פעולות│
├──────┼────────┼────────┼───────┤
│ #101 │ אחמד   │ ₪150   │ 👁 🗑 │
└──────┴────────┴────────┴───────┘

Mobile:
┌─────────────────────────┐
│ #101          ● ממתינה  │
│ אחמד  •  050-1234567    │
│ ₪150.00      👁 🗑       │
└─────────────────────────┘
```

## קבצים

| קובץ | שינוי |
|---|---|
| `src/components/ui/mobile-card-list.tsx` | חדש — רכיב רשימת כרטיסיות |
| `src/components/layout/AppLayout.tsx` | header רספונסיבי |
| `src/pages/PosPage.tsx` | Drawer עגלה במובייל |
| `src/pages/orders/OrdersPage.tsx` | כרטיסיות במובייל |
| `src/pages/orders/OrderForm.tsx` | טופס רספונסיבי |
| `src/pages/orders/OrderDetail.tsx` | layout רספונסיבי |
| `src/pages/inventory/ProductsPage.tsx` | כרטיסיות במובייל |
| `src/pages/inventory/BundlesPage.tsx` | כרטיסיות במובייל |
| `src/pages/inventory/ProductForm.tsx` | טופס רספונסיבי |
| `src/pages/inventory/BundleForm.tsx` | טופס רספונסיבי |
| `src/pages/inventory/InventoryIndex.tsx` | כרטיסיות במובייל |
| `src/pages/inventory/TransfersPage.tsx` | כרטיסיות במובייל |
| `src/pages/customers/CustomersPage.tsx` | כרטיסיות במובייל |
| `src/pages/deliveries/DeliveriesPage.tsx` | כרטיסיות במובייל |
| `src/pages/FinancePage.tsx` | tabs רספונסיביים |
| `src/pages/ExpensesPage.tsx` | כרטיסיות במובייל |
| `src/pages/Dashboard.tsx` | התאמות קטנות |
| `src/pages/SettingsPage.tsx` | layout רספונסיבי |
| `src/pages/ReportsPage.tsx` | tabs + charts רספונסיביים |

