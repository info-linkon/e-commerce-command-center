

## Plan: Payment Status Indicators on Order Detail

### What we'll add

Three indicators to the order detail page:

1. **Payment link sent indicator** — A badge showing "לינק תשלום נשלח" when `payment_link_url` exists on the order. After successfully sending a payment link, invalidate the order query so the badge appears immediately.

2. **Payment received indicator** — A badge showing whether the customer actually paid via credit. We'll check if a payment record exists in the `payments` table for this order with method "credit". If `hyp_transaction_id` is set OR a credit payment record exists, show a green "שולם באשראי" badge. If payment link was sent but no payment received yet, show an orange "ממתין לתשלום" badge.

3. **Invoice link** — Already partially implemented (the `displayInvoiceUrl` badge exists). We'll ensure it's always visible in the order summary card as well, not just inside the payment section header.

### Files Changed

**`src/components/orders/PaymentSection.tsx`**
- After "שלח לינק תשלום באשראי" button, show a status badge:
  - If `payment_link_url` exists but no credit payment recorded → orange badge "לינק תשלום נשלח — ממתין לתשלום"
  - If credit payment exists or `hyp_transaction_id` set → green badge "שולם באשראי ✓"
- After sending payment link, call `qc.invalidateQueries` for the order to refresh `payment_link_url`
- Add props: `paymentLinkUrl` and `hypTransactionId`

**`src/pages/orders/OrderDetail.tsx`**
- Pass `paymentLinkUrl` and `hypTransactionId` to PaymentSection
- Show invoice link badge in the summary card if `invoice_url` exists (visible even when order is cancelled/completed)

### Technical Details
- `payment_link_url` on orders table = payment link was sent
- `payments` table records with `payment_method = 'credit'` = payment received
- `hyp_transaction_id` on orders = HYP confirmed transaction
- `invoice_url` on orders = invoice document link
- No database changes needed — all data already exists

