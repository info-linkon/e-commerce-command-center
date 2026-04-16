

# תיקון כתובת API ב-send-otp

## הבעיה
ה-Edge Function `send-otp` משתמש בכתובת שגויה `https://api.linkon.co.il/api/rest/v2/message/send` שלא קיימת (DNS error).

ה-Edge Function `send-sms` (שעובד) משתמש בכתובת הנכונה: `https://capi.inforu.co.il/api/v2/SMS/SendSms`.

## התיקון
עדכון `supabase/functions/send-otp/index.ts` — החלפת כתובת ה-API והתאמת מבנה הבקשה לפורמט של InforU:

- **URL**: `https://api.linkon.co.il/api/rest/v2/message/send` → `https://capi.inforu.co.il/api/v2/SMS/SendSms`
- **Body**: התאמת השדות לפורמט InforU (Message, Recipients עם Phone, Settings עם Sender) — כבר תואם
- **Phone format**: הוספת נרמול מספר לפורמט 972 כמו ב-send-sms
- Deploy מחדש של הפונקציה

## קבצים
- `supabase/functions/send-otp/index.ts` — תיקון URL + נרמול טלפון

