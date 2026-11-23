import { describe, it, expect } from "vitest";
import { expandPackages, buildDeliveryLabelsHtml } from "@/lib/delivery-label";

describe("delivery labels", () => {
  const base = { orderNumber: 794, trackingNumber: "1010770160", customerName: "x" };

  it("expands into numbered boxes", () => {
    const out = expandPackages([base], 3);
    expect(out.map((l) => `${l.packageIndex}/${l.packageCount}`)).toEqual(["1/3", "2/3", "3/3"]);
  });

  it("expands every order when printing in bulk", () => {
    const out = expandPackages([base, { ...base, orderNumber: 795 }], 2);
    expect(out.map((l) => `${l.orderNumber}:${l.packageIndex}`)).toEqual(["794:1", "794:2", "795:1", "795:2"]);
  });

  it("clamps the box count", () => {
    expect(expandPackages([base], 0)).toHaveLength(1);
    expect(expandPackages([base], 500)).toHaveLength(50);
  });

  it("renders a 4x6 page, box number and pickup marker", () => {
    const html = buildDeliveryLabelsHtml([
      ...expandPackages([base], 2),
      { orderNumber: 1602, isPickup: true, codAmount: 320 },
    ]);
    expect(html).toContain("size: 4in 6in");
    expect(html).toContain("2/2");
    expect(html).toContain("איסוף עצמי");
    expect(html).toContain("₪320.00");
  });

  it("writes every item to the label (no '+N' truncation)", () => {
    const items = Array.from({ length: 11 }, (_, i) => ({ name: `item-${i + 1}`, quantity: 1 }));
    const html = buildDeliveryLabelsHtml([{ ...base, items }]);
    for (const it of items) expect(html).toContain(`>${it.name}<`);
    expect(html).not.toMatch(/\+\d+…/);
    expect(html).toContain("__fitLabels");
  });
});
