

## Plan: Fix spacing between hero title and subtitle lines

### Problem
The title line (`بكيجات الوجهة`) and the gold subtitle line (`رفيقك الأمثل في كل طشة`) are too close together. The subtitle `<span>` has `my-0 py-px` which removes vertical spacing.

### Fix

**File: `src/pages/web/WebHome.tsx` (line 110)**

Change the subtitle span from:
```tsx
<span className="text-gradient-gold my-0 py-px">
```
to:
```tsx
<span className="text-gradient-gold block mt-2 md:mt-4">
```

This adds a clear margin-top between the title and subtitle lines, making it `block` so the margin applies properly, and removes the `my-0 py-px` that was suppressing spacing.

### Files Changed
- `src/pages/web/WebHome.tsx` — update subtitle span classes

