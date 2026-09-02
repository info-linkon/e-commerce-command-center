import { supabase } from "@/integrations/supabase/client";

/**
 * Keeps payments (and cash-register balances) in sync when an order total
 * goes DOWN (items removed / quantity reduced / totals edited manually).
 *
 * Without this, a fully-paid order that is later reduced keeps the original
 * payment amount, and the cash register stays inflated by the difference.
 *
 * Returns the amount that was rolled back (0 when nothing to do).
 */
export async function reconcileOverpayment(orderId: string, newTotal: number): Promise<number> {
  const { data: order } = await supabase
    .from("orders")
    .select("id, status")
    .eq("id", orderId)
    .maybeSingle();
  if (!order) return 0;

  const { data: pays } = await supabase
    .from("payments")
    .select("id, amount, payment_method, cash_register_id, created_at, cash_registers(requires_completed_order)")
    .eq("order_id", orderId)
    .order("created_at", { ascending: false });

  const payments = (pays || []) as any[];
  const totalPaid = payments.reduce((s, p) => s + Number(p.amount || 0), 0);
  let excess = Math.round((totalPaid - Math.max(0, newTotal)) * 100) / 100;
  if (excess <= 0.01) return 0;

  const rolledBack = excess;

  for (const p of payments) {
    if (excess <= 0.01) break;
    const amount = Number(p.amount || 0);
    const reduce = Math.min(amount, excess);
    const newAmount = Math.round((amount - reduce) * 100) / 100;

    // Reverse the cash register credit only when it was actually applied.
    const deferred = !!p.cash_registers?.requires_completed_order;
    const registerCredited =
      p.payment_method === "cash" && p.cash_register_id && (!deferred || order.status === "completed");
    if (registerCredited) {
      await supabase.rpc("increment_cash_register", { reg_id: p.cash_register_id, delta: -reduce });
    }

    if (newAmount <= 0.01) {
      await supabase.from("payments").delete().eq("id", p.id);
    } else {
      await supabase.from("payments").update({ amount: newAmount }).eq("id", p.id);
    }
    excess = Math.round((excess - reduce) * 100) / 100;
  }

  return rolledBack;
}
