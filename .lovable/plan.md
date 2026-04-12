

## Fix: Tooltip labels all showing "רווח" in Overview profitability chart

The `name` parameter passed to the Tooltip formatter is the Bar's `name` prop (Hebrew), not the `dataKey`. So the conditions `name === "revenue"` and `name === "cost"` never match, and all three labels fall through to "רווח".

### Change

**File: `src/components/reports/OverviewTab.tsx` (line 134)**

Update the formatter to match against the Hebrew names that are actually passed:

```tsx
<Tooltip formatter={(v: number, name: string) => [
  `₪${v.toFixed(0)}`, 
  name === "הכנסות" ? "הכנסות" : name === "עלות" ? "עלות" : "רווח"
]} />
```

Or more simply, just pass the name through since the Bar `name` props already have the correct Hebrew labels:

```tsx
<Tooltip formatter={(v: number, name: string) => [`₪${v.toFixed(0)}`, name]} />
```

This single-line change fixes all three tooltip labels.

