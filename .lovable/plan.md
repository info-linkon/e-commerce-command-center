

## Plan: Show full product images without cropping

### Problem
The main product image container uses `aspect-square` with `object-cover`, which crops non-square images. Portrait images get cut off.

### Fix

**File: `src/pages/web/WebProductPage.tsx`**

1. **Main image container (line 196):** Remove `aspect-square` and replace with auto-height. Change `object-cover` to `object-contain` so the full image is visible.

```tsx
// Before:
<div className="aspect-square bg-card rounded-xl border border-border overflow-hidden mb-4">
  <img src={displayImage} alt={displayName} className="w-full h-full object-cover" />

// After:
<div className="bg-card rounded-xl border border-border overflow-hidden mb-4 flex items-center justify-center min-h-[300px] md:min-h-[400px]">
  <img src={displayImage} alt={displayName} className="w-full h-auto max-h-[600px] object-contain rounded-xl" />
```

2. **Thumbnail images (line 217):** Keep `aspect-square` for thumbnails but change to `object-contain` so they aren't cropped either.

```tsx
// Before:
<img src={img} alt="" className="w-full h-full object-cover" />

// After:
<img src={img} alt="" className="w-full h-full object-contain" />
```

### Files Changed
- `src/pages/web/WebProductPage.tsx` — main image and thumbnails use `object-contain` instead of `object-cover`

