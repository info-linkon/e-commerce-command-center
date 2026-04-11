

## Plan: Fix credit payment recording and display issues

### Problem
Two issues when handling credit orders from the admin panel:

1. **"Record payment" dialog records credit as paid immediately** — When you open the payment dialog, select "credit" and click confirm, it records the payment and marks the order as completed without actually collecting money. The user expected a payment link to be sent instead.

2. **"שולם" badge shows for all credit/bit orders** — In OrderDetail (line 241-243), a green "שולם" badge appears whenever `payment_method === "credit"`, regardless of whether payment was actually received. This is misleading.

### Root cause (Order #102)
The order was created, then someone used the "record payment" dialog choosing "credit" as method. This inserted a payment record (₪100) and marked the order as completed — without any actual payment being collected. The "send payment link" button exists separately below the dialog but was likely overlooked.

### Fix

**1. OrderDetail.tsx — Fix misleading "שולם" badge (line 241-243)**

Remove the badge that shows "שולם" based solely on `payment_method`. Instead, only show "שולם" when the order status is actually `completed`.

```tsx
// Before:
{((order as any).payment_method === "credit" || (order as any).payment_method === "bit") && (
  <Badge className="bg-green-100 text-green-800 border-0 text-xs">שולם</Badge>
)}

// After: Remove this entirely — the PaymentSection already shows payment status correctly
```

**2. PaymentSection.tsx — Make "send payment link" more prominent for unpaid credit orders**

When there are no existing payments and the customer has a phone number, show the "send payment link" button **above** the manual payment dialog, with a visual separator. Add a note that the "record payment" button is for payments already received.

**3. PaymentSection.tsx — Add warning when recording credit payment manually**

In the payment dialog, when the user selects "credit" method, show a small warning: "שים לב: פעולה זו מסמנת תשלום שהתקבל. לשליחת לינק תשלום ללקוח, השתמש בכפתור 'שלח לינק תשלום'" (Note: this action marks payment as received. To send a payment link to the customer, use the 'send payment link' button).

### Files Changed
- `src/pages/orders/OrderDetail.tsx` — remove misleading "שולם" badge for credit/bit
- `src/components/orders/PaymentSection.tsx` — reorder buttons, add credit recording warning

