import { describe, expect, it } from "vitest";
import { isTestOrderName, parseGaClientId, parseGaSessionId, purchaseEventId } from "@/lib/attribution";

describe("attribution helpers", () => {
  it("parses GA cookies", () => {
    expect(parseGaClientId("GA1.1.123456789.1700000000")).toBe("123456789.1700000000");
    expect(parseGaClientId(undefined)).toBeUndefined();
    expect(parseGaSessionId("GS1.1.1700000001.3.1.1700000100.0.0.0")).toBe("1700000001");
    expect(parseGaSessionId("GS2.1.s1700000002$o3$g1$t1700000100$j60$l0$h0")).toBe("1700000002");
  });

  it("detects test orders", () => {
    expect(isTestOrderName("mhmd tst")).toBe(true);
    expect(isTestOrderName("Test")).toBe(true);
    expect(isTestOrderName("הזמנת בדיקה")).toBe(true);
    expect(isTestOrderName("محمد")).toBe(false);
    expect(isTestOrderName("Testa Cohen")).toBe(false);
  });

  it("builds a stable purchase event id", () => {
    expect(purchaseEventId(724)).toBe("purchase-724");
  });
});
