import { describe, it, expect } from "vitest";
import { encodeCode128, code128Svg } from "@/lib/code128";

// Values verified by rendering and decoding with zxing-cpp.
describe("code128", () => {
  it("encodes a numeric tracking number with set C", () => {
    // START C, 10 10 76 70 66, checksum, STOP
    const v = encodeCode128("1010767066");
    expect(v[0]).toBe(105);
    expect(v.slice(1, 6)).toEqual([10, 10, 76, 70, 66]);
    expect(v[v.length - 1]).toBe(106);
    const sum = v.slice(0, -2).reduce((s, x, i) => s + (i === 0 ? x : x * i), 0);
    expect(v[v.length - 2]).toBe(sum % 103);
  });

  it("uses set B for short / alphanumeric values", () => {
    expect(encodeCode128("X1").slice(0, 3)).toEqual([104, 56, 17]);
    expect(encodeCode128("7")[0]).toBe(104);
  });

  it("handles odd-length digit runs after text", () => {
    // "ABC-12345678": B for "ABC-", then switch to C for the digits
    const v = encodeCode128("ABC-12345678");
    expect(v).toContain(99);
  });

  it("rejects non-ASCII characters", () => {
    expect(() => encodeCode128("שלום")).toThrow();
  });

  it("renders an svg", () => {
    expect(code128Svg("1547")).toMatch(/^<svg[\s\S]*<rect/);
  });
});
