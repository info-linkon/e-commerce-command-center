

## Fix: Missing tooltip labels in Overview profitability chart

The OverviewTab's "רווחיות לפי תאריך" chart has the same tooltip issue -- the formatter returns an empty string as the label, so the tooltip shows values without names.

### Change

**File: `src/components/reports/OverviewTab.tsx` (line 134)**

Replace the tooltip formatter from:
```tsx
<Tooltip formatter={(v: number) => [`₪${v.toFixed(0)}`, ""]} />
```
to:
```tsx
<Tooltip formatter={(v: number, name: string) => [
  `₪${v.toFixed(0)}`, 
  name === "revenue" ? "הכנסות" : name === "cost" ? "עלות" : "רווח"
]} />
```

This maps each bar's data key to its Hebrew label in the tooltip, matching the fix already applied to the ProfitabilityTab.

