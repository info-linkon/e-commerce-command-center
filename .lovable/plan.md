

## Plan: Add EZCount Settings Page

### What
Create a new settings page for EZCount where the admin can enter the API Key and developer email. These values will be stored in `site_content` (page: "settings", section: "ezcount") and used by the `ezcount-doc` edge function instead of hardcoded values.

### Changes

#### 1. Create `src/pages/admin/EzcountSettingsPage.tsx`
- Form with two fields: API Key (password input with show/hide toggle) and Developer Email
- Load existing values from `site_content` using `useSiteSection("settings", "ezcount")`
- Save using `useUpsertSiteContent`
- Same pattern as `InforuSettingsPage`

#### 2. Update `src/pages/SettingsPage.tsx`
- Add a new card: "הגדרות EZCount" with description "API Key ומייל מפתח להפקת חשבוניות"
- Link to `/admin/ezcount-settings`

#### 3. Update `src/App.tsx`
- Add route `/admin/ezcount-settings` → `EzcountSettingsPage`

#### 4. Update `supabase/functions/ezcount-doc/index.ts`
- Instead of only reading `EZCOUNT_API_KEY` from env, first try to fetch from `site_content` table (page: "settings", section: "ezcount")
- Fall back to env secret if not found in DB
- Use developer_email from the same config (fallback to current hardcoded value)

### Files
1. `src/pages/admin/EzcountSettingsPage.tsx` (new)
2. `src/pages/SettingsPage.tsx` (add card)
3. `src/App.tsx` (add route)
4. `supabase/functions/ezcount-doc/index.ts` (read config from DB)

