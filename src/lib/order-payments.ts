// Shared "how much has the customer already paid" logic for an order.
// Used by the order page badge, the delivery COD default and shipping labels,
// so they always agree.

export interface PaymentLike {
  amount: number | string;
  payment_method: string | null;
  reference?: string | null;
  cash_registers?: { requires_completed_order?: boolean | null } | null;
}

export interface OrderLike {
  payment_method?: string | null;
  status?: string | null;
}

/**
 * Sum of payments that are actually collected.
 * Excludes:
 *  - planned split credit payments with no reference (not charged yet)
 *  - deferred cash (registers that require a completed order, e.g. courier cash)
 *    while the order isn't completed — that money is collected on delivery.
 */
export function computePaidAmount(order: OrderLike, payments: PaymentLike[] | null | undefined): number {
  const isCompleted = order.status === "completed";
  return (payments || []).reduce((sum, p) => {
    const isPlannedSplitCredit = order.payment_method === "split" && p.payment_method === "credit" && !p.reference;
    const isDeferredCash = p.payment_method === "cash" && !!p.cash_registers?.requires_completed_order;
    return isPlannedSplitCredit || (!isCompleted && isDeferredCash) ? sum : sum + Number(p.amount || 0);
  }, 0);
}

/** Amount the courier should collect from the customer (never negative, rounded to agorot). */
export function computeAmountDue(total: number | string | null | undefined, paid: number): number {
  return Math.max(0, Math.round((Number(total || 0) - paid) * 100) / 100);
}
