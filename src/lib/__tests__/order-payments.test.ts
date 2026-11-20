import { describe, it, expect } from "vitest";
import { computePaidAmount, computeAmountDue } from "@/lib/order-payments";

describe("order payments", () => {
  it("website order paid by card (HYP) → nothing to collect", () => {
    // Order 794 case: digital_payment_amount was 0 but the HYP payment exists
    const paid = computePaidAmount({ payment_method: "credit", status: "processing" }, [
      { amount: "1460", payment_method: "credit", reference: "HYP-517574556" },
    ]);
    expect(paid).toBe(1460);
    expect(computeAmountDue(1460, paid)).toBe(0);
  });

  it("unpaid cash order → collect full total", () => {
    expect(computeAmountDue(250, computePaidAmount({ payment_method: "cash", status: "processing" }, []))).toBe(250);
  });

  it("deferred courier cash is still collected on delivery until the order is completed", () => {
    const payments = [{ amount: 300, payment_method: "cash", cash_registers: { requires_completed_order: true } }];
    expect(computePaidAmount({ status: "processing" }, payments)).toBe(0);
    expect(computePaidAmount({ status: "completed" }, payments)).toBe(300);
  });

  it("split: planned credit without reference isn't paid yet", () => {
    const paid = computePaidAmount({ payment_method: "split", status: "processing" }, [
      { amount: 100, payment_method: "credit", reference: null },
      { amount: 50, payment_method: "cash" },
    ]);
    expect(paid).toBe(50);
    expect(computeAmountDue(150, paid)).toBe(100);
  });

  it("never negative and rounds to agorot", () => {
    expect(computeAmountDue(100, 120)).toBe(0);
    expect(computeAmountDue(100.1, 0.2)).toBe(99.9);
  });
});
