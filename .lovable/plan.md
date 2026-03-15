

# עדכון דיאגרמת Flow הזמנה

## שינויים בקובץ `src/pages/FlowsPage.tsx`

### 1. עדכון הדיאגרמה הראשונה (order-flow)
- הורדת מלאי (`inventory & inventory_log`) תזוז מיד אחרי שיוך למחסן (אחרי `assigned_warehouse_id`)
- סנכרון מלאי ל-WooCommerce יבוא מיד אחרי הורדת המלאי
- הליקוט יהפוך לאימות פיזי בלבד (לא משפיע על מלאי)
- הוספת ענף ביטול: מכל שלב לפני delivered, ביטול מחזיר מלאי (`action_type: cancellation`) + סנכרון WooCommerce
- הוספת ענף חוסר בליקוט: אם פריט חסר → התאמת מלאי (`adjustment`)

### 2. מבנה הדיאגרמה החדשה
```text
Order → Assign Warehouse → Deduct Inventory → Sync WooCommerce
  → Picking (verification only)
    → Item missing? → Adjustment flow
    → All picked? → Delivery → Payment → Complete
  → Cancel at any point? → Restore inventory → Sync WooCommerce
```

קובץ אחד לעריכה: `src/pages/FlowsPage.tsx` (עדכון ה-diagram string של order-flow בלבד).

