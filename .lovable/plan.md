

# רשימת הודעות SMS שנשלחו

## מטרה
הוספת מסך בממשק הניהול שמציג את כל הודעות ה-SMS שנשלחו דרך המערכת — עם פרטי נמען, תוכן, סטטוס, ומקור (טריגר/בדיקה/OTP).

## ניתוח המצב הקיים

### מצב נוכחי
- קיימת טבלה `notification_log` בבסיס הנתונים (לא בשימוש כרגע ע"י קוד ה-SMS).
- הפונקציות `send-sms`, `send-otp`, ו-`order-sms-trigger` שולחות הודעות ל-LINKON אבל **לא כותבות ללוג** במסד הנתונים.
- אין מסך תיעוד/היסטוריה של הודעות SMS שנשלחו.

### מה צריך להוסיף
1. תיעוד אוטומטי של כל הודעת SMS שנשלחת (הצלחות וכישלונות).
2. דף חדש בממשק הניהול: `/crm/admin/sms-log`.
3. כניסה ממסך ההגדרות הראשי (כרטיס חדש).

## הפתרון

### 1. תיעוד הודעות (Edge Functions)
עדכון 3 הפונקציות לרשום כל שליחה ל-`notification_log`:

| פונקציה | event_key | recipient | body |
|---------|-----------|-----------|------|
| `send-sms` | `manual_sms` (או מועבר מ-trigger) | טלפון | הטקסט |
| `send-otp` | `otp_code` | טלפון | "קוד אימות: ****" (מוסתר לאבטחה) |
| `order-sms-trigger` | trigger_type (e.g. `order_created`) | טלפון | טקסט מפוענח |

ה-`status` יקבל `sent` בהצלחה או `failed` בכישלון; ה-`error` יישמר במקרה של כישלון; ה-`provider_message_id` יישמר מתשובת LINKON.

ה-`context` (jsonb) יכלול:
- `order_id` (אם רלוונטי)
- `template_id` (אם רלוונטי)
- `sender` (שם השולח)

### 2. Hook חדש: `useSmsLog`
ב-`src/hooks/useSmsLog.ts`:
- `useSmsLog(filters)` — שאילתה עם פילטרים (תאריך, סטטוס, טקסט חיפוש).
- מבוסס על `notification_log` כשה-`channel = 'sms'`.

### 3. דף חדש: `SmsLogPage`
ב-`src/pages/admin/SmsLogPage.tsx`:
- כותרת + פילטרים: חיפוש (טלפון/טקסט), סטטוס (הכל/נשלח/נכשל), טווח תאריכים.
- כרטיסי סיכום למעלה: סך נשלחו / סך נכשלו / היום.
- טבלה (עם המרה ל-`MobileCardList` במובייל) עם עמודות:
  - תאריך + שעה
  - נמען (טלפון)
  - סוג (manual/otp/order_created/...)
  - תוכן (חתוך עם tooltip לתוכן מלא)
  - סטטוס (בדג' ירוק/אדום)
  - שגיאה (אם יש)
- Pagination — 50 לעמוד.

### 4. ניתוב + ניווט
- הוספת route ב-`src/App.tsx`: `/crm/admin/sms-log` → `SmsLogPage`.
- הוספת כרטיס חדש ב-`SettingsPage.tsx`: "יומן הודעות SMS" עם אייקון `History` או `MessageSquare`.

## פירוט טכני

| קובץ | שינוי |
|------|-------|
| `supabase/functions/send-sms/index.ts` | הוספת insert ל-`notification_log` עם status + error |
| `supabase/functions/send-otp/index.ts` | הוספת insert עם body מוסתר חלקית |
| `supabase/functions/order-sms-trigger/index.ts` | העברת `event_key`, `order_id`, `template_id` ל-`send-sms` (דרך body) |
| `src/hooks/useSmsLog.ts` | חדש — query עם פילטרים |
| `src/pages/admin/SmsLogPage.tsx` | חדש — דף הצגה |
| `src/App.tsx` | route חדש |
| `src/pages/SettingsPage.tsx` | כרטיס חדש |

## שיקולי אבטחה
- קוד ה-OTP יישמר בלוג מוסתר (`****`) — לא שומרים את הקוד עצמו, רק את העובדה שנשלח.
- הדף מוגן ע"י `ProtectedRoute` (תחת `/crm`) — נגיש רק למשתמשי המערכת.

## תוצאה צפויה
- כל הודעת SMS שנשלחת (אוטומטית או ידנית) מתועדת.
- מסך אדמין שמאפשר לראות, לסנן ולחפש בכל ההיסטוריה.
- במקרה של תקלה ב-LINKON — קל לאתר את השגיאה לפי הודעה ספציפית.

