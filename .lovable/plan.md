
## Plan: Short Branded Payment Link

### Problem
The SMS sends the long Supabase edge function URL. The SPA route `/pay/113` exists but `PaymentRedirect.tsx` queries a non-existent `public_payment_links` table, so it always fails.

### Solution
Fix `PaymentRedirect.tsx` to query the `orders` table (which already has an anon RLS policy for rows with `payment_link_url IS NOT NULL`), then update `hyp-payment-link` to use the branded short URL.

### Changes

**1. Fix `src/pages/web/PaymentRedirect.tsx`**
- Change query from `public_payment_links` to `orders`
- Select `payment_link_url` where `order_number` matches
- The existing RLS policy "Public can read orders with payment links" already allows anon access

**2. Update `supabase/functions/hyp-payment-link/index.ts`**
- Change `shortPaymentUrl` back to `https://elwijha.co.il/pay/${order.order_number}`
- The .htaccess SPA routing + fixed PaymentRedirect component will handle the redirect

### Result
SMS will contain: `https://elwijha.co.il/pay/113` — short and branded.

### Files Changed
- `src/pages/web/PaymentRedirect.tsx` — fix table name from `public_payment_links` to `orders`
- `supabase/functions/hyp-payment-link/index.ts` — use branded domain URL
