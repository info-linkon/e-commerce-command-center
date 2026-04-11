

## Comprehensive Fix Plan

This plan covers 14 distinct fixes/features across the public website, CRM admin, and database.

---

### 1. Features Strip — Hebrew Content
**File:** `src/pages/web/WebHome.tsx` (lines 165-170)

The 4 feature icons (Shield, ShoppingBag, Truck, RefreshCw) are hardcoded in Arabic only. Wrap title and desc with `t()` to show Hebrew when language is Hebrew:
- "رضاك مضمون" → "שביעות רצון מובטחת"
- "سهولة الشراء" → "קנייה קלה"
- "توصيل سريع" → "משלוח מהיר"
- "إمكانية الإرجاع" → "אפשרות החזרה"

---

### 2. Scroll to Top on Page Navigation
**File:** `src/components/web/WebLayout.tsx`

Add a `ScrollToTop` component using `useLocation` that calls `window.scrollTo(0, 0)` on every route change inside the WebLayout.

---

### 3. Footer — Show ALL Categories
**File:** `src/components/web/WebFooter.tsx` (line 66)

Currently limited to `categories.slice(0, 6)`. Remove the slice to show all categories.

---

### 4. Cart Page — Full Hebrew Translation
**File:** `src/pages/web/WebCartPage.tsx`

All hardcoded Arabic strings need `t()` wrapping:
- "السلة فارغة" → "הסל ריק"
- "لم تقم بإضافة أي منتجات بعد" → "עדיין לא הוספת מוצרים"
- "تصفح المنتجات" → "עיון במוצרים"
- "سلة التسوق" → "סל קניות"
- "ملخص الطلب" → "סיכום הזמנה"
- "المجموع الفرعي" → "סכום ביניים"
- "تكلفة التوصيل" → "עלות משלוח"
- "المجموع" → "סה״כ"
- "إتمام الطلب" → "לסיום הזמנה"
- "إفراغ السلة" → "רוקן סל"

---

### 5. Checkout Page — Full Hebrew Translation
**File:** `src/pages/web/WebCheckoutPage.tsx`

All hardcoded Arabic strings: labels, placeholders, section titles, payment labels, submit button text, breadcrumb, coupon section, totals — all wrapped with `t()`.

---

### 6. Thank You Page — Hebrew Translation
**File:** `src/pages/web/WebOrderConfirmation.tsx`

Wrap all text with `t()` — success, error, pending states. Need to add `useLanguage` import and use `LanguageProvider` context (page is inside WebLayout so it's available).

---

### 7. Order Summary Link + SMS
**Files:** `src/pages/orders/OrderDetail.tsx`, `src/components/orders/PaymentSection.tsx`

Add a "שלח סיכום הזמנה" button in OrderDetail that generates a shareable link like `/order-summary/:orderNumber` and sends it via SMS. Create a new public page `WebOrderSummary.tsx` that shows order details (read-only) for the customer. Add a public view or RLS policy for anonymous access by order_number.

---

### 8. Checkout "تأكيد الطلب" Button — Fix Mobile Overlap
**File:** `src/pages/web/WebCheckoutPage.tsx` (lines 651-684)

The sticky bottom bar is covered by the bottom navigation. Increase `bottom` offset (e.g., `bottom-16`) and ensure it's large enough to tap. Also make the button larger.

---

### 9. Inventory & Bundles — Show Arabic Names
**Files:** `src/pages/inventory/InventoryIndex.tsx`, `src/pages/inventory/BundlesPage.tsx`

In the product name columns, prefer `name_ar || name` instead of just `name`:
- InventoryIndex line 83: `(item.product_variations as any)?.products?.name_ar || ...?.products?.name`
- BundlesPage line 64, 101: `products?.name_ar || products?.name`

---

### 10. Order Statuses — Add "בליקוט" and "במשלוח"
**Database:** Current enum: `pending, processing, completed, cancelled, pending_payment`. Need to add `picking` and `shipping` values.

**Migration:**
```sql
ALTER TYPE order_status ADD VALUE 'picking';
ALTER TYPE order_status ADD VALUE 'shipping';
```

**Files to update:**
- `src/hooks/useOrders.ts` — Update `OrderStatus` type
- `src/pages/orders/OrdersPage.tsx` — Update `statusLabels` and `statusColors`
- `src/pages/orders/OrderDetail.tsx` — Update `statusLabels` and `statusColors`
- SMS triggers: Add `order_picking` and `order_shipping` to sms_trigger enum and update trigger map in OrderDetail

**SMS Migration:**
```sql
ALTER TYPE sms_trigger ADD VALUE 'order_picking';
ALTER TYPE sms_trigger ADD VALUE 'order_shipping';
```

---

### 11. Multi-Category Products
**Database:** Create a junction table `product_categories`:
```sql
CREATE TABLE product_categories (
  product_id uuid REFERENCES products(id) ON DELETE CASCADE,
  category_id uuid REFERENCES categories(id) ON DELETE CASCADE,
  PRIMARY KEY (product_id, category_id)
);
-- Enable RLS, add policies
-- Migrate existing data from products.category_id
INSERT INTO product_categories (product_id, category_id)
SELECT id, category_id FROM products WHERE category_id IS NOT NULL;
```

**Files:**
- `src/pages/inventory/ProductForm.tsx` — Replace single category Select with multi-select checkboxes
- `src/hooks/useProducts.ts` — Update create/update to manage junction table
- `src/hooks/useWebProducts.ts` — Update queries to join via product_categories
- All queries filtering by category_id need updating

---

### 12. Meta Product Feed — Fix Links
**File:** `supabase/functions/meta-product-feed/index.ts` (line 61)

Currently uses `p.id` in the link: `/product/${p.id}`. The website uses `product_number`. Change to `/product/${p.product_number}`.

Also need to add `product_number` to the select query on line 23.

---

### 13. Customers — Extract from Orders
**Database/Script:** Run a one-time data migration to populate the customers table from existing orders:
```sql
INSERT INTO customers (name, phone, email, city)
SELECT DISTINCT ON (customer_phone)
  customer_name, customer_phone, customer_email, shipping_city
FROM orders
WHERE customer_phone IS NOT NULL AND customer_phone != ''
ON CONFLICT DO NOTHING;
```

**Auto-create:** In the checkout flow (`WebCheckoutPage.tsx`) and POS (`PosPage.tsx`), after creating an order, upsert the customer into the customers table. Link the order to the customer via `customer_id`.

---

### 14. Order Completion Button + POS Manual Shipping Price

**Order "הושלמה" button:** In `src/pages/orders/OrderDetail.tsx`, add a prominent "סמן כהושלמה" button when order is in `shipping` status (or after delivery is done).

**POS manual shipping:** In `src/pages/PosPage.tsx`, add a shipping price input field in the create order dialog, allowing the cashier to set a custom shipping cost.

---

### Files Changed Summary
- `src/pages/web/WebHome.tsx` — Hebrew features strip
- `src/components/web/WebLayout.tsx` — Scroll to top
- `src/components/web/WebFooter.tsx` — All categories
- `src/pages/web/WebCartPage.tsx` — Hebrew translation
- `src/pages/web/WebCheckoutPage.tsx` — Hebrew translation + fix sticky button
- `src/pages/web/WebOrderConfirmation.tsx` — Hebrew translation
- `src/pages/web/WebOrderSummary.tsx` — New page (order summary for customer)
- `src/pages/inventory/InventoryIndex.tsx` — Arabic names
- `src/pages/inventory/BundlesPage.tsx` — Arabic names
- `src/pages/orders/OrdersPage.tsx` — New statuses
- `src/pages/orders/OrderDetail.tsx` — New statuses + completion button + SMS summary
- `src/hooks/useOrders.ts` — Updated OrderStatus type
- `src/pages/inventory/ProductForm.tsx` — Multi-category checkboxes
- `src/hooks/useProducts.ts` — Multi-category support
- `src/hooks/useWebProducts.ts` — Multi-category queries
- `src/pages/PosPage.tsx` — Manual shipping price
- `src/pages/customers/CustomersPage.tsx` — Auto-populate
- `supabase/functions/meta-product-feed/index.ts` — Fix product links
- `src/App.tsx` — Add order summary route
- **4 database migrations** (order_status enum, sms_trigger enum, product_categories table, customers seed)

