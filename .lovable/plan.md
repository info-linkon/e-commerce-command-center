

# תיקון אינטגרציית HYP — מעבר מ-CreditGuard ל-HYP Pay Protocol

## הבעיה
המימוש הנוכחי משתמש ב-CreditGuard XML API (שליחת XML ל-`/xpo/Relay`). זה **לא** HYP Pay.
HYP Pay משתמש ב-Pay Protocol — API פשוט מבוסס GET/POST עם redirect לדף תשלום מאובטח.

## תהליך HYP Pay הנכון

```text
1. Edge Function → GET https://pay.hyp.co.il/p/?action=APISign&What=SIGN
   עם: Masof, KEY, PassP, Amount, Order, ClientName, phone, etc.
   ← מקבלים חזרה: פרמטרים חתומים + signature

2. Redirect לקוח → https://pay.hyp.co.il/p/?action=pay&...&signature=...

3. לקוח משלם → redirect ל-success URL עם:
   Id, CCode, Amount, ACode, Order, Sign, etc.

4. אימות → GET https://pay.hyp.co.il/p/?action=APISign&What=VERIFY
   עם: Masof, KEY, PassP + פרמטרים מה-success
   ← CCode=0 = אומת בהצלחה
```

## Credentials נדרשים (שונה מהנוכחי!)

| נוכחי (שגוי) | נכון |
|---|---|
| terminal_number | **Masof** — מספר מסוף (10 ספרות) |
| api_url | לא נדרש — תמיד `https://pay.hyp.co.il/p/` |
| user | **KEY** — API Key מדף ההגדרות |
| password | **PassP** — סיסמת אימות |

## שינויים

### 1. `src/pages/admin/HypSettingsPage.tsx` — עדכון שדות
- הסרת שדות `api_url` ו-`user`
- שינוי לשדות: **Masof** (מספר מסוף), **API Key**, **PassP** (סיסמה)
- שמירה ב-`site_content` כ: `{ masof, api_key, passp }`

### 2. `supabase/functions/hyp-create-payment/index.ts` — שכתוב מלא
- הסרת כל לוגיקת CreditGuard XML
- **Step 1**: שליחת GET ל-`https://pay.hyp.co.il/p/?action=APISign&What=SIGN` עם כל הפרמטרים
- פרמטרים: `Masof`, `KEY`, `PassP`, `Amount`, `Order`, `ClientName`, `phone`, `Info`, `UTF8=True`, `UTF8out=True`, `Sign=True`, `MoreData=True`, `Coin=1`, `PageLang=HEB`, `tmp=1`, `sendemail=True`
- פענוח התשובה — חילוץ ה-`signature`
- בניית URL לדף התשלום: `https://pay.hyp.co.il/p/?action=pay&...&signature=...`
- החזרת ה-URL ללקוח

### 3. `src/pages/web/WebCheckoutPage.tsx` — שילוב תשלום HYP
- אחרי יצירת הזמנה בסטטוס `pending_payment`:
  - קריאה ל-edge function `hyp-create-payment`
  - redirect ל-URL של דף התשלום
- Success URL = `/web/order-confirmation/{order_number}?...`

### 4. `src/pages/web/WebOrderConfirmation.tsx` — טיפול בחזרה מ-HYP
- קריאת פרמטרים מה-URL: `Id`, `CCode`, `ACode`, `Amount`
- אם `CCode=0` → עדכון הזמנה ל-`pending` + רישום payment
- אם `CCode≠0` → הצגת הודעת שגיאה

### 5. (אופציונלי) Edge Function `hyp-verify-payment` — אימות
- שליחת GET עם `action=APISign&What=VERIFY` + פרמטרים מה-success
- אימות שה-`CCode=0`

## קבצים

| קובץ | שינוי |
|---|---|
| `src/pages/admin/HypSettingsPage.tsx` | עדכון שדות ל-Masof, API Key, PassP |
| `supabase/functions/hyp-create-payment/index.ts` | שכתוב — HYP Pay Protocol במקום CreditGuard |
| `src/pages/web/WebCheckoutPage.tsx` | שילוב redirect לתשלום HYP |
| `src/pages/web/WebOrderConfirmation.tsx` | טיפול בחזרה מ-HYP + אימות |

