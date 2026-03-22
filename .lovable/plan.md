

# סנכרון סטטוס הזמנות דו-כיווני

## מצב נוכחי

| כיוון | מה עובד | מה חסר |
|---|---|---|
| WooCommerce → מערכת | קבלת הזמנות חדשות + עדכון סטטוס (webhook) | עובד מלא |
| מערכת → WooCommerce | סנכרון מלאי | **סנכרון סטטוס הזמנות חסר** |

כשמשנים סטטוס הזמנה במערכת (processing, completed, cancelled) — WooCommerce לא יודע על זה.

## שינויים נדרשים

### 1. הוספת action `update_order_status` ל-`woo-sync`
- מקבל `order_id` מ-Supabase
- שולף את מספר ההזמנה מה-notes (שם שמור `WooCommerce Order #XXX`)
- מוצא את ההזמנה בוו לפי המספר ומעדכן סטטוס
- מיפוי סטטוסים: pending→on-hold, processing→processing, completed→completed, cancelled→cancelled

### 2. עדכון `useUpdateOrderStatus` ב-`useOrders.ts`
- אחרי עדכון סטטוס מוצלח ב-Supabase, קריאה ל-`woo-sync` עם action `update_order_status` (fire-and-forget)
- רק להזמנות שמקורן `website` (יש להן מספר הזמנה בוו)

### 3. עדכון `useAssignWarehouse` ו-`useCancelOrder`
- שיוך למחסן משנה סטטוס ל-processing → סנכרון לוו
- ביטול הזמנה → סנכרון cancelled לוו

## קבצים לשינוי

| קובץ | שינוי |
|---|---|
| `supabase/functions/woo-sync/index.ts` | הוספת action `update_order_status` |
| `src/hooks/useOrders.ts` | קריאה לסנכרון סטטוס בכל שינוי סטטוס |

