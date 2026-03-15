

# תוכנית יישום מלאה — ELWEJHA

## מצב קיים — מה כבר בנוי ועובד

| רכיב | קיים? | בעיות / חסרונות |
|-------|--------|-----------------|
| מוצרים, וריאציות, מארזים | ✅ | עובד מלא |
| מחסנים, קטגוריות | ✅ | עובד מלא |
| תצוגת מלאי (InventoryIndex) | ✅ | **לא כותב ל-inventory_log**, עדכון ישיר בלבד |
| הזמנות — יצירה, רשימה, צפייה | ✅ | **אין שיוך למחסן**, הורדת מלאי מכל מחסן שיש (לא לפי Allocate on Assignment), **אין inventory_log** |
| POS — מכירה + תשלום + קופה | ✅ | **אין inventory_log**, הורדת מלאי דרך useCreateOrder (אותה בעיה) |
| מסמכים (EZcount) | ✅ | עובד מלא |
| דוחות | ✅ | עובד מלא (5 סוגי דוחות) |
| סנכרון WooCommerce | ✅ | ידני בלבד, אין push אוטומטי של מלאי |
| דשבורד | ✅ | עובד מלא |
| דיאגרמות Flows | ✅ | מעודכן |
| אותנטיקציה | ✅ | עובד מלא |

## מה חסר — 10 שלבים מסודרים

### בלוק A: מלאי (שלבים 1-3)

**שלב 1 — Inventory Log**
- יצירת `src/hooks/useInventoryLog.ts` עם פונקציית עזר `logInventoryChange()` שכותבת ל-`inventory_log`
- שילוב הלוג בכל מקום שמשנה מלאי: `useUpsertInventory` (adjustment), `useCreateOrder` (sale), POS (sale)
- דף צפייה `/inventory/log` — טבלה עם פילטרים (מוצר, מחסן, סוג פעולה, טווח תאריכים)
- Route חדש + קישור בתפריט הצד תחת "מלאי"

**שלב 2 — קליטת מלאי (Intake)**
- דף `/inventory/intake` — בחירת מחסן, בחירת פריטים (וריאציות), כמויות
- בלחיצה "קלוט": עדכון `inventory` + כתיבה ל-`inventory_log` עם `action_type: intake`
- Route + תפריט

**שלב 3 — העברות מלאי (Transfers)**
- דף `/inventory/transfers` — רשימת העברות קיימות
- טופס העברה: מחסן מקור → מחסן יעד, בחירת פריטים + כמויות
- ביצוע: עדכון `inventory` בשני מחסנים + `inventory_log` (transfer_out + transfer_in) + `inventory_transfers` + `inventory_transfer_items`
- Route + תפריט

### בלוק B: Flow הזמנה מלא (שלבים 4-7)

**שלב 4 — שיוך למחסן + הורדת מלאי (Allocate on Assignment)**
- בדף `OrderDetail`: הוספת Select לבחירת מחסן → עדכון `assigned_warehouse_id`
- מיד עם השיוך: הורדת מלאי **מהמחסן הנבחר** + `inventory_log` (action: sale, reference: order.id)
- שינוי `useCreateOrder`: **הסרת** הורדת מלאי הנוכחית (כי עכשיו זה יקרה רק בשיוך)
- כפתור ביטול: שינוי status ל-cancelled + **החזרת מלאי** + `inventory_log` (action: cancellation)

**שלב 5 — ליקוט (Picking)**
- יצירת `order_picking_items` אוטומטית בעת שיוך למחסן
- מסך ליקוט בתוך `OrderDetail`: צ'קליסט פריטים, לחיצה = picked:true + picked_at
- עדכון `picking_status` על ההזמנה (not_started → in_progress → completed)
- טיפול בחוסר: כפתור "פריט חסר" → adjustment ב-inventory_log

**שלב 6 — משלוחים (Deliveries)**
- דף ניהול חברות משלוח `/settings/delivery-companies` — CRUD
- בדף `OrderDetail` (אחרי picking completed): בחירת שליח/חברה → יצירת delivery
- דשבורד משלוחים `/deliveries` — רשימת משלוחים, שינוי סטטוס (pending → in_transit → delivered)

**שלב 7 — תשלום + סגירת הזמנה**
- בדף `OrderDetail` (אחרי delivered): דיאלוג תשלום (מזומן/ביט/אשראי, פיצול)
- כתיבה ל-`payments`, עדכון `cash_register`
- שינוי אוטומטי של status ל-completed

### בלוק C: כספים (שלב 8)

**שלב 8 — קופות + הוצאות**
- דף `/cash-registers` — רשימת קופות עם יתרות, היסטוריית תנועות
- העברת כספים: מקופת עובד/שליח → קופה ראשית (`cash_transfers`)
- דף `/expenses` — רישום הוצאה (תיאור, סכום, מקור תשלום), צירוף מסמך (storage bucket)
- Routes + תפריט

### בלוק D: אוטומציה (שלב 9)

**שלב 9 — סנכרון WooCommerce אוטומטי**
- Edge function `woo-stock-update` — מקבלת variation_id, שולפת כמות כוללת מכל מחסנים, דוחפת ל-WooCommerce API
- קריאה אליה אחרי כל שינוי מלאי
- Edge function `woo-webhook` — קבלת הזמנות חדשות מ-WooCommerce

### בלוק E: דפים חסרים (שלב 10)

**שלב 10 — פריטי אתר + הגדרות**
- `/website-items` — ניהול פרסום/הסתרת מוצרים ב-WooCommerce
- `/settings` — דף הגדרות כללי (חברות משלוח, קופות, משתמשים)

---

## סדר ביצוע מומלץ

```text
בלוק A: שלב 1 → 2 → 3   (מלאי: לוג → קליטה → העברות)
בלוק B: שלב 4 → 5 → 6 → 7   (הזמנה: שיוך → ליקוט → משלוח → תשלום)
בלוק C: שלב 8   (קופות + הוצאות)
בלוק D: שלב 9   (סנכרון אוטומטי)
בלוק E: שלב 10  (דפים משלימים)
```

כל שלב עצמאי ובר-בדיקה. כל הטבלאות ב-DB כבר קיימות — צריך רק קוד frontend + hooks + edge functions.

## קבצים חדשים שייווצרו (סה"כ ~15-20 קבצים)

- `src/hooks/useInventoryLog.ts`
- `src/pages/inventory/InventoryLogPage.tsx`
- `src/pages/inventory/IntakePage.tsx`
- `src/pages/inventory/TransfersPage.tsx`
- `src/hooks/useInventoryTransfers.ts`
- `src/hooks/useDeliveries.ts`
- `src/hooks/useDeliveryCompanies.ts`
- `src/hooks/useExpenses.ts`
- `src/pages/deliveries/DeliveriesPage.tsx`
- `src/pages/settings/DeliveryCompaniesPage.tsx`
- `src/pages/CashRegistersPage.tsx`
- `src/pages/ExpensesPage.tsx`
- `src/pages/WebsiteItemsPage.tsx`
- `src/pages/SettingsPage.tsx`
- `src/components/orders/PickingChecklist.tsx`
- `src/components/orders/PaymentDialog.tsx`
- `src/components/orders/WarehouseAssignment.tsx`
- `supabase/functions/woo-stock-update/index.ts`
- `supabase/functions/woo-webhook/index.ts`

## קבצים קיימים שישתנו

- `src/hooks/useOrders.ts` — הסרת הורדת מלאי מ-useCreateOrder, הוספת useAssignWarehouse, useCancelOrder
- `src/hooks/useInventory.ts` — שילוב inventory_log בכל עדכון
- `src/pages/orders/OrderDetail.tsx` — שיוך מחסן, ליקוט, משלוח, תשלום
- `src/components/layout/AppSidebar.tsx` — הוספת כל הלינקים החדשים
- `src/App.tsx` — הוספת כל ה-routes החדשים
- `src/pages/PosPage.tsx` — שילוב inventory_log

