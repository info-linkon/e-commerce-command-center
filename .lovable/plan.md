

## Plan: Migrate WordPress Images to Supabase Storage

### Problem
There are images in the database still pointing to the old WordPress site (`elwejha.co.il/wp-content/uploads/...`). These need to be downloaded and re-uploaded to Supabase Storage, then the DB URLs updated.

### Scope
| Source | Count |
|--------|-------|
| Product main images | 38 |
| Product gallery images | 35 products (multiple images each) |
| Product variations | 14 |
| Categories | 0 |
| Banners | 0 |
| **Total estimated images** | ~90+ |

### Approach
Create an Edge Function (`migrate-wp-images`) that:

1. Queries all `products`, `product_variations` for URLs containing `elwejha.co.il/wp-content`
2. For each image: downloads it, converts to WebP (server-side), uploads to Supabase Storage (`product-images` bucket)
3. Updates the DB record with the new Supabase URL
4. Handles gallery images (JSON array) by updating individual entries
5. Returns a summary of migrated/failed images

### Why Edge Function (not client-side)
- Client-side conversion (like the existing WebP converter) will hit CORS errors on `elwejha.co.il`
- Edge Function can fetch any URL without CORS restrictions
- More reliable for ~90+ images

### Technical Details

**Edge Function: `supabase/functions/migrate-wp-images/index.ts`**
- Fetches images from WordPress URLs using `fetch()`
- Converts to WebP using sharp-compatible approach (or uploads as-is if WebP conversion isn't available in Deno, then relies on existing WebP converter)
- Uploads to `product-images/migrated/{uuid}.webp`
- Updates `products.image_url`, `products.gallery_images`, `product_variations.image_url`
- Processes in batches to avoid timeouts
- Returns JSON report: `{ migrated: number, failed: string[] }`

**Frontend: Add a button** in the Settings or existing ImageWebpConverter area to trigger the migration.

### Files
1. **New**: `supabase/functions/migrate-wp-images/index.ts` — the migration logic
2. **Edit**: `src/components/admin/ImageWebpConverter.tsx` or `src/pages/SettingsPage.tsx` — add trigger button

