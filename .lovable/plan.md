

## Plan: Remove "bit" payment option, rename "credit" to "תשלום דיגיטלי"

### Changes

**1. `src/pages/PosPage.tsx` (line 573-575)** — Remove bit option, rename credit:
```tsx
<SelectItem value="cash">מזומן</SelectItem>
<SelectItem value="credit">תשלום דיגיטלי</SelectItem>
```

**2. `src/components/orders/PaymentSection.tsx`**
- Line 21: Update labels — remove bit, rename credit to "תשלום דיגיטלי"
- Line 22: Update icons — remove bit, keep credit icon
- Lines 314-316: Remove bit SelectItem, rename credit to "תשלום דיגיטלי"
- Show "שלח לינק תשלום באשראי" button only when order payment method is NOT cash (pass new `paymentMethod` prop)

**3. `src/pages/orders/OrderDetail.tsx`** — Pass `paymentMethod` prop to PaymentSection

**4. `src/components/reports/CashflowTab.tsx` (line 12)** — Update methodLabels: remove bit, rename credit to "תשלום דיגיטלי". Keep backward compatibility so existing "bit" payments still display with a label.

**5. `src/pages/web/PaymentRedirect.tsx`** — Verify redirect query works for anonymous users (fix if needed)

### Technical note
The DB enum `payment_method` still has `bit` as a value — existing bit payments will still display correctly with a fallback label. No DB migration needed.

### Files Changed
- `src/pages/PosPage.tsx`
- `src/components/orders/PaymentSection.tsx`
- `src/pages/orders/OrderDetail.tsx`
- `src/components/reports/CashflowTab.tsx`
- `src/pages/web/PaymentRedirect.tsx`

