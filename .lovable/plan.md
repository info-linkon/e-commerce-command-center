

## Plan: Short Invoice URLs via Public Redirect Route

### What
Create a short, public URL system for invoice links. Instead of saving the long EZCount PDF URL directly, save a short link like `https://your-domain.com/inv/ABC123` that redirects to the full EZCount document.

### How It Works
1. When an invoice is created (cash or credit), generate a short random code (e.g. 8 chars)
2. Save the short code + full EZCount URL in the `documents` table
3. Save the short URL (e.g. `/inv/ABC123`) as `invoice_url` on the order
4. Add a public route `/inv/:code` that looks up the code and redirects to the full URL

### Changes

#### 1. Database Migration
Add `short_code` column to `documents` table:
```sql
ALTER TABLE public.documents ADD COLUMN short_code text UNIQUE;
```

#### 2. New Public Page: `src/pages/web/InvoiceRedirect.tsx`
- Route: `/inv/:code`
- Fetches `doc_url` from `documents` where `short_code = code`
- Redirects to the full EZCount PDF URL
- Shows a loading spinner while fetching
- No auth required — fully public

#### 3. Update `src/App.tsx`
- Add public route `/inv/:code` → `InvoiceRedirect`

#### 4. Update `supabase/functions/ezcount-doc/index.ts`
- After successful doc creation, generate a random 8-char short code
- Save it in `documents.short_code`
- Return the short code in the response alongside `doc_url`

#### 5. Update `PaymentSection.tsx` (cash flow)
- Use the short URL (`/inv/{short_code}`) when saving `invoice_url` to the order

#### 6. Update `hyp-verify-payment/index.ts` (credit flow)
- Use the short URL from the ezcount-doc response when saving `invoice_url` to the order

### Technical Details

**Short code generation (in edge function):**
```typescript
const shortCode = crypto.randomUUID().replace(/-/g, "").substring(0, 8);
```

**Redirect page:**
```tsx
// Fetches doc_url by short_code, then window.location.replace(doc_url)
```

**Short URL format:**
```
https://your-domain.com/inv/a1b2c3d4
```

### Files
1. **Migration** — add `short_code` to documents
2. `src/pages/web/InvoiceRedirect.tsx` (new)
3. `src/App.tsx` — add route
4. `supabase/functions/ezcount-doc/index.ts` — generate short code + return it
5. `src/components/orders/PaymentSection.tsx` — use short URL
6. `supabase/functions/hyp-verify-payment/index.ts` — use short URL

