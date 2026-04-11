

## Plan: Add "Featured" star toggle + "Best Sellers" section on homepage

### 1. Database Migration
Add `is_featured` boolean column to `products` table:
```sql
ALTER TABLE products ADD COLUMN is_featured boolean NOT NULL DEFAULT false;
```

### 2. Products Admin Page — Star Toggle
**`src/pages/inventory/ProductsPage.tsx`**
- Add a star icon column (⭐) to the products table
- Clicking the star toggles `is_featured` on/off via a quick update mutation
- Filled star = featured, empty star = not featured

### 3. Homepage — Featured Products (replace current section)
**`src/pages/web/WebHome.tsx`**
- Change the current "מוצרים מומלצים" section to query only products where `is_featured = true`, limit 12
- If no featured products exist, fall back to showing the latest 8 as today

### 4. Homepage — Best Sellers Section (new)
**`src/hooks/useWebProducts.ts`**
- Add `useWebBestSellers()` hook that queries `order_items` joined with `products`, groups by product, sums quantities, orders by total sold descending, limit 12
- Only include published products

**`src/pages/web/WebHome.tsx`**
- Add a new "רב מכר" / "الأكثر مبيعاً" section below the featured products section
- Display up to 12 best-selling products using `WebProductCard`

### 5. Update Supabase Types
The types file will auto-update after migration to include `is_featured`.

### Files Changed
- **Migration SQL** — add `is_featured` column
- `src/pages/inventory/ProductsPage.tsx` — star toggle column
- `src/hooks/useWebProducts.ts` — add `useWebFeaturedProducts()` and `useWebBestSellers()` hooks
- `src/pages/web/WebHome.tsx` — featured products from DB + new best sellers section
- `src/integrations/supabase/types.ts` — auto-updated

