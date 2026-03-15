import { supabase } from "@/integrations/supabase/client";

/**
 * Push stock update to WooCommerce for a given variation.
 * Fires and forgets — errors are logged but don't block the UI.
 */
export async function syncStockToWoo(variationId: string) {
  try {
    const { error } = await supabase.functions.invoke("woo-stock-update", {
      body: { variation_id: variationId },
    });
    if (error) console.error("WooCommerce stock sync error:", error);
  } catch (e) {
    console.error("WooCommerce stock sync failed:", e);
  }
}

/**
 * Push stock updates for multiple variations.
 */
export async function syncMultipleStockToWoo(variationIds: string[]) {
  const unique = [...new Set(variationIds)];
  await Promise.allSettled(unique.map((id) => syncStockToWoo(id)));
}
