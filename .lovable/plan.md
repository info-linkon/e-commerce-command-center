

## Plan: Fix Hero Section Text Spacing and Clipping

### Problems
1. **Text clipping**: The hero section uses `aspect-[3/2]` which constrains the height and can clip the subtitle text at the bottom, especially with longer banner text.
2. **Inconsistent line spacing**: The `leading-tight` on the `h1` plus the subtitle being inside the `h1` causes inconsistent gaps between lines across different banners.

### Fix

**File: `src/pages/web/WebHome.tsx`**

1. **Change hero aspect ratio** from `aspect-[3/2]` to a more appropriate responsive height using `aspect-[16/9] md:aspect-[21/9]` — this gives enough vertical space on mobile while keeping a cinematic look on desktop.

2. **Move subtitle out of the `h1`** and make it a separate `h2` with explicit `mt-3 md:mt-4` spacing — this ensures consistent gap regardless of font size or line count.

3. **Add `leading-normal`** to the h1 instead of `leading-tight` to prevent internal line compression when title wraps.

### Result
Consistent spacing between title lines across all banners, no text clipping at the bottom.

### Files
- `src/pages/web/WebHome.tsx` — hero section layout adjustments

