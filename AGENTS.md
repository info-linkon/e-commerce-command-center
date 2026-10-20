# Architecture decisions

- Store homepage banner placement on `banners.placement`; this preserves one management workflow while separating hero and promotional queries.
- Store each banner's optional portrait phone artwork on `banners.mobile_image_url`; desktop artwork remains the backward-compatible fallback.
- Use checkout-scoped CSS focus detection to hide mobile floating controls with visibility, not layout removal; native keyboard scrolling remains intact and form geometry stays stable.