

## Plan: 4 Fixes

### 1. Finance Page — Remove Documents Tab
Remove the Documents tab from `FinancePage.tsx`. The page will show expenses directly without tabs wrapper.

**File**: `src/pages/FinancePage.tsx`
- Remove Tabs component, just render `<ExpensesPage />` directly (or keep the page title + embedded expenses)

### 2. POS (קופה) — Move to Second Position in Sidebar
Currently the sidebar renders: Dashboard, Inventory (collapsible), Orders (collapsible), Web Management (collapsible), then the `menuItems.slice(1)` array which has: Website Items, Customers, Deliveries, POS, Finance, Reports, Settings.

**Fix**: Move "קופה" (POS) to be the second item after Dashboard, before the Inventory collapsible. This means rendering it as a standalone item between Dashboard and the Inventory collapsible in `AppSidebar.tsx`.

**File**: `src/components/layout/AppSidebar.tsx`
- Add POS NavLink right after Dashboard (line 98), before Inventory collapsible
- Remove POS from the `menuItems` array so it doesn't render twice

### 3. Reports — Custom Date Range Filter
The current reports page has a preset period selector (7/30/90/365 days). The user wants the ability to choose a custom date range.

**File**: `src/pages/ReportsPage.tsx`
- Add a "custom" option to the period selector
- When "custom" is selected, show two date pickers (from/to)
- Pass the custom date range to the tab components

### 4. Meta Pixel Not Embedded on the Site
The pixel base script loads in `index.html` but `fbq('init', pixelId)` only runs when the React app hydrates and fetches settings from DB. The `<noscript>` fallback image is missing the pixel ID entirely (no `id=` param in the URL).

**Fix**:
- In `WebLayout.tsx`, the current code checks `window.fbq` exists before calling init — but the pixel script loads async, so `window.fbq` might not be ready yet. Need to add a retry/wait mechanism or ensure the script is loaded.
- Also, the `noscript` tag in `index.html` needs the pixel ID. Since it's dynamic from DB, we'll remove the broken noscript tag and handle it properly in the React layer.
- Add `fbqPageView()` call on every route change in WebLayout, not just on initial mount.

**Files**: `src/components/web/WebLayout.tsx`, `index.html`
- Fix the useEffect to retry if `window.fbq` isn't ready yet
- Call `fbq('init', pixelId)` and `fbqPageView()` properly
- Track route changes with `useLocation` for PageView events
- Fix noscript fallback with dynamic pixel ID

### Technical Details
- No database changes needed
- All changes are frontend-only
- 4 files modified: `FinancePage.tsx`, `AppSidebar.tsx`, `ReportsPage.tsx`, `WebLayout.tsx`, `index.html`

