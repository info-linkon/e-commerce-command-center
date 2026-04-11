

## Plan: Fix Payment Link Redirect

### Problem
The short payment link `https://elwijha.co.il/pay/113` relies on SPA client-side routing. If the custom domain's hosting server doesn't properly forward unknown paths to `index.html`, the page returns a 404 and the customer never reaches the payment page.

### Solution
Replace the SPA-based redirect with a **Supabase Edge Function** that performs a server-side 302 redirect. This is completely independent of the custom domain's hosting configuration.

### Changes

**1. New Edge Function: `supabase/functions/pay-redirect/index.ts`**
- Accepts GET requests with `?order=113`
- Queries the `orders` table for `payment_link_url` where `order_number` matches
- Returns a `302 Redirect` to the HYP payment URL
- Falls back to an error HTML page if order not found

**2. Update `supabase/functions/hyp-payment-link/index.ts`**
- Change `shortPaymentUrl` from `${siteUrl}/pay/${order.order_number}` to the edge function URL:
  `https://gboskpvfvwrsiqwzpctk.supabase.co/functions/v1/pay-redirect?order=${order.order_number}`

**3. Keep `PaymentRedirect.tsx` as fallback**
- The existing SPA route `/pay/:orderNumber` remains functional for cases where the custom domain routing works

### Technical Detail
The edge function URL pattern:
```
https://gboskpvfvwrsiqwzpctk.supabase.co/functions/v1/pay-redirect?order=113
```
This URL always works because it's served by Supabase directly, not by the custom domain's hosting.

### Files Changed
- `supabase/functions/pay-redirect/index.ts` -- new edge function
- `supabase/functions/hyp-payment-link/index.ts` -- update short URL to use edge function

