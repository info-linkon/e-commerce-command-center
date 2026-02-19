
# Flow מלא A-Z - מערכת ELWEJHA

## סקירת המערכת הקיימת לעומת מה שחסר

### קיים כבר
- ניהול מוצרים, וריאציות, מארזים, קטגוריות
- ניהול מחסנים ומלאי בסיסי (כמויות)
- הזמנות עם סטטוסים (pending/processing/completed/cancelled)
- קופה (POS) עם תשלומים (מזומן/ביט/אשראי)
- קופות מזומנים עם יתרות
- מסמכים חשבונאיים (EZCount)
- סנכרון WooCommerce
- דוחות (מכירות, מוצרים, מלאי, תשלומים, רווחיות)

### חסר - צריך לבנות

---

## 1. לוג מלאי (Inventory Log)

כל שינוי מלאי נרשם בטבלת `inventory_log` עם סוג הפעולה.

**טבלה חדשה: `inventory_log`**
| עמודה | סוג | תיאור |
|---|---|---|
| id | uuid | מזהה |
| variation_id | uuid | הפריט |
| warehouse_id | uuid | המחסן |
| quantity_change | integer | שינוי (חיובי=קליטה, שלילי=מכירה) |
| quantity_after | integer | כמות אחרי השינוי |
| action_type | enum | `intake`, `sale`, `transfer_in`, `transfer_out`, `adjustment` |
| reference_id | uuid | מזהה הזמנה/העברה |
| notes | text | הערות |
| created_by | uuid | המשתמש שביצע |
| created_at | timestamptz | תאריך |

**UI: דף לוג מלאי**
- טבלה עם כל הפעולות, פילטר לפי פריט/מחסן/סוג פעולה/תאריך
- נגיש מתוך תת-תפריט "מלאי"

---

## 2. קליטת מלאי חדש (Intake)

**UI: דף/דיאלוג קליטת מלאי**
- בחירת מחסן יעד
- הוספת שורות: פריט (וריאציה), כמות
- אפשרות להוסיף פריטים חדשים ישירות מתוך הקליטה
- כפתור "קלוט מלאי" -- מעדכן טבלת inventory ורושם בלוג

---

## 3. העברת מלאי בין מחסנים (Transfer)

**טבלה חדשה: `inventory_transfers`**
| עמודה | סוג | תיאור |
|---|---|---|
| id | uuid | מזהה |
| from_warehouse_id | uuid | מחסן מקור |
| to_warehouse_id | uuid | מחסן יעד |
| status | enum | `pending`, `completed` |
| notes | text | הערות |
| created_by | uuid | מבצע |
| created_at | timestamptz | תאריך |

**טבלה חדשה: `inventory_transfer_items`**
| עמודה | סוג | תיאור |
|---|---|---|
| id | uuid | מזהה |
| transfer_id | uuid | FK |
| variation_id | uuid | הפריט |
| quantity | integer | כמות |

**UI: דף העברות מלאי**
- יצירת העברה: בחירת מחסן מקור ויעד, שורות פריטים + כמויות
- אישור העברה מעדכן מלאי בשני המחסנים ורושם בלוג

---

## 4. התאמת מלאי ידנית (Adjustment)

עדכון כמות ישירות בדף תצוגת מלאי (קיים חלקית) -- אבל עכשיו כל שינוי יירשם בלוג עם סוג `adjustment` ואפשרות לרשום סיבה.

---

## 5. שיוך הזמנה למחסן + ליקוט

**שינויים בטבלת `orders`:**
- `assigned_warehouse_id` (uuid) -- המחסן שמלקט
- `assigned_user_id` (uuid) -- העובד שמלקט
- `picking_status` (enum: `not_started`, `in_progress`, `completed`)

**טבלה חדשה: `order_picking_items`**
| עמודה | סוג | תיאור |
|---|---|---|
| id | uuid | מזהה |
| order_id | uuid | FK |
| order_item_id | uuid | FK לפריט בהזמנה |
| picked | boolean | האם לוקט |
| picked_at | timestamptz | מתי |
| picked_by | uuid | מי ליקט |

**Flow ליקוט:**
1. הזמנה נכנסת (מהאתר או ידנית) -- סטטוס `pending`
2. משייכים למחסן ולעובד -- סטטוס `processing`, ליקוט `not_started`
3. העובד נכנס למסך ליקוט, רואה את כל הפריטים, מסמן כל פריט שלקט
4. כשכל הפריטים סומנו -- ליקוט `completed`
5. ממשיכים לשלב משלוח

**UI: מסך ליקוט**
- רשימת הזמנות שמשויכות לעובד הנוכחי / למחסן מסוים
- לחיצה על הזמנה -- צ'קליסט פריטים עם כפתור "נלקט" לכל פריט
- כפתור "סיום ליקוט" כשהכל מסומן

---

## 6. משלוחים (Deliveries)

**טבלה חדשה: `delivery_companies`**
| עמודה | סוג | תיאור |
|---|---|---|
| id | uuid | מזהה |
| name | text | שם (עובד / חברה חיצונית) |
| is_internal | boolean | האם עובד פנימי |
| cash_register_id | uuid | קופה משויכת |
| is_active | boolean | פעיל |

**טבלה חדשה: `deliveries`**
| עמודה | סוג | תיאור |
|---|---|---|
| id | uuid | מזהה |
| order_id | uuid | FK |
| delivery_company_id | uuid | FK |
| status | enum | `pending`, `in_transit`, `delivered` |
| notes | text | הערות |
| delivered_at | timestamptz | תאריך מסירה |
| created_at | timestamptz | תאריך יצירה |

**Flow משלוח:**
1. אחרי ליקוט -- בוחרים שליח (עובד או חברה חיצונית)
2. סטטוס משלוח: `pending` -> `in_transit` -> `delivered`
3. כש-delivered: רושמים תשלום בקופה של השליח/חברה
4. הזמנה עוברת ל-`completed`

**UI: דשבורד משלוחים**
- רשימת כל המשלוחים הפתוחים
- פילטר לפי סטטוס, שליח
- עדכון סטטוס + אישור קבלת כסף

---

## 7. קופות - Flow כסף מלא

**שינויים:**
- כל שליח/חברת משלוחים מקבלים קופה משלהם אוטומטית
- קופה ראשית (main) -- אליה מעבירים כסף מקופות עובדים
- כל תשלום משויך להזמנה (כבר קיים בטבלת `payments`)

**פעולות חדשות:**
- העברת כסף מקופת עובד/שליח לקופה ראשית (איפוס קופה מקומית)
- רישום הוצאות מקופה (ראה סעיף הבא)

**טבלה חדשה: `cash_transfers`**
| עמודה | סוג | תיאור |
|---|---|---|
| id | uuid | מזהה |
| from_register_id | uuid | קופת מקור |
| to_register_id | uuid | קופת יעד |
| amount | numeric | סכום |
| notes | text | הערות |
| created_by | uuid | מבצע |
| created_at | timestamptz | תאריך |

---

## 8. הוצאות עסקיות (Expenses)

**טבלה חדשה: `expenses`**
| עמודה | סוג | תיאור |
|---|---|---|
| id | uuid | מזהה |
| description | text | תיאור ההוצאה (טקסט חופשי) |
| amount | numeric | סכום |
| payment_source | enum | `credit_card`, `cash_register` |
| cash_register_id | uuid | אם מקופה -- איזו קופה (nullable) |
| document_url | text | קישור למסמך חשבונאי (nullable) |
| document_file | text | קובץ מצורף (nullable) |
| created_by | uuid | העובד שרשם |
| created_at | timestamptz | תאריך |

**UI: דף הוצאות**
- רשימת הוצאות עם פילטרים
- טופס הוספת הוצאה: תיאור, סכום, מקור תשלום (אשראי עסק או בחירת קופה), צירוף מסמך
- כש-payment_source = `cash_register`: יורד אוטומטית מהקופה

---

## 9. סנכרון WooCommerce בזמן אמת

**מה קיים:** Edge function `woo-sync` לסנכרון ידני.

**מה חסר:**
- Webhook מ-WooCommerce: כשנכנסת הזמנה חדשה באתר -- נכנסת אוטומטית למערכת
- סנכרון מלאי: כשמשתנה מלאי במערכת -- מתעדכן באתר
- סנכרון מוצרים: שינוי מוצר/מחיר -- מתעדכן באתר

**Edge function חדשה: `woo-webhook`**
- מקבלת webhook מ-WooCommerce על הזמנות חדשות
- יוצרת הזמנה במערכת עם `source = 'website'`
- מעדכנת מלאי בהתאם

**עדכון `woo-sync`:**
- Push מלאי ומחירים ל-WooCommerce אחרי כל שינוי

---

## Flow מלא A-Z

```text
                    +------------------+
                    |   מקורות מכירה   |
                    +--------+---------+
                             |
              +--------------+---------------+
              |                              |
     +--------v--------+          +---------v---------+
     |   אתר (WooComm)  |         |   קופה (POS)      |
     |   webhook אוטו   |         |   ידנית            |
     +---------+--------+         +---------+----------+
               |                            |
               +----------+---------+-------+
                          |
                 +--------v---------+
                 |   הזמנה חדשה     |
                 |   status=pending |
                 +--------+---------+
                          |
                 +--------v---------+
                 | שיוך למחסן+עובד  |
                 | status=processing|
                 +--------+---------+
                          |
                 +--------v---------+
                 |   מסך ליקוט      |
                 |   צ'קליסט פריטים |
                 +--------+---------+
                          |
                 +--------v---------+
                 |  בחירת שליח      |
                 |  (עובד/חברה)     |
                 +--------+---------+
                          |
                 +--------v---------+
                 |   משלוח בדרך     |
                 +--------+---------+
                          |
                 +--------v---------+
                 |   נמסר + תשלום   |
                 |  כסף -> קופת     |
                 |  שליח/חברה       |
                 +--------+---------+
                          |
                 +--------v---------+
                 | status=completed  |
                 | מלאי ירד בלוג    |
                 +--------+---------+


     +-------------------------------------------+
     |            ניהול מלאי                      |
     |  קליטה -> לוג                             |
     |  העברה בין מחסנים -> לוג                   |
     |  מכירה (אוטו מהזמנה) -> לוג               |
     |  התאמה ידנית -> לוג                        |
     |  סנכרון מלאי <-> WooCommerce               |
     +-------------------------------------------+

     +-------------------------------------------+
     |            ניהול קופות                     |
     |  קופה לכל עובד + שליח + חברה              |
     |  קופה ראשית                               |
     |  כסף ממכירה -> קופת עובד/שליח             |
     |  העברה לקופה ראשית (איפוס)                 |
     |  הוצאה -> יורד מקופה/אשראי עסק            |
     +-------------------------------------------+

     +-------------------------------------------+
     |            מסמכים                          |
     |  חשבונית מס / קבלה / ת.משלוח (EZCount)    |
     |  הוצאות עם מסמך חשבונאי מצורף             |
     +-------------------------------------------+
```

---

## סדר יישום מומלץ

1. **לוג מלאי** -- טבלה + רישום אוטומטי מכל פעולת מלאי
2. **קליטת מלאי** -- UI + לוג
3. **העברת מלאי** -- טבלאות + UI + לוג
4. **שיוך הזמנה למחסן + ליקוט** -- עמודות חדשות + מסך ליקוט
5. **חברות/שליחים + משלוחים** -- טבלאות + דשבורד משלוחים
6. **Flow קופות מלא** -- העברות כסף + חיבור לשליחים
7. **הוצאות** -- טבלה + UI
8. **WooCommerce webhook** -- הזמנות אוטומטיות + סנכרון מלאי

---

## פרטים טכניים

### טבלאות חדשות (8)
- `inventory_log`
- `inventory_transfers`
- `inventory_transfer_items`
- `order_picking_items`
- `delivery_companies`
- `deliveries`
- `cash_transfers`
- `expenses`

### עמודות חדשות בטבלאות קיימות
- `orders`: `assigned_warehouse_id`, `assigned_user_id`, `picking_status`

### Enum types חדשים
- `inventory_action_type`: intake, sale, transfer_in, transfer_out, adjustment
- `picking_status`: not_started, in_progress, completed
- `delivery_status`: pending, in_transit, delivered
- `expense_payment_source`: credit_card, cash_register
- `transfer_status`: pending, completed

### דפים חדשים
- `/inventory/log` -- לוג מלאי
- `/inventory/intake` -- קליטת מלאי
- `/inventory/transfers` -- העברות מלאי
- `/orders/:id/picking` -- מסך ליקוט
- `/deliveries` -- דשבורד משלוחים
- `/expenses` -- הוצאות
- `/cash/transfers` -- העברות כסף בין קופות

### Edge functions
- `woo-webhook` -- קליטת הזמנות מ-WooCommerce

### RLS
- כל הטבלאות החדשות עם RLS: authenticated users can manage (כמו הטבלאות הקיימות, ללא חלוקת תפקידים)
