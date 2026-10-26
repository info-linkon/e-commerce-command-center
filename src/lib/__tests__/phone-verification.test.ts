import { describe, it, expect } from "vitest";
import { requiresPhoneVerification, toLocalPhone } from "@/lib/phone-verification";

describe("requiresPhoneVerification", () => {
  it("skips 059 / 056 numbers in any format", () => {
    for (const p of ["0591234567", "056-123-4567", "+970 59 123 4567", "972561234567", "00970591234567"]) {
      expect(requiresPhoneVerification(p)).toBe(false);
    }
  });

  it("requires it for Israeli numbers", () => {
    for (const p of ["0521234567", "054-123-4567", "+972 50 123 4567", "0581234567"]) {
      expect(requiresPhoneVerification(p)).toBe(true);
    }
  });

  it("normalizes to a local number", () => {
    expect(toLocalPhone("+972 (52) 123-4567")).toBe("0521234567");
  });
});
