

## Plan: Fix Broken Internal Links Missing `/crm/` Prefix

### Broken Links Found

All broken links are admin/CRM pages using `/orders/` instead of `/crm/orders/`:

| File | Line(s) | Broken Link | Fix |
|------|---------|-------------|-----|
| `src/pages/orders/OrdersPage.tsx` | 81, 111, 123, 149 | `/orders/new`, `/orders/${id}` | `/crm/orders/new`, `/crm/orders/${id}` |
| `src/pages/orders/PickingQueuePage.tsx` | 66 | `/orders/${id}` | `/crm/orders/${id}` |
| `src/pages/orders/InDeliveryPage.tsx` | 79 | `/orders/${id}` | `/crm/orders/${id}` |
| `src/pages/deliveries/DeliveriesPage.tsx` | 34, 85 | `/orders/${id}` | `/crm/orders/${id}` |
| `src/components/reports/SalesTab.tsx` | 118 | `/orders/${id}` | `/crm/orders/${id}` |
| `src/components/reports/InventoryLogTab.tsx` | 106 | `/orders/${id}` | `/crm/orders/${id}` |
| `src/components/reports/CashflowTab.tsx` | 140 | `/orders/${id}` | `/crm/orders/${id}` |

### Changes
- 7 files, simple prefix addition of `/crm` to all `to={...}` and `navigate(...)` paths pointing to `/orders/...`

