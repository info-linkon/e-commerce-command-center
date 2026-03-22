

# תוכנית: קליטת פריטים חדשים + סנכרון WooCommerce + שיפור קליטת מלאי

## חלק 1: תהליך קליטת פריט חדש עם סנכרון WooCommerce

### מצב נוכחי
- יצירת מוצר (`ProductForm.tsx`) שומרת ל-Supabase בלבד, ללא סנכרון לוו.
- ייצוא לוו קיים רק כפעולה ידנית דרך `woo-sync` (action: `export_products`).

### שינויים

**1. Edge Function חדש: `woo-product-sync`**
- מקבל `product_id` ויוצר/מעדכן מוצר בוו אוטומטית.
- יוצר מוצר חדש (POST) או מעדכן קיים (PUT) לפי `woo_id`.
- מסנכרן וריאציות: יוצר/מעדכן כל וריאציה בוו ושומר `woo_id` חזרה ב-Supabase.
- מסנכרן מלאי לכל וריאציה שנוצרה.

**2. עדכון `useProducts.ts`**
- `useCreateProduct`: אחרי יצירה מוצלחת, קורא ל-`woo-product-sync` (fire-and-forget) אם `is_published === true`.
- `useUpdateProduct`: אותו דבר — סנכרון לוו אחרי עדכון.

**3. עדכון `ProductForm.tsx`**
- הוספת אינדיקציית סנכרון: אם למוצר יש `woo_id` — מציג Badge "מסונכרן" ירוק, אחרת "לא מסונכרן".
- כפתור "סנכרן לוו" ידני למקרה שרוצים לאלץ סנכרון.

**4. שיפור `VariationsManager`**
- אחרי הוספת/עדכון וריאציה, סנכרון אוטומטי לוו.

## חלק 2: שיפור תהליך קליטת מלאי למחסנים

### מצב נוכחי
- `IntakePage.tsx` עובד אבל בסיסי: בחירת מחסן, הוספת פריטים מרשימה, קליטה.
- חסר: מספר מסמך/אסמכתא, שם ספק, היסטוריית קליטות, סיכום לפני אישור.

### שינויים

**1. טבלה חדשה: `intake_sessions`**
```sql
- id (uuid)
- warehouse_id (uuid, FK)
- supplier_name (text, nullable)
- reference_number (text, nullable) — מספר חשבונית/תעודת משלוח
- notes (text, nullable)
- total_items (integer)
- status (enum: draft, completed)
- created_by (uuid, nullable)
- created_at (timestamptz)
```

**2. טבלה חדשה: `intake_session_items`**
```sql
- id (uuid)
- session_id (uuid, FK → intake_sessions)
- variation_id (uuid, FK)
- quantity (integer)
- cost_price (numeric, default 0) — מחיר קניה ליחידה
```

**3. שכתוב `IntakePage.tsx`**
- **שלב 1 — פרטי קליטה**: בחירת מחסן, שם ספק (אופציונלי), מספר אסמכתא (אופציונלי), הערות.
- **שלב 2 — הוספת פריטים**: חיפוש פריטים (לא רק dropdown), הוספת כמות ומחיר עלות לכל פריט.
- **שלב 3 — סיכום ואישור**: תצוגת סיכום של כל הפריטים, סה"כ יחידות, סה"כ עלות, כפתור אישור.
- אחרי אישור: שמירה ל-`intake_sessions` + `intake_session_items`, עדכון מלאי, לוג תנועות, סנכרון וו.

**4. דף היסטוריית קליטות: `IntakeHistoryPage.tsx`**
- רשימת כל הקליטות עם תאריך, מחסן, ספק, מספר פריטים, סטטוס.
- לחיצה על קליטה פותחת פרטים מלאים.

**5. עדכון תפריט הצד**
- שינוי "קליטת מלאי" ל-submenu: "קליטה חדשה" + "היסטוריית קליטות".
- או: הוספת "היסטוריית קליטות" כפריט נפרד תחת מלאי.

## סיכום קבצים

| פעולה | קובץ |
|---|---|
| חדש | `supabase/functions/woo-product-sync/index.ts` |
| חדש | `src/pages/inventory/IntakeHistoryPage.tsx` |
| חדש | `src/hooks/useIntakeSessions.ts` |
| חדש | מיגרציה: `intake_sessions` + `intake_session_items` |
| שינוי | `src/hooks/useProducts.ts` — סנכרון אוטומטי לוו |
| שינוי | `src/pages/inventory/ProductForm.tsx` — Badge סנכרון + כפתור ידני |
| שינוי | `src/pages/inventory/IntakePage.tsx` — שכתוב לתהליך 3-שלבי |
| שינוי | `src/components/layout/AppSidebar.tsx` — הוספת היסטוריית קליטות |
| שינוי | `src/App.tsx` — route חדש |
| שינוי | `supabase/config.toml` — הוספת function חדש |

