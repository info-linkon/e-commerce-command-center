import { supabase } from "@/integrations/supabase/client";

// How a POS / manual order reached us (client notes §7.8). Stored in
// orders.order_channel (migration 20261024120000_order_channel.sql).
export const ORDER_CHANNELS = [
  { value: "whatsapp", label: "וואטסאפ" },
  { value: "phone", label: "טלפון" },
  { value: "store", label: "חנות" },
  { value: "instagram", label: "אינסטגרם" },
  { value: "referral", label: "המלצה" },
  { value: "other", label: "אחר" },
] as const;

export type OrderChannel = (typeof ORDER_CHANNELS)[number]["value"];

export function orderChannelLabel(value?: string | null): string | null {
  return ORDER_CHANNELS.find((c) => c.value === value)?.label || null;
}

/**
 * Save the channel on an existing order. Written as a separate update (not
 * part of the order insert) so creating orders keeps working even before the
 * order_channel column exists in the database. Returns false on failure.
 */
export async function saveOrderChannel(orderId: string, channel: OrderChannel): Promise<boolean> {
  const { error } = await supabase
    .from("orders")
    .update({ order_channel: channel } as never)
    .eq("id", orderId);
  if (error) {
    console.error("saving order_channel failed (is the migration applied?):", error);
    return false;
  }
  return true;
}
