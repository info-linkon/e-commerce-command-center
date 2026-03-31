

# 3 עדכונים: תבניות SMS, Meta Pixel + XML Feed, תשלום HYP

## סיכום
שלושה מודולים חדשים: (1) תבניות SMS דרך InforUMobile עם שליחה אוטומטית בשינוי סטטוס הזמנה, (2) Meta Pixel עם דיווח המרות מלא + XML Product Feed ל-Meta Catalog, (3) תשלום באשראי באתר דרך HYP CreditGuard.

---

## 1. תבניות SMS — InforUMobile

### DB
- טבלת `sms_templates`: `id`, `trigger` (enum: `order_created`, `order_shipped`, `order_completed`), `template_text` (עם placeholders כמו `{customer_name}`, `{order_number}`, `{total}`), `active`, `created_at`
- שמירת secrets: `INFORU_USERNAME`, `INFORU_TOKEN`, `INFORU_SENDER`

### Edge Function — `send-sms`
- מקבלת `phone`, `message`
- שולחת POST ל-InforUMobile API: `https://uapi.inforu.co.il/SendMessageXml.ashx` עם XML payload שכולל username, token, message, recipient
- UTF-8 encoding

### Edge Function — `order-sms-trigger`
- מקבלת `order_id`, `trigger_type`
- שולפת הזמנה + תבנית פעילה לאותו trigger
- מחליפה placeholders ושולחת SMS

### Admin UI — דף ניהול תבניות
- `src/pages/admin/SmsTemplatesPage.tsx` — CRUD לתבניות
- בחירת trigger, עריכת טקסט עם placeholders
- לינק מדף ההגדרות

### שילוב אוטומטי
- ב-`OrderDetail.tsx`: כאשר סטטוס הזמנה משתנה, קריאה ל-`order-sms-trigger` עם ה-trigger המתאים

---

## 2. Meta Pixel + XML Feed + דיווח המרות

### Meta Pixel Script
- הוספת Meta Pixel base code ב-`index.html` (עם Pixel ID מ-env / הגדרות)
- **או** דף הגדרות בלוח ניהול לשמירת Pixel ID ב-`site_content`

### אירועי Pixel (Client-side)
- `PageView` — בכל טעינת דף (ב-WebLayout)
- `ViewContent` — בדף מוצר (WebProductPage)
- `AddToCart` — בהוספה לסל
- `InitiateCheckout` — בכניסה לצ'קאאוט
- `Purchase` — בדף אישור הזמנה (WebOrderConfirmation) עם `value`, `currency: ILS`, `content_ids`

### עזר: `src/lib/meta-pixel.ts`
```typescript
export function fbq(event: string, data?: Record<string, any>) {
  if (window.fbq) window.fbq('track', event, data);
}
```

### XML Product Feed — Edge Function
- `supabase/functions/meta-product-feed/index.ts`
- מחזיר XML בפורמט Meta Product Catalog (RSS 2.0)
- שולף כל המוצרים המפורסמים עם מחיר, תמונה, קטגוריה, זמינות, link
- URL: `https://gboskpvfvwrsiqwzpctk.supabase.co/functions/v1/meta-product-feed`
- ניתן להטמיע ב-Meta Business Manager כ-Data Feed

### Conversions API (Server-side) — אופציונלי
- Edge function `meta-capi` לשליחת אירועי Purchase ל-Meta Conversions API (לדיוק גבוה יותר)
- דורש Access Token מ-Meta — נטפל בזה בהמשך אם תרצה

---

## 3. תשלום HYP באתר

### מצב
אין לך עדיין חשבון HYP — צריך לפתוח חשבון ב-[hyp.co.il](https://hyp.co.il). לאחר הפתיחה תקבל:
- `terminal_number` — מספר מסוף
- HYP API URL (production)
- credentials (user/password)

### Edge Function — `hyp-create-payment`
- מקבלת: `order_id`, `total`, `customer_name`, `customer_phone`, `successUrl`, `errorUrl`
- שולחת POST ל-HYP CreditGuard API (`/xpo/Relay`) עם XML payload של `doDeal`
- מחזירה את `mpiHostedPageUrl` (URL של דף התשלום המאובטח)

### תהליך בצ'קאאוט
1. לקוח ממלא פרטים ולוחץ "תשלום"
2. נוצרת הזמנה בסטטוס `pending_payment`
3. קריאה ל-edge function שמחזירה URL של HYP
4. הלקוח מופנה לדף תשלום מאובטח של HYP
5. לאחר תשלום — redirect ל-success URL עם `uniqueID`
6. דף ה-success מעדכן את ההזמנה לסטטוס `pending` + רושם payment

### Edge Function — `hyp-verify-payment` (אופציונלי)
- בדיקת סטטוס עסקה מול HYP לאימות

### DB
- הוספת סטטוס `pending_payment` ל-enum `order_status` (אם לא קיים)
- שמירת `hyp_transaction_id` בהזמנה

### Secrets נדרשים
- `HYP_TERMINAL_NUMBER`
- `HYP_API_URL`
- `HYP_USER`
- `HYP_PASSWORD`

---

## סדר יישום מומלץ

| שלב | נושא | סיבה |
|-----|-------|------|
| 1 | Meta Pixel + XML Feed | לא דורש חשבון חיצוני חדש, Pixel ID כבר יש |
| 2 | תבניות SMS (InforUMobile) | צריך credentials מ-InforU |
| 3 | תשלום HYP | צריך לפתוח חשבון HYP קודם |

## קבצים

| קובץ | שינוי |
|---|---|
| `index.html` | Meta Pixel base script |
| `src/lib/meta-pixel.ts` | חדש — helper function |
| `src/components/web/WebLayout.tsx` | PageView event |
| `src/pages/web/WebProductPage.tsx` | ViewContent event |
| `src/lib/web-cart-store.ts` | AddToCart event |
| `src/pages/web/WebCheckoutPage.tsx` | InitiateCheckout + HYP redirect |
| `src/pages/web/WebOrderConfirmation.tsx` | Purchase event + HYP success handling |
| `supabase/functions/meta-product-feed/index.ts` | חדש — XML feed |
| `supabase/functions/send-sms/index.ts` | חדש — InforUMobile API |
| `supabase/functions/order-sms-trigger/index.ts` | חדש — trigger SMS |
| `supabase/functions/hyp-create-payment/index.ts` | חדש — יצירת עסקה |
| `src/pages/admin/SmsTemplatesPage.tsx` | חדש — ניהול תבניות |
| מיגרציה SQL | טבלת `sms_templates` + enum updates |
| `src/pages/SettingsPage.tsx` | לינקים חדשים (SMS, Pixel) |

