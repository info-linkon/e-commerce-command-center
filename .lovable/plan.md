

## Fix RTL (Right-to-Left) across all report tabs

The report tabs have several LTR remnants: chart Y-axes appear on the left, some table headers lack right-alignment, and chart layouts read left-to-right. Here are the changes needed:

### Files to modify

**1. `src/components/reports/OverviewTab.tsx`**
- Add `dir="rtl"` to root div
- Set `YAxis orientation="right"` on both charts
- Reverse summary card layout: label on right, icon on left (already correct)

**2. `src/components/reports/SalesTab.tsx`**
- Add `dir="rtl"` to root div
- Set `YAxis orientation="right"` on the horizontal bar chart
- For the vertical bar chart (`layout="vertical"`), set `XAxis` and `YAxis` appropriately for RTL

**3. `src/components/reports/ExpensesTab.tsx`**
- Add `dir="rtl"` to root div
- Set `YAxis orientation="right"` on the bar chart

**4. `src/components/reports/CashflowTab.tsx`**
- Add `dir="rtl"` to root div
- Add `className="text-right"` to all TableHead elements (lines 99-104, 130-136)

**5. `src/components/reports/ProfitabilityTab.tsx`**
- Add `dir="rtl"` to root div
- Set `YAxis orientation="right"` on the bar chart

**6. `src/components/reports/InventoryLogTab.tsx`**
- Add `dir="rtl"` to the Card root (already has `text-right` on headers)

### Summary of changes
- 6 files edited
- All YAxis moved to the right side of charts
- All table headers aligned right
- All tab root elements marked as RTL

