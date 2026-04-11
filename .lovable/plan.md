
## Plan: Fix Order Confirmation Redirect Issue

### Root Cause
In `WebCheckoutPage.tsx` line 254, there's a guard that redirects to `/cart` when `items.length === 0`. For cash orders, `clearCart()` is called on line 213 **before** `navigate()` on line 214. The `clearCart()` triggers a re-render, the guard fires, and the user gets sent to the empty cart page instead of the confirmation page.

### Fix

**File: `src/pages/web/WebCheckoutPage.tsx`**

1. **Move `clearCart()` after `navigate()`** for cash orders (swap lines 213-214)
2. **Move `clearCart()` after `navigate()`** for the pending payment fallback (swap lines 238-239)  
3. **Add a `submittedRef`** to prevent the empty-cart guard from firing during/after submission — the guard on line 254 should also check this ref

```typescript
const submittedRef = useRef(false);

// In submit handler, before navigate:
submittedRef.current = true;

// In the guard:
if (items.length === 0 && !hypPaymentUrl && !submittedRef.current) {
  navigate("/cart");
  return null;
}
```

This ensures the confirmation page is always shown after a successful order, for both cash and credit flows.

### Files Changed
- `src/pages/web/WebCheckoutPage.tsx` — add ref guard + reorder clearCart/navigate calls
