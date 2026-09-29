# Architecture decisions

- Store homepage banner placement on `banners.placement`; this preserves one management workflow while separating hero and promotional queries.
- Store each banner's optional square phone artwork on `banners.mobile_image_url`; desktop artwork remains the backward-compatible fallback.