

# תיקון בעיות גלילה במערכת הניהול

## הבעיות שזוהו

לאחר סקירה מקיפה של מערכת הניהול (`AppLayout` + כל דפי `/crm`), זוהו 4 בעיות מובחנות שגורמות לחוויית גלילה לא תקינה:

### 1. `AppLayout` — מבנה תקין אך חסר תמיכה בסרגל דביק בדסקטופ
המעטפת מספקת `overflow-auto` באזור התוכן הראשי, וגם `pb-20` במובייל (לפנות מקום ל-bottom-nav). אבל **בדסקטופ יש רק `pb-6`**, מה שלא מספיק עבור דפים עם Sticky Action Bar (כמו `BundleForm`).

### 2. `PosPage` — חישוב גובה לא תואם
משתמש ב-`h-[calc(100vh-4rem)]` (4rem = 64px). ב-`AppLayout` ה-header הוא `h-12` (48px) + padding של `p-3 sm:p-6` (12-24px). החישוב הזה גורם לאזור המוצרים להיחתך מתחת לקצה הדפדפן (ויוצר double scrollbar במצבים מסוימים).

### 3. `FlowsPage` — `min-h-screen` כפול
הדף עוטף את התוכן ב-`<div className="min-h-screen">` בתוך אזור שכבר מוגבל בגובה ע"י AppLayout. גורם ל-padding מיותר ולגלילה פנימית מיותרת.

### 4. `BundleForm` — Sticky Action Bar מסתיר תוכן בתחתית
הסרגל הוא `fixed bottom-0` עם גובה ~56px, אבל ל-container אין `padding-bottom` שתואם — השדה האחרון בטופס מוסתר חלקית בדסקטופ.

### 5. דיאלוגים גדולים — חוסר עקביות
חלק מהדיאלוגים משתמשים ב-`max-h-[90vh] overflow-y-auto` (טוב) וחלקים אחרים לא — מה שגורם לדיאלוגים ארוכים לחרוג מהמסך במכשירים נמוכים.

## הפתרון

### `AppLayout` (תיקון מרכזי)
- שינוי ה-padding-bottom של אזור התוכן כך שיתאים גם לדפים עם Sticky Bar:
  - `pb-20 md:pb-24` (במקום `pb-20 md:pb-6`) — נותן רווח של ~96px בדסקטופ.
- החלפת `min-h-screen` ב-`h-screen` ב-wrapper כדי לוודא שאזור הגלילה מוגבל לגובה הוויופורט (ולא יוצר scrollbar ב-body).

### `PosPage`
- החלפת `h-[calc(100vh-4rem)]` ב-`h-[calc(100vh-8rem)] md:h-[calc(100vh-7rem)]` — חישוב מדויק שמביא בחשבון header (48px) + padding (24-48px) + bottom-nav במובייל (80px).
- כיוון אחר/פשוט יותר: שינוי ל-`flex-1 min-h-0` כדי לרשת את הגובה מה-parent flex container, ללא חישוב ידני.

### `FlowsPage`
- הסרת `min-h-screen` מה-wrapper הראשי (לא נחוץ בתוך AppLayout).
- שמירת ה-header וה-content ללא שינוי מבני נוסף.

### `BundleForm`
- הוספת `pb-20` ל-wrapper הראשי של הדף כדי לוודא שהשדה האחרון נראה במלואו מעל הסרגל הדביק.

### דיאלוגים — תיקון עקביות
סקירה והוספת `max-h-[90vh] overflow-y-auto` לכל ה-`DialogContent` במערכת הניהול שמכילים טפסים ארוכים (במיוחד ב-`OrderForm`, `ProductForm`, `IntakePage`, `CategoryDialog`, `WarehouseDialog`, ו-`AddOrderItemDialog`).

## פירוט טכני

| קובץ | שינוי |
|------|-------|
| `src/components/layout/AppLayout.tsx` | שינוי `min-h-screen`→`h-screen`, padding `pb-20 md:pb-24` |
| `src/pages/PosPage.tsx` | החלפת `h-[calc(100vh-4rem)]` במבנה flex תקני |
| `src/pages/FlowsPage.tsx` | הסרת `min-h-screen` מה-wrapper |
| `src/pages/inventory/BundleForm.tsx` | הוספת `pb-20` ל-wrapper |
| דיאלוגים שונים (~6 קבצים) | הוספת `max-h-[90vh] overflow-y-auto` ל-DialogContent |

## תוצאה צפויה

- **אין יותר double scrollbar** בשום דף.
- **POS** — אזור המוצרים גולל תקין ללא חיתוך.
- **דפי טפסים ארוכים** (BundleForm, ProductForm, OrderForm) — השדה האחרון נראה תמיד מעל הסרגל הדביק.
- **Flows** — תצוגה רציפה ללא double-padding.
- **דיאלוגים** — תוכן ארוך תמיד גליל ומאופיין נכון על מסכים נמוכים.

