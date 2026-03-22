import { supabase } from "@/integrations/supabase/client";

/**
 * Sync a product to WooCommerce (fire-and-forget).
 */
export async function syncProductToWoo(productId: string) {
  try {
    const { error } = await supabase.functions.invoke("woo-product-sync", {
      body: { product_id: productId },
    });
    if (error) console.error("WooCommerce product sync error:", error);
  } catch (e) {
    console.error("WooCommerce product sync failed:", e);
  }
}
