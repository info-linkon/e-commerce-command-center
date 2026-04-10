

## Plan: Fix Social Sharing (WhatsApp/Facebook/Twitter) Preview

### Problem
When sharing the site link on WhatsApp or other platforms, no preview appears because:
1. **OG image uses relative path** (`/logo.webp`) — social crawlers need an **absolute URL**
2. **Missing `og:url`** tag
3. **WhatsApp prefers PNG/JPG** — `.webp` has limited support on older WhatsApp versions
4. **Twitter card is `summary`** — should be `summary_large_image` for better visibility
5. **No site name** (`og:site_name`) tag

### Changes

**1. Create an OG share image** (`public/og-image.png`)
- Convert the existing `logo.webp` to a proper OG image (1200x630px PNG with brand background)
- This ensures compatibility across all platforms

**2. Update `index.html` meta tags**
- Add `og:url` with absolute site URL (`https://elwejha.co.il`)
- Add `og:site_name` = `ELWEJHA - الوجهة`
- Change all image paths to absolute: `https://elwejha.co.il/og-image.png`
- Change Twitter card to `summary_large_image`
- Add `twitter:title` and `twitter:description`

**Result**: Full preview on WhatsApp, Facebook, Twitter, Telegram with image, title, and description. No Lovable references anywhere (badge already hidden, no code references found).

