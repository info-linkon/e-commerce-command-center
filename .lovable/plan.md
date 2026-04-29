## מטרה

להציג ליד כל פעולה במערכת **מי ביצע אותה** — בלי לפתוח את לוג הפעילות. במקום שיוצג רק "POS" או "ידני" כמקור, יופיע גם שם המשתמש שיצר/עדכן/סגר/ליקט את ההזמנה, וכן ליד העברות מלאי/קופה, הוצאות, קליטות וחשבוניות.

## מה הבעיה היום

- ב־**הזמנה** מוצג רק "מקור: POS / ידני / אתר" — אין אינדיקציה איזה משתמש יצר אותה.
- ב־**ליקוט**: כשמסמנים פריטים, הקוד לא שומר את `picked_by` (למרות שהעמודה קיימת בטבלה).
- ב־**שינויי סטטוס** של הזמנה (סגירה/ביטול): אין שמירה כלל של מי ביצע את השינוי.
- ב־**העברות מלאי / העברות קופה / הוצאות / קליטות / חשבוניות**: השמות של המשתמשים נטענים רק בלוג הפעילות, לא במסכי הצפייה.

## פתרון

### 1. הוק עזר חדש לשמות משתמשים — `useUserNames`

הוק קל שטוען פעם אחת מיפוי `user_id → display_name` (דרך `admin-list-users` עם נפילה ל־profile עצמי), עם cache גלובלי של React Query. יחזיר פונקציה `nameOf(uid)`.

### 2. שמירת זהות מבצע הפעולה (DB + הוקים)

**מיגרציה — הוספת עמודות חדשות לטבלת orders:**
- `completed_by uuid` — מי סגר את ההזמנה (סטטוס `completed`)
- `cancelled_by uuid` — מי ביטל את ההזמנה

**עדכוני קוד:**
- `useTogglePickedItem` (`usePickingItems.ts`) — לשמור `picked_by = auth.uid()` בעת סימון פריט.
- `useUpdateOrderStatus` (`useOrders.ts`) — אם הסטטוס החדש הוא `completed` → לעדכן גם `completed_by`. אם `cancelled` → גם `cancelled_by`.
- `useCancelOrder` — אותו דבר (`cancelled_by`).

### 3. תצוגת "בוצע ע״י" בכל הממשקים

**הזמנה (`OrderDetail.tsx`)** — בתיבת הסיכום מימין, מתחת ל"מקור":
```text
מקור: POS · נוצרה ע״י: כרם
סגרה ע״י: סלים  (אם completed)
ביטלה ע״י: כרם   (אם cancelled)
```

**רשימת הזמנות (`OrdersPage.tsx`)** — להוסיף עמודה "נוצרה ע״י" (מוסתרת במובייל), ולהציג בכרטיס המובייל שורת "ע״י: …".

**ליקוט (`PickingChecklist.tsx`)** — ליד כל פריט מסומן, להציג בקטן מי ליקט אותו ומתי:
```text
✓ מוצר X     ליקט: כרם · 14:32
```

**משלוחים (`InDeliveryPage.tsx` / `DeliveryAssignment.tsx`)** — להציג מי שיבץ את חברת השליחות (`deliveries.created_at` קיים, אך אין `created_by` שם — נסתפק במי שעדכן את הסטטוס דרך לוג הפעילות; אופציונלי בעתיד).

**העברות מלאי (`TransfersPage.tsx`)** — להוסיף עמודה "בוצע ע״י" המציגה את `created_by` המתורגם לשם.

**קופות (`CashRegistersPage.tsx`)** — בטאב "העברות בין קופות", להציג ליד כל העברה את שם המבצע.

**הוצאות (`ExpensesPage.tsx`)** — עמודה "נרשם ע״י".

**קליטות מלאי (`IntakeHistoryPage.tsx`)** — עמודה "נקלט ע״י".

**חשבוניות (`DocumentsPage.tsx`)** — עמודה "הופקה ע״י" (תקח מ־`orders.created_by` של ההזמנה המקושרת, או מ־`invoice_issued_manually` יחד עם השלב הבא: לשמור `invoice_issued_by`). בשלב ראשון נציג רק את שם בעל ההזמנה המקושרת.

### 4. עדכון הזיכרון

לעדכן את `mem://tech/audit-trail` כך שיציין שגם `completed_by`, `cancelled_by`, ו־`picked_by` נשמרים, ושכל המסכים מציגים "בוצע ע״י" אינליין.

## פרטים טכניים

- **מקור שמות**: שימוש חוזר בפונקציית edge הקיימת `admin-list-users` (כבר נטענת בלוג הפעילות). הוק `useUserNames` יקצר את ההמרה למפת lookup, ויהיה משותף לכל הקומפוננטות. עבור משתמשים לא־admin/owner תהיה נפילה לטעינת `profiles` של עצמם בלבד (יראו את שמם, ולא את שאר המשתמשים — מתאים, כי משתמש רגיל גם ככה לא צריך לראות זאת ב־CRM).
- **ביצועים**: `useUserNames` נטען פעם אחת ל־app session (`staleTime: Infinity`, `cacheTime: Infinity`).
- **תאימות לאחור**: הזמנות ישנות ללא `completed_by`/`cancelled_by` יציגו רק "נוצרה ע״י" — בלי שגיאה.
- **RLS**: לא נדרש שינוי. `orders` כבר מאפשר לכל המאומתים לקרוא/לעדכן.
- **עיצוב**: שימוש ב־`text-xs text-muted-foreground` עם אייקון `User` קטן, כדי לשמור על ניקיון. אין צביעה מיוחדת.

## קבצים שיתווספו / ישתנו

- חדש: `src/hooks/useUserNames.ts`
- מיגרציית DB: הוספת `completed_by`, `cancelled_by` לטבלת `orders`
- עדכון: `usePickingItems.ts`, `useOrders.ts`
- עדכון UI: `OrderDetail.tsx`, `OrdersPage.tsx`, `PickingChecklist.tsx`, `TransfersPage.tsx`, `CashRegistersPage.tsx`, `ExpensesPage.tsx`, `IntakeHistoryPage.tsx`, `DocumentsPage.tsx`
- עדכון זיכרון: `mem://tech/audit-trail`
