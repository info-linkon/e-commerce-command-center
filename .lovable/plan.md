

## Plan: Fix Meta Tags & Block CRM from Google Indexing

### Changes

**1. `index.html` — Update title and meta tags**
- Title: `ELWEJHA - מערכת ניהול עסקית` → `ELWEJHA - الوجهة | חנות ציוד טבע והרפתקאות`
- Description: `ELWEJHA - מערכת ניהול עסקית משולבת` → `ELWEJHA - وجهتك الأولى لعالم الطبيعة والمغامرات | היעד שלך לציוד טבע והרפתקאות`
- OG title & description: same updates

**2. `public/robots.txt` — Block `/crm` from indexing**
```text
User-agent: *
Allow: /
Disallow: /crm
Disallow: /crm/

User-agent: Googlebot
Allow: /
Disallow: /crm
Disallow: /crm/

User-agent: Bingbot
Allow: /
Disallow: /crm
Disallow: /crm/

User-agent: Twitterbot
Allow: /

User-agent: facebookexternalhit
Allow: /
```

Two files, straightforward text updates.

