---
name: order-access-protection
description: Public order summary page is protected by access_token in URL or phone last-4 verification
type: feature
---
- Each order has `access_token` (6-char random) in `orders` table.
- SMS links from `order-sms-trigger` include `?t={access_token}`.
- `/order/:orderNumber` page (`WebOrderSummary`) reads `?t=` param.
- If no token / invalid → `order-summary` edge fn returns 401 with `requires_phone:true`.
- Page then shows form requesting last 4 digits of customer phone, cached in sessionStorage per order.
- All access checks happen server-side in `order-summary` edge function. RLS on `orders` allows anon SELECT but the page never queries the table directly.
- CRM `OrderDetail` "סיכום הזמנה" button auto-includes `?t=` so admin can preview without verification.
