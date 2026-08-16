/**
 * Canonical pricing rule for the storefront.
 * The customer always pays the LOWEST non-zero value among:
 *   variation price → falls back to product sale price
 *   variation compare-at price → falls back to product compare-at price
 * The higher value (when it exists) is the crossed-out "regular" price.
 */
export interface EffectivePrice {
  price: number;
  comparePrice: number | null;
  discountPercent: number;
}

const num = (v: unknown): number => Number(v) || 0;

export function effectivePrice(
  variationPrice?: unknown,
  variationCompare?: unknown,
  productPrice?: unknown,
  productCompare?: unknown,
): EffectivePrice {
  const rawPrice = num(variationPrice) > 0 ? num(variationPrice) : num(productPrice);
  const rawCompare = num(variationCompare) > 0 ? num(variationCompare) : num(productCompare);

  const price = rawCompare > 0 && rawCompare < rawPrice ? rawCompare : rawPrice;
  const higher = Math.max(rawPrice, rawCompare);
  const comparePrice = rawCompare > 0 && higher > price ? higher : null;
  const discountPercent = comparePrice ? Math.round(((comparePrice - price) / comparePrice) * 100) : 0;

  return { price, comparePrice, discountPercent };
}
