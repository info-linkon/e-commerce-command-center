

## Plan: Remove Lovable favicon and replace with site logo

### Problem
The file `public/favicon.ico` contains the default Lovable logo. WhatsApp and other platforms auto-fetch `/favicon.ico` and display it in the share preview (the small icon at bottom-right of the card).

### Fix

**1. Delete `public/favicon.ico`** — remove the Lovable-branded file.

**2. Generate a proper `.ico` favicon from the existing `logo.webp`** — convert `public/logo.webp` to `public/favicon.ico` so that any automatic `/favicon.ico` requests serve the ELWEJHA logo instead.

### Files Changed
- `public/favicon.ico` — replaced with ELWEJHA logo

