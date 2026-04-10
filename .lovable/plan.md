

## Plan: Fix Bundle Shipping Price Not Saving

### Problem
The `useBundle` and `useBundles` hooks fetch specific product fields but **don't include `shipping_price`** in the select query. When editing a bundle, the shipping price loads as `0` (default) instead of the saved value, and even if you set it, the form resets it on load.

### Fix
Two lines to change in `src/hooks/useBundles.ts`:

1. **Line 12** (`useBundles` select): Add `shipping_price` to the products fields
2. **Line 27** (`useBundle` select): Add `shipping_price` to the products fields

Both select strings need `shipping_price` added after `cost_price` in the products sub-select.

