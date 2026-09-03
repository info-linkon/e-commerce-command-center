/**
 * Canonical helpers for custom, human-readable URLs ("slugs") on products and
 * categories. A slug is optional: when absent we fall back to the numeric id
 * (product_number / category_number) so old links keep working forever.
 */

/** Normalise free user input into a safe URL segment (unicode letters allowed). */
export function normalizeSlug(raw: string): string {
  return (raw || "")
    .trim()
    .toLowerCase()
    .replace(/^\/+|\/+$/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/[^\p{L}\p{N}\-]/gu, "")
    .replace(/-{2,}/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** True when the URL param is a plain numeric id rather than a slug. */
export function isNumericKey(key: string | undefined): boolean {
  return !!key && /^\d+$/.test(key);
}

export function productPath(product: any): string {
  const key = product?.slug || product?.product_number || product?.id;
  return `/product/${encodeURIComponent(String(key))}`;
}

export function categoryPath(category: any): string {
  const key = category?.slug || category?.category_number || category?.id;
  return `/category/${encodeURIComponent(String(key))}`;
}
