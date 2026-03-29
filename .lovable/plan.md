

# השלמת מידע מהאתר הנוכחי — elwejha.co.il

## מידע שנאסף מהאתר

| שדה | ערך |
|---|---|
| טלפון | 0526213999 |
| אימייל | info@elwejha.co.il |
| וואטסאפ | 972526573185 |
| פייסבוק | https://www.facebook.com/1094362587370591 |
| אינסטגרם | https://www.instagram.com/elwejha.outdoors |
| מיקום | זיمר — עבודה אונליין, ביקור במחסנים בתיאום מראש |

**תוכן "מי אנחנו":** סיפור המותג — קבוצת חברים שאוהבים טבע ומחנאות, הקימו את "הוג'הא" כדי לספק ציוד איכותי בסגנון מזרחי מסורתי.

**פיצ'רים (features bar):** רضاك مضمون (ضمان 100%), سهولة الشراء, توصيل سريع لكافة المناطق, امكانية الإرجاع

## שינויים

### 1. `src/lib/web-default-content.ts`
- עדכון כל פרטי הקשר: phone, email, whatsapp
- עדכון סושיאל: facebook, instagram
- עדכון תוכן About עם הטקסט האמיתי מהאתר
- עדכון features ל-4 פריטים (רضا, שראء, توصيل, إرجاع)

### 2. `src/components/web/WebLayout.tsx`
- עדכון לינק וואטסאפ מ-`972000000000` ל-`972526573185`

### 3. `src/components/web/WebFooter.tsx`
- הוספת לינקים לפייסבוק ואינסטגרם (אייקונים)
- עדכון טקסט התיאור עם המידע האמיתי
- הוספת טלפון ואימייל

### 4. `src/pages/web/WebAboutPage.tsx`
- החלפת הטקסט הגנרי בתוכן האמיתי מהאתר (סיפור המותג)
- עדכון ה-values ל-4 ערכים אמיתיים

### 5. `src/pages/web/WebContactPage.tsx`
- הפרטים כבר נקראים מ-default content — יתעדכנו אוטומטית

### 6. `src/pages/web/WebHome.tsx`
- עדכון features bar ל-4 פריטים אמיתיים (רצוי + שיי + توصيל + إرجاع)
- עדכון טקסט Hero

### 7. `src/components/web/WebHeader.tsx`
- אין שינוי נדרש

## קבצים

| קובץ | שינוי |
|---|---|
| `src/lib/web-default-content.ts` | עדכון כל הפרטים והתוכן |
| `src/components/web/WebLayout.tsx` | WhatsApp link → 972526573185 |
| `src/components/web/WebFooter.tsx` | הוספת סושיאל + פרטי קשר |
| `src/pages/web/WebAboutPage.tsx` | תוכן אמיתי מהאתר |
| `src/pages/web/WebHome.tsx` | features bar + Hero text |

