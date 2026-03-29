import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface Coupon {
  id: string;
  code: string;
  type: string;
  value: number;
  min_order: number;
  max_uses: number | null;
  used_count: number;
  single_use: boolean;
  active: boolean;
  expires_at: string | null;
  created_at: string;
}

export function useCoupons() {
  return useQuery({
    queryKey: ["coupons"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("coupons" as any)
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as unknown as Coupon[];
    },
  });
}

export function useCreateCoupon() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (coupon: Partial<Coupon>) => {
      const { data, error } = await supabase
        .from("coupons" as any)
        .insert(coupon as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["coupons"] });
      toast.success("הקופון נוצר בהצלחה");
    },
    onError: () => toast.error("שגיאה ביצירת קופון"),
  });
}

export function useUpdateCoupon() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Coupon> & { id: string }) => {
      const { error } = await supabase
        .from("coupons" as any)
        .update(updates as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["coupons"] });
      toast.success("הקופון עודכן");
    },
    onError: () => toast.error("שגיאה בעדכון קופון"),
  });
}

export function useDeleteCoupon() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("coupons" as any)
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["coupons"] });
      toast.success("הקופון נמחק");
    },
    onError: () => toast.error("שגיאה במחיקת קופון"),
  });
}

export async function validateCoupon(code: string, orderTotal: number): Promise<{ valid: boolean; coupon?: Coupon; error?: string }> {
  const { data, error } = await supabase
    .from("coupons" as any)
    .select("*")
    .eq("code", code.toUpperCase())
    .eq("active", true)
    .maybeSingle();

  if (error || !data) return { valid: false, error: "קוד קופון לא תקין" };

  const coupon = data as unknown as Coupon;

  if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) {
    return { valid: false, error: "הקופון פג תוקף" };
  }
  if (coupon.max_uses && coupon.used_count >= coupon.max_uses) {
    return { valid: false, error: "הקופון מוצה" };
  }
  if (orderTotal < coupon.min_order) {
    return { valid: false, error: `סכום מינימלי להזמנה: ₪${coupon.min_order}` };
  }

  return { valid: true, coupon };
}

export function calcDiscount(coupon: Coupon, total: number): number {
  if (coupon.type === "percentage") {
    return Math.min(total, (total * coupon.value) / 100);
  }
  return Math.min(total, coupon.value);
}

export async function incrementCouponUsage(couponId: string) {
  try {
    const { data: coupon } = await supabase
      .from("coupons" as any)
      .select("used_count")
      .eq("id", couponId)
      .single();
    if (coupon) {
      await supabase
        .from("coupons" as any)
        .update({ used_count: ((coupon as any).used_count || 0) + 1 } as any)
        .eq("id", couponId);
    }
  } catch {
    // silent fail
  }
}
