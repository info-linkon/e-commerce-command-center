import { describe, expect, it } from "vitest";
import { parseProductSort, sortProducts } from "@/lib/product-sort";

const products = [
  { id: "a", name: "א", sale_price: 100, compare_at_price: 0, created_at: "2026-01-01" },
  { id: "b", name: "ב", sale_price: 50, compare_at_price: 0, created_at: "2026-03-01" },
  { id: "c", name: "ג", sale_price: 300, compare_at_price: 80, created_at: "2026-02-01" }, // pays 80
  { id: "d", name: "ד", sale_price: 10, compare_at_price: 0, created_at: "2026-04-01", outOfStock: true },
];
const ids = (list: { id: string }[]) => list.map((p) => p.id).join("");

describe("sortProducts", () => {
  it("sorts by effective price, out-of-stock last", () => {
    expect(ids(sortProducts(products, "price_asc"))).toBe("bcad");
    expect(ids(sortProducts(products, "price_desc"))).toBe("acbd");
  });

  it("sorts by sales ranking, unranked after by name", () => {
    expect(ids(sortProducts(products, "popular", ["c", "d", "a"]))).toBe("cabd");
  });

  it("sorts newest first", () => {
    expect(ids(sortProducts(products, "newest"))).toBe("bcad");
  });

  it("defaults unknown values to popular", () => {
    expect(parseProductSort("bogus")).toBe("popular");
    expect(parseProductSort("price_desc")).toBe("price_desc");
  });
});
