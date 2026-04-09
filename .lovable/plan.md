

## Plan: Three Fixes — Picking Bundle Breakdown, Arabic Names in POS/Management, Product Images in POS

### 1. Picking Checklist — Expand Bundles to Components

**Problem:** When a bundle is ordered, the picking list shows only the bundle name, not its individual component items. Workers might forget items.

**Solution:** In `PickingChecklist.tsx`, after fetching picking items, detect which items are bundles (by checking `bundles` table via product_id). For each bundle item, fetch its `bundle_items` with their `product_variations(name, products(name, name_ar))` and display them as indented sub-items under the bundle name.

**Changes:**
- `src/components/orders/PickingChecklist.tsx` — Add a secondary query to fetch bundle components for any bundle products in the picking list. Render them as nested items under the bundle parent (visually indented, with quantity × bundle quantity).

### 2. Arabic Names as Primary in POS & Management

**Problem:** Product names in POS cards and management pages show Hebrew (`name`). User wants Arabic (`name_ar`) as the primary display name.

**Changes:**
- `src/pages/PosPage.tsx` — Update the variations query to also fetch `name_ar` from products. Change `product_name` in `GroupedProduct` to use `name_ar || name`. Update all display points (product cards, cart items, variation picker).
- `src/pages/inventory/ProductsPage.tsx` — Show `name_ar || name` in the product list table and mobile cards.

### 3. Product Images in POS

**Problem:** POS product cards are text-only. User wants product images next to names.

**Changes:**
- `src/pages/PosPage.tsx` — Fetch `image_url` from products in the query. Add `image_url` to `GroupedProduct` interface. Display a small thumbnail (e.g. 40×40px) in each product card above/beside the name.

### Files to Modify
1. `src/components/orders/PickingChecklist.tsx` — bundle expansion in picking
2. `src/pages/PosPage.tsx` — Arabic names + product images
3. `src/pages/inventory/ProductsPage.tsx` — Arabic names as primary

### Technical Notes
- Bundle detection: join `order_items.variation_id → product_variations.product_id → bundles.product_id`
- For bundle components: query `bundle_items` with `product_variations(name, products(name, name_ar))` where `bundle_id` matches
- POS query change: `products(name, name_ar, image_url, category_id, is_published)`

