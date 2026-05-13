import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const pickingItemsSelect = "*, order_items(id, quantity, product_variations(id, name, name_ar, sku, products(name, name_ar, sku, image_url))), product_variations(id, name, name_ar, sku, products(name, name_ar, sku, image_url))";

async function fetchPickingItems(orderId: string) {
  const { data, error } = await supabase
    .from("order_picking_items")
    .select(pickingItemsSelect)
    .eq("order_id", orderId)
    .order("id");

  if (error) throw error;
  return data || [];
}

async function rebuildMissingPickingItems(orderId: string) {
  const { data: order, error: orderError } = await supabase
    .from("orders")
    .select("id, assigned_warehouse_id, status, picking_status, order_items(id, quantity, variation_id, bundle_variation_id, product_variations(product_id))")
    .eq("id", orderId)
    .single();

  if (orderError) throw orderError;
  if (!order?.assigned_warehouse_id || order.status === "cancelled") return false;

  const orderItems = ((order.order_items as any[]) || []).filter((item) => item.variation_id);
  if (orderItems.length === 0) return false;

  const productIds = Array.from(
    new Set(orderItems.map((item) => item.product_variations?.product_id).filter(Boolean))
  );

  const bundleIdByProductId: Record<string, string> = {};
  const bundleTypeByProductId: Record<string, string> = {};
  if (productIds.length > 0) {
    const { data: bundles, error: bundlesError } = await supabase
      .from("bundles")
      .select("id, product_id, bundle_type")
      .in("product_id", productIds);

    if (bundlesError) throw bundlesError;

    for (const bundle of bundles || []) {
      bundleIdByProductId[bundle.product_id] = bundle.id;
      bundleTypeByProductId[bundle.product_id] = bundle.bundle_type;
    }
  }

  const bundleIds = Object.values(bundleIdByProductId);
  const simpleComponentsByBundleId: Record<string, any[]> = {};
  const componentsByBundleVariationId: Record<string, any[]> = {};
  if (bundleIds.length > 0) {
    // Simple bundles: bundle_items keyed by bundle_id
    const { data: bundleItems, error: bundleItemsError } = await supabase
      .from("bundle_items")
      .select("bundle_id, variation_id, quantity")
      .in("bundle_id", bundleIds);

    if (bundleItemsError) throw bundleItemsError;

    for (const bundleItem of bundleItems || []) {
      if (!simpleComponentsByBundleId[bundleItem.bundle_id]) {
        simpleComponentsByBundleId[bundleItem.bundle_id] = [];
      }
      simpleComponentsByBundleId[bundleItem.bundle_id].push(bundleItem);
    }

    // Variable bundles: load components for the EXACT bundle_variation_id
    // chosen on each order_item (the customer's color), not "first per bundle".
    const orderBvIds = Array.from(
      new Set(
        orderItems
          .map((it) => it.bundle_variation_id)
          .filter((x): x is string => Boolean(x)),
      ),
    );
    if (orderBvIds.length > 0) {
      const { data: bvItems, error: bviErr } = await supabase
        .from("bundle_variation_items")
        .select("bundle_variation_id, variation_id, quantity")
        .in("bundle_variation_id", orderBvIds);
      if (bviErr) throw bviErr;
      for (const bvi of bvItems || []) {
        if (!componentsByBundleVariationId[bvi.bundle_variation_id]) {
          componentsByBundleVariationId[bvi.bundle_variation_id] = [];
        }
        componentsByBundleVariationId[bvi.bundle_variation_id].push(bvi);
      }
    }
  }

  const pickingItems: Array<{
    order_id: string;
    order_item_id: string;
    variation_id: string;
    quantity: number;
  }> = [];

  for (const item of orderItems) {
    const productId = item.product_variations?.product_id;
    const bundleId = productId ? bundleIdByProductId[productId] : undefined;
    let bundleComponents: Array<{ variation_id: string; quantity: number }> = [];
    if (bundleId) {
      if (item.bundle_variation_id && componentsByBundleVariationId[item.bundle_variation_id]) {
        bundleComponents = componentsByBundleVariationId[item.bundle_variation_id];
      } else if (simpleComponentsByBundleId[bundleId]) {
        bundleComponents = simpleComponentsByBundleId[bundleId];
      }
    }

    if (bundleComponents.length > 0) {
      for (const component of bundleComponents) {
        pickingItems.push({
          order_id: orderId,
          order_item_id: item.id,
          variation_id: component.variation_id,
          quantity: component.quantity * item.quantity,
        });
      }
      continue;
    }

    pickingItems.push({
      order_id: orderId,
      order_item_id: item.id,
      variation_id: item.variation_id,
      quantity: item.quantity,
    });
  }

  if (pickingItems.length === 0) return false;

  const { error: insertError } = await supabase
    .from("order_picking_items")
    .insert(pickingItems as any);

  if (insertError) throw insertError;

  if (!order.picking_status) {
    const { error: statusError } = await supabase
      .from("orders")
      .update({ picking_status: "not_started" })
      .eq("id", orderId);

    if (statusError) throw statusError;
  }

  return true;
}

export function usePickingItems(orderId?: string) {
  return useQuery({
    queryKey: ["picking_items", orderId],
    enabled: !!orderId,
    queryFn: async () => {
      const items = await fetchPickingItems(orderId!);
      if (items.length > 0) return items;

      try {
        const rebuilt = await rebuildMissingPickingItems(orderId!);
        if (rebuilt) {
          return await fetchPickingItems(orderId!);
        }
      } catch (error) {
        console.error("Failed to rebuild picking items", error);
      }

      return [];
    },
  });
}

export function useTogglePickedItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ pickingItemId, picked, orderId }: { pickingItemId: string; picked: boolean; orderId: string }) => {
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData?.user?.id || null;
      const { error } = await supabase
        .from("order_picking_items")
        .update({
          picked,
          picked_at: picked ? new Date().toISOString() : null,
          picked_by: picked ? uid : null,
        })
        .eq("id", pickingItemId);
      if (error) throw error;

      const { data: allItems, error: fetchErr } = await supabase
        .from("order_picking_items")
        .select("picked")
        .eq("order_id", orderId);
      if (fetchErr) throw fetchErr;

      const total = allItems.length;
      const pickedCount = allItems.filter((i) => i.picked).length;

      let pickingStatus: "not_started" | "in_progress" | "completed" = "not_started";
      if (pickedCount === total) pickingStatus = "completed";
      else if (pickedCount > 0) pickingStatus = "in_progress";

      const { error: orderErr } = await supabase
        .from("orders")
        .update({ picking_status: pickingStatus })
        .eq("id", orderId);
      if (orderErr) throw orderErr;

      return { pickingStatus };
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["picking_items", vars.orderId] });
      qc.invalidateQueries({ queryKey: ["orders"] });
    },
    onError: () => toast.error("שגיאה בעדכון ליקוט"),
  });
}
