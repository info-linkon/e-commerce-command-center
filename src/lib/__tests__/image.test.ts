import { describe, expect, it } from "vitest";
import { imageSrcSet, resizedImage } from "@/lib/image";

const SUPA = "https://x.supabase.co/storage/v1/object/public/product-images/a/b.webp";

describe("resizedImage", () => {
  it("rewrites Supabase public object URLs to the render endpoint", () => {
    expect(resizedImage(SUPA, 300)).toBe(
      "https://x.supabase.co/storage/v1/render/image/public/product-images/a/b.webp?width=300&quality=75",
    );
  });

  it("leaves other URLs untouched", () => {
    expect(resizedImage("https://cdn.example.com/a.jpg", 300)).toBe("https://cdn.example.com/a.jpg");
    expect(resizedImage(null, 300)).toBe("");
  });

  it("builds a srcset only for transformable URLs", () => {
    expect(imageSrcSet(SUPA, [300, 600])).toContain("?width=600&quality=75 600w");
    expect(imageSrcSet("/logo.webp", [300])).toBeUndefined();
  });
});
