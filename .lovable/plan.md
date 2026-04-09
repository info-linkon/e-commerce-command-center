

## Plan: Swap URL Structure — Website at `/`, Admin at `/crm`

### Current State
- **Admin panel**: `/`, `/dashboard`, `/inventory/*`, `/orders/*`, `/pos`, etc.
- **Public website**: `/web`, `/web/shop`, `/web/product/:id`, etc.
- **Auth**: `/auth`
- **Invoice redirect**: `/inv/:code`

### Target State
- **Public website**: `/`, `/shop`, `/product/:id`, `/cart`, `/checkout`, etc.
- **Admin panel**: `/crm`, `/crm/dashboard`, `/crm/inventory/*`, `/crm/orders/*`, etc.
- **Auth**: `/crm/auth`
- **Invoice redirect**: `/inv/:code` (unchanged)

### Files to Update

**1. `src/App.tsx` — Route definitions**
- Website routes: remove `/web` prefix → `/`, `/shop`, `/category/:id`, `/product/:id`, `/cart`, `/checkout`, `/order-confirmation/:orderNumber?`, `/search`, `/about`, `/contact`
- Admin routes: add `/crm` prefix → `/crm`, `/crm/dashboard`, `/crm/inventory/*`, `/crm/orders/*`, `/crm/pos`, `/crm/finance`, etc.
- Auth route: `/auth` → `/crm/auth`
- Admin sub-routes: `/admin/*` → `/crm/admin/*`
- `/inv/:code` stays unchanged

**2. `src/components/layout/ProtectedRoute.tsx`**
- Redirect to `/crm/auth` instead of `/auth`

**3. `src/pages/Auth.tsx`**
- Redirect after login to `/crm/dashboard`

**4. `src/pages/Index.tsx`**
- No longer needed (root is now website)

**5. `src/components/layout/AppSidebar.tsx`**
- All menu URLs: prefix with `/crm` (e.g., `/crm/dashboard`, `/crm/inventory`, `/crm/customers`)
- "צפה באתר" link: change from `/web` to `/`

**6. `src/components/web/WebHeader.tsx`**
- All nav links: `/web` → `/`, `/web/shop` → `/shop`, etc.

**7. `src/components/web/WebBottomNav.tsx`**
- All nav items: remove `/web` prefix

**8. `src/components/web/WebFooter.tsx`**
- All links: remove `/web` prefix

**9. `src/components/web/WebProductCard.tsx`**
- Product links: `/web/product/` → `/product/`

**10. `src/pages/web/WebHome.tsx`**
- All internal links: remove `/web` prefix

**11. `src/pages/web/WebShopPage.tsx`**
- Category links: `/web/category/` → `/category/`

**12. `src/pages/web/WebAboutPage.tsx`**
- Shop link: `/web/shop` → `/shop`

**13. `src/pages/web/WebCartPage.tsx`**
- Links: `/web/shop` → `/shop`, `/web/checkout` → `/checkout`

**14. `src/pages/web/WebCheckoutPage.tsx`**
- All navigations and URLs: remove `/web` prefix

**15. `src/pages/web/WebOrderConfirmation.tsx`**
- Links: `/web` → `/`

**16. `src/lib/web-default-content.ts`**
- Default CTA link: `/web/shop` → `/shop`

**17. Admin pages with navigate calls** (add `/crm` prefix):
- `src/pages/inventory/ProductsPage.tsx` — navigate paths
- `src/pages/inventory/BundlesPage.tsx` — navigate paths
- `src/pages/inventory/BundleForm.tsx` — navigate paths
- `src/pages/inventory/ProductForm.tsx` — navigate paths
- `src/pages/inventory/InventoryWriteOffPage.tsx` — navigate paths
- `src/pages/orders/OrderDetail.tsx` — navigate paths
- `src/pages/orders/OrderForm.tsx` — navigate paths
- `src/pages/PosPage.tsx` — navigate paths
- `src/pages/SettingsPage.tsx` — settings URLs

**18. Edge Functions** (Supabase):
- `supabase/functions/hyp-payment-link/index.ts` — URLs: `/web/order-confirmation` → `/order-confirmation`
- `supabase/functions/meta-product-feed/index.ts` — URLs: `/web/product/` → `/product/`

### Summary
~25 files need updating. All changes are straightforward find-and-replace of URL prefixes:
- `/web/` → `/` (website paths)
- Admin paths get `/crm/` prefix
- `/auth` → `/crm/auth`

