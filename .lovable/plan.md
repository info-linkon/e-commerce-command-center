# תוכנית לתיקון 7 הבעיות + מנגנונים למניעת חזרה

המטרה: גם לתקן את הבעיות הקיימות, וגם להוסיף הגנות (וולידציות, fallback, בדיקות אוטומטיות, לוגים) כך שתקלות מהסוג הזה לא יחזרו.

---

## 1. SMS — מגיע רק על הזמנות מהקופה, ולא מהאתר

**מה קורה היום**:
- `web-create-order` שולח `order_created`. אם אצל הלקוח אין תבנית עם `locale` תואם (`he`/`ar`) ואין תבנית גנרית (`locale=NULL`) — `order-sms-trigger` פשוט **מדלג בשקט** ("No matching template for locale"). זה כנראה הסיבה שאתה לא מקבל SMS על הזמנות מהאתר.
- בנוסף, מעברי סטטוס נוספים (paid/shipped/cancelled) לא תמיד שולחים טריגר.

**תיקון**:
- ב-`order-sms-trigger`: אם אין תבנית תואמת locale ואין גנרית — להשתמש ב-תבנית הראשונה הקיימת לאותו `recipient_type` (fallback אחרון), במקום לדלג. ולכתוב ל-`notification_log` שורה `skipped` עם סיבה ברורה כשבאמת לא נשלח כלום.
- לעבור על נקודות הקריאה (`web-create-order`, `hyp-verify`, `useOrders.updateStatus`, `PosPage`, `OrderDetail`, `CompleteOrderDialog`) ולוודא שכל מעבר סטטוס שולח טריגר תואם.

**מניעה לעתיד**:
- **לוג כשלים מפורש**: לכל שליחה (כולל "skipped") לרשום ב-`notification_log` עם `status` ו-`error_reason`. כך תראה ב-`/crm/admin/sms-log` בדיוק למה SMS לא יצא.
- **התראה בדשבורד**: כרטיסיית "SMS לא נשלחו ב-24 שעות אחרונות" עם מספר הכשלים — אם מספר עולה, רואים מיד.
- **טסט אוטומטי לאדג'-פאנקשן**: Deno.test ל-`order-sms-trigger` שמוודא שגם בלי תבנית locale תואמת, הפונקציה מחזירה success עם fallback (לא skip).

---

## 2. לינק חשבונית פותח קובץ ריק

**מה קורה היום**: `InvoiceRedirect` מסנן `status='issued'` AND `doc_url IS NOT NULL`. אם המסמך נשמר בלי `doc_url` תקין (כשל מ-EZcount, או status='pending') — הדף נשבר. אם ה-`doc_url` תקין אבל הקובץ ב-EZcount עוד לא מוכן — נפתח ריק.

**תיקון**:
- ב-`InvoiceRedirect`: להסיר את `eq("status","issued")` (לקבל גם מסמכים `pending`), ולהציג הודעת שגיאה מפורטת לפי המקרה ("המסמך עדיין בהפקה — נסה שוב בעוד דקה", "המסמך לא נמצא", "כשל בהפקה — פנה לתמיכה").
- אם `doc_url` ריק — לנסות `refresh` מ-EZcount (`ezcount-doc` עם action: fetch) לפני שמציגים שגיאה.
- בדיקת DB: לסרוק `documents` של החודש האחרון עם `doc_url IS NULL` ולתקן ידנית מה שאפשר.

**מניעה לעתיד**:
- **וולידציה ב-`ezcount-doc`**: לא לשמור `status='issued'` עד שיש `doc_url` תקין. אם EZcount החזיר שגיאה — לשמור `status='failed'` עם `error_message`.
- **דשבורד מסמכים**: כרטיסיית "מסמכים שנכשלו" ב-`/crm/documents` עם כפתור "נסה שוב". מנהל יראה מיד אם משהו נכשל.
- **בדיקת תקינות לפני שליחת SMS**: ב-CompleteOrderDialog, לוודא ש-`invoiceLink` באמת תקין (HEAD request מהיר) לפני שליחת ה-SMS עם הלינק. אחרת לא לשלוח SMS וליידע במקום זה.

---

## 3. עלות משלוח 50 בהזמנה 293 לא ירדה מהקופה

**מה קורה היום**: ב-`CompleteOrderDialog` השמירה היא רב-שלבית (הוצאה → סטטוס → חשבונית). אם שלב באמצע נכשל — אין rollback. בנוסף `canSubmit` מאפשר submit כשעלות=0, אבל אם המשתמש כתב 50 ואז שכח לבחור קופה — `toast.error` קופץ אבל אין הוכחה שזה מה שקרה.

**תיקון**:
- בדיקה ידנית של הזמנה 293: לבדוק אם קיימת רשומה ב-`expenses` עם `description LIKE 'משלוח להזמנה #293%'`. אם לא — להוסיף ידנית (insert) ולעדכן יתרת הקופה.

**מניעה לעתיד**:
- **טרנזקציה אטומית**: ליצור edge function `complete-order` שעושה את כל ה-3 שלבים (expense + status + invoice) בתוך טרנזקציה אחת ב-DB (RPC). אם שלב נכשל — הכל מתבטל.
- **בדיקה אחרי-המעשה**: trigger ב-DB שמוודא — כשהזמנה עוברת ל-`delivered` ו-`shipping_cost > 0`, חייבת להיות `expense` תואמת. אחרת — לוג ל-`notification_log` עם שגיאה ולא לאפשר את המעבר.
- **דשבורד פערים**: כרטיסיית "הזמנות שנמסרו עם משלוח לא מנוכה" — שאילתת בקרה שמראה הזמנות `delivered`/`completed` עם `shipping_cost > 0` ובלי expense תואמת.

---

## 4. סטטוס חדש "לא מומש"

**מה זה**: סטטוס שמוריד מלאי (כי המוצר יצא פיזית), אבל **לא נכנס לקופה** ו**לא מנפיק חשבונית**. שימוש: לקוח לא הגיע / החליט לא לקחת, אבל ארגנת והמלאי ירד.

**תיקון**:
- מיגרציה: `ALTER TYPE order_status ADD VALUE 'unfulfilled'`.
- לעדכן את כל הסינונים הקיימים בקוד:
  - **מלאי**: להתייחס כמו `completed` (להוריד מהמלאי). לבדוק את `order-inventory.ts` ו-`useOrders.updateStatus`.
  - **כסף נכנס** (`StatsCards`, `CashflowTab`, `Dashboard`, `OverviewTab`): **לא** לכלול תשלומים של הזמנות `unfulfilled`.
  - **דוחות מכירות / רווחיות**: **לא** לכלול ב-revenue אבל **כן** לכלול ב-cost (כי המלאי ירד).
  - **חשבוניות**: לא ליצור אוטומטית.
- להוסיף את הסטטוס ל-`statusLabels` בכל המקומות, ל-Select של שינוי סטטוס ב-`OrderDetail`, ל-badge colors.

**מניעה לעתיד**:
- **טבלת `order_status_config`**: טבלת תצורה (id, label_he, deducts_inventory, counts_as_income, issues_invoice, color) שכל הקוד יקרא ממנה במקום `if status === 'completed'` פזורים. הוספת סטטוס חדש בעתיד תהיה שורה אחת בטבלה, לא 20 שינויים בקוד.
- **טסטים יחידה**: לכל סטטוס — טסט שמוודא איזה תופעות לוואי מתרחשות (inventory↓, payment↑, invoice).

---

## 5. סינון דוחות לפי קטגוריה + ביצועים של כל מוצר

**תיקון**:
- ב-`ReportsPage`: להוסיף `Select` של קטגוריה (טוען מ-`useCategories`, ברירת מחדל "כל הקטגוריות"). להעביר `categoryId` לכל טאב רלוונטי.
- ב-`SalesTab`: סינון לפי `product_variations.products.category_id`. להציג טבלה **מלאה** של כל המוצרים שנמכרו בטווח (לא רק 10 העליונים) עם sort על עמודות (כמות / הכנסות / רווח) + חיפוש בשם + ייצוא CSV.
- להוסיף קישור משם המוצר ל-`/crm/inventory/products/:id` כדי לראות פרטים.

**מניעה לעתיד**:
- **תבנית `ReportFilters` משותפת**: קומפוננטה שמרכזת את הסינונים (תאריך, קטגוריה, מוצר, סטטוס) — כל טאב חדש יקבל את אותם פילטרים בלי כפילות קוד.

---

## 6. אי אפשר להקליד בתיאור מוצר

**מה קורה היום**: ב-`RichTextEditor` יש `dangerouslySetInnerHTML={{ __html: value }}` בתוך `contentEditable`. בכל הקלדה: `onInput` → `onChange(parent)` → re-render → `dangerouslySetInnerHTML` כותב מחדש את ה-HTML → **הסמן קופץ לתחילת השדה / לא ניתן להקליד ברצף**. זה באג קלאסי של contentEditable + React.

**תיקון**:
- להסיר `dangerouslySetInnerHTML` מה-JSX.
- להוסיף `useEffect` שמסנכרן את ה-DOM רק כש-`value` השתנה חיצונית (כש-`editorRef.current.innerHTML !== value`).
- ב-`onInput` להמשיך לעדכן את ה-parent state — אבל בלי שזה יגרום ל-re-write של ה-DOM.

**מניעה לעתיד**:
- **טסט אוטומטי לעורך**: vitest + jsdom — סימולציה של הקלדה ובדיקה שהסמן לא קופץ ושהערך מתעדכן.
- **שיקול שדרוג**: לשקול החלפה של `document.execCommand` (deprecated) ב-Tiptap או Lexical — ספריות שמטפלות בבעיה הזו מהיסוד. (לא חובה עכשיו, אבל לציין כחוב טכני).

---

## 7. מוצר בלי וריאציות שיופיע "אזל מהמלאי" בכרטיס

**מה קורה היום**: `WebProductCard` תומך ב-`outOfStock` כ-prop, אבל ב-`useWebProducts` הוא לא מחושב — לכן בכרטיסי המוצרים בעמודים הראשי/חנות/קטגוריה לא מופיע. רק בעמוד המוצר עצמו הסל נחסם.

**תיקון**:
- ב-`useWebProducts`: לצרף sum של `inventory.quantity` לכל הוריאציות של המוצר (וגם לבדיקת `bundle_variation_items` אם זה bundle). להחזיר `outOfStock: total <= 0`.
- להעביר `outOfStock={p.outOfStock}` בכל הקריאות ל-`<WebProductCard />` (`WebHome`, `WebShopPage`, `WebCategoryPage`, `WebSearchPage`).

**מניעה לעתיד**:
- **View ב-DB**: ליצור `product_stock_summary` view שמחזיר `product_id` + `total_stock`. כל קוד עתידי שצריך מלאי-מוצר יקרא משם — לא יישכח לעולם.
- **בדיקת אינטגרציה**: טסט שמוודא שמוצר עם 0 מלאי מוחזר עם `outOfStock=true`.

---

## סדר ביצוע
1. **קריטי, מהיר**: #6 (תיאור מוצר) + #2 (חשבונית) + #3 (תיקון ידני הזמנה 293)
2. **SMS** (#1) — תיקון fallback + לוג
3. **סטטוס "לא מומש"** (#4) — מיגרציה + עדכון סינונים
4. **דוחות** (#5) — סינון קטגוריה + טבלת מוצרים מלאה
5. **אזל מהמלאי בכרטיסים** (#7)
6. **שכבת מניעה**: דשבורד התראות (SMS שנכשלו / מסמכים שנכשלו / הזמנות עם פערים) + טסטים

---

מאשר להתחיל?