import { effectivePrice } from "@/lib/pricing";

export type ProductSort = "popular" | "price_asc" | "price_desc" | "newest";

export const PRODUCT_SORTS: ProductSort[] = ["popular", "price_asc", "price_desc", "newest"];

type SortableProduct = {
  id: string;
  name?: string | null;
  sale_price?: number | null;
  compare_at_price?: number | null;
  created_at?: string | null;
  outOfStock?: boolean;
};

export function parseProductSort(value: string | null | undefined): ProductSort {
  return PRODUCT_SORTS.includes(value as ProductSort) ? (value as ProductSort) : "popular";
}

/**
 * Storefront listing order. In-stock products always come first; within
 * that, `popular` follows the sales ranking (product ids, best seller first)
 * with unranked products after, and ties fall back to name.
 */
export function sortProducts<T extends SortableProduct>(products: T[], sort: ProductSort, ranking: string[] = []): T[] {
  const rank = new Map(ranking.map((id, i) => [id, i]));
  const price = (p: T) => effectivePrice(p.sale_price, p.compare_at_price).price;
  const byName = (a: T, b: T) => String(a.name || "").localeCompare(String(b.name || ""), "he");
  return [...products].sort((a, b) => {
    const stock = Number(!!a.outOfStock) - Number(!!b.outOfStock);
    if (stock) return stock;
    let d = 0;
    if (sort === "price_asc") d = price(a) - price(b);
    else if (sort === "price_desc") d = price(b) - price(a);
    else if (sort === "newest") d = new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
    else d = (rank.get(a.id) ?? Infinity) - (rank.get(b.id) ?? Infinity);
    return (Number.isNaN(d) ? 0 : d) || byName(a, b);
  });
}
