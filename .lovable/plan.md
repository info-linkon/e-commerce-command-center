## הוספת שכפול וריאציה במארזים

כיום במסך עריכת מארז משתנה (`BundleVariationsManager`) ניתן ליצור, לערוך ולמחוק וריאציות, אך לא לשכפל. נוסיף כפתור "שכפל" לכל שורת וריאציה.

### השינוי
קובץ: `src/components/inventory/BundleVariationsManager.tsx`

- נוסיף ליד כפתורי העריכה/מחיקה של כל וריאציה כפתור עם אייקון `Copy` (lucide-react).
- בלחיצה: שימוש ב-`useCreateBundleVariation` כדי ליצור וריאציה חדשה עם:
  - `name` = `${bv.name} (עותק)`
  - `name_he` = `${bv.name_he} (עותק)` אם קיים
  - `sku` = ריק (כדי למנוע התנגשות SKU)
  - `price` זהה למקור
  - `items` משוכפלים מ-`bundle_variation_items` (variation_id + quantity)
- toast הצלחה: "הוריאציה שוכפלה". toast שגיאה במקרה כשל.

### הערות טכניות
- ה-hook הקיים `useCreateBundleVariation` כבר מטפל בהכנסה ל-`bundle_variations` + `bundle_variation_items`, אז אין צורך בשינויי DB או hooks נוספים.
- אין שינוי לסכמה, אין מיגרציה.
