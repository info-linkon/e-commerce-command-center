# הבעיה

הזמנת "مسند ازرق" (וריאציית מארז כחולה) מציגה בליקוט את הרכיבים של וריאציה אחרת (צהוב). זה לא קשור לתרגום — זו פשוט הוריאציה הלא נכונה של המארז.

## למה זה קורה

ל-`order_items` יש עמודה `bundle_variation_id` שנשמרת נכון בעת ההזמנה (וידאתי על הזמנות 309-312 ב-DB) — היא מציינת איזו וריאציית מארז (צבע) הלקוח בחר.

אבל **שני המקומות** שבונים את שורות הליקוט (`order_picking_items`) מתעלמים מהעמודה הזו ובוחרים תמיד את **וריאציית המארז הראשונה** של ה-bundle:

1. `src/hooks/usePickingItems.ts` (שורות 70-104) — נתיב ה-rebuild שרץ אוטומטית כשנכנסים לעמוד הזמנה של הזמנת אתר. שולף את כל ה-`bundle_variations` של ה-bundle, לוקח את הראשונה (`firstBvPerBundle`) ומושך ממנה את הרכיבים — תמיד אותם רכיבים, לא משנה איזה צבע הוזמן.

2. `src/hooks/useOrders.ts` (שורות 322-337) — נתיב ה-CRM "תהליך הזמנה" שיוצר את שורות הליקוט. שולף `bundle_variations` עם `.limit(1)` ומושך רכיבים מהראשונה.

המשמעות: בכל הזמנת variable_bundle, הליקוט יראה את צבע הוריאציה הוותיקה ביותר במארז (לרוב הצהוב), בלי קשר לבחירת הלקוח.

## התיקון

לקרוא את `bundle_variation_id` ישירות מ-`order_items` ולהשתמש בו כדי לטעון את ה-`bundle_variation_items` המתאימים. ליפול חזרה ל-`bundle_items` רק כש-`bundle_variation_id` ריק (מארזים פשוטים/legacy).

### `src/hooks/usePickingItems.ts` (`rebuildMissingPickingItems`)

- הוספת `bundle_variation_id` ל-SELECT של `order_items`.
- החלפת לוגיקת "first bv per bundle" בטעינת `bundle_variation_items` עבור קבוצת `order_item.bundle_variation_id` שנמצאה בהזמנה הספציפית.
- מיפוי רכיבים לפי `bundle_variation_id` (ולא לפי `bundle_id`), כך שכל שורת הזמנה מקבלת את הרכיבים של הצבע שלה.

### `src/hooks/useOrders.ts` (mutation שמייצרת picking_items)

- שימוש ב-`item.bundle_variation_id` שכבר זמין על שורת ההזמנה במקום `bundle_variations ... limit(1)`.
- אותה נפילה חזרה ל-`bundle_items` כשזה null.

### בדיקה

- הזמנה חדשה של "مسند ازرق" → הליקוט מציג את הרכיבים בצבע כחול.
- הזמנה חדשה של צבע אחר באותו מארז → הליקוט מציג רכיבים בצבע המתאים.
- הזמנת מוצר רגיל (לא bundle) — ללא שינוי.
- מארז simple_bundle (ללא `bundle_variation_id`) — נופל חזרה ל-`bundle_items` כמו היום.

הערה: הזמנות קיימות ש-picking_items שלהן כבר נוצרו בצורה שגויה לא יתוקנו אוטומטית. מי שירצה לתקן הזמנה ישנה יוכל למחוק את שורות הליקוט שלה ב-CRM וה-rebuild יבנה אותן מחדש נכון.
