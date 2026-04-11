

## Plan: Fix Hero Section Line Spacing

### Problem
In the Hero section, the title and subtitle text lines have no spacing between them. The subtitle `<span>` on line 110 has `my-0 py-px` classes that collapse the vertical gap.

### Fix

**File: `src/pages/web/WebHome.tsx`** (line 110)

Change the subtitle span classes from `my-0 py-px` to `mt-2 block` to add proper spacing between the lines:

```
<span className="text-gradient-gold mt-2 block">{slide.subtitle}</span>
```

Using `block` ensures it takes its own line with `mt-2` providing breathing room. The `leading-tight` on the parent `h1` will still keep things compact overall.

### Files
- `src/pages/web/WebHome.tsx` — one class change on line 110

