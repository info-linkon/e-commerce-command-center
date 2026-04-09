

## Plan: Invoice Receipt Integration in Payment Flow + Save to Order

### What
1. Add `invoice_url` column to `orders` table to store the EZCount document link
2. In the cash payment dialog, add a toggle to issue a tax invoice/receipt (חשבונית מס קבלה) -- only if no existing invoice_receipt (type 320) document exists for that order
3. After successful payment + invoice creation, save the `doc_url` to `orders.invoice_url`
4. In the credit card flow (`hyp-verify-payment`), automatically issue an invoice_receipt via EZCount and save the URL to the order
5. Display the invoice link in the order detail page

### Changes

#### 1. Database Migration
Add `invoice_url` column to `orders`:
```sql
ALTER TABLE orders ADD COLUMN invoice_url text;
```

#### 2. `PaymentSection.tsx` - Add invoice toggle for cash payments
- Accept new props: `customerName`, `customerEmail`, `customerPhone`, `orderNumber`, `orderItems` (from order data)
- Query existing documents for this order to check if a type 320 doc already exists
- Add a `Switch` toggle "הנפק חשבונית מס קבלה" that appears only when:
  - At least one payment line is cash
  - No existing invoice_receipt (type 320) for this order
- On submit success, if toggle is on, call `useCreateDocument` with the order data, then save `doc_url` to `orders.invoice_url`

#### 3. `OrderDetail.tsx` - Pass order data to PaymentSection
Pass `customerName`, `customerEmail`, `customerPhone`, `orderNumber`, `orderItems` props

#### 4. `OrderDetail.tsx` - Show invoice link
Display a link/badge when `order.invoice_url` is set

#### 5. `hyp-verify-payment/index.ts` - Auto-issue invoice on credit payment
After verifying credit payment successfully:
- Fetch order items from DB
- Call the `ezcount-doc` function internally to create an invoice_receipt (type 320)
- Save the returned `doc_url` to `orders.invoice_url`

#### 6. `ezcount-doc/index.ts` - Return doc_url in response
Already returns `doc_url` — just ensure it's used correctly by callers

### Technical Details

**Check for existing invoice:**
```tsx
const { data: existingDocs } = useQuery({
  queryKey: ["documents", orderId, "invoice_receipt"],
  queryFn: async () => {
    const { data } = await supabase.from("documents")
      .select("id, doc_url").eq("order_id", orderId).eq("doc_type", 320).eq("status", "issued");
    return data;
  }
});
const hasInvoiceReceipt = existingDocs && existingDocs.length > 0;
```

**Auto-invoice in hyp-verify-payment (credit):**
```typescript
// After payment verified, call ezcount-doc internally
const ezRes = await fetch(`${supabaseUrl}/functions/v1/ezcount-doc`, {
  method: "POST",
  headers: { "Content-Type": "application/json", "Authorization": `Bearer ${supabaseKey}` },
  body: JSON.stringify({
    doc_type: "invoice_receipt",
    order_id, customer_name, items, payments: [{ type: "credit", amount }]
  })
});
const ezData = await ezRes.json();
if (ezData.success) {
  await supabase.from("orders").update({ invoice_url: ezData.doc_url }).eq("id", order_id);
}
```

### Files
1. **Migration** — add `invoice_url` to orders
2. `src/components/orders/PaymentSection.tsx` — add invoice toggle + logic
3. `src/pages/orders/OrderDetail.tsx` — pass props + show invoice link
4. `supabase/functions/hyp-verify-payment/index.ts` — auto-issue invoice on credit
5. `src/hooks/usePayments.ts` — save invoice_url after document creation

