

## Plan: Payment Link via SMS for POS Orders

### Overview
Add a "Send Payment Link" button to the Payment section on the order detail page. When clicked, the system generates a HYP credit card payment link, sends it to the customer via SMS, and after the customer pays, the order is automatically marked as paid with an invoice receipt.

### How It Works

```text
Manager clicks "שלח לינק תשלום" 
  → Edge Function generates HYP payment URL
  → SMS sent to customer with the link
  → Customer opens link, pays via credit card
  → HYP redirects to confirmation page
  → hyp-verify-payment auto-updates order status + creates invoice
```

### Changes

**1. New Edge Function: `hyp-payment-link`**
- Combines `hyp-create-payment` + `send-sms` into one call
- Generates the HYP payment URL with success/error URLs pointing to the public web order confirmation page
- Sends SMS with the payment link to the customer's phone
- Returns success/failure to the UI

**2. Update `PaymentSection.tsx`**
- Add a "שלח לינק תשלום באשראי" button (visible when order is unpaid and customer has a phone number)
- Button calls the new edge function
- Shows loading state while sending
- Toast notification on success/failure

**3. Update `hyp-verify-payment` (minor)**
- Ensure the success URL from the SMS flow triggers the same verification + invoice logic already in place
- Add SMS notification trigger (`order_completed`) after successful payment verification

**4. Update `supabase/config.toml`**
- Register the new `hyp-payment-link` function with `verify_jwt = false`

### Technical Details

- The HYP payment URL uses `tmp=1` (standalone page, not iframe template 7) so it works in mobile browsers
- Success URL: `{site_url}/web/order-confirmation?order_id={id}&CCode=0`
- The existing `WebOrderConfirmation` page already handles HYP return params and calls `hyp-verify-payment`
- Invoice receipt is auto-issued by the existing logic in `hyp-verify-payment`
- SMS message template: `שלום {customer_name}, לתשלום הזמנה #{order_number} בסך ₪{total} לחץ כאן: {payment_url}`

