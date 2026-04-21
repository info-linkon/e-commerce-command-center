import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface Coupon {
  id?: string;
  code: string;
  type: string;
  value: number;
  min_order: number;
  max_uses?: number | null;
  used_count?: number;
  single_use?: boolean;
  active?: boolean;
  expires_at?: string | null;
  created_at?: string;
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

// Public-side coupon validation goes through the `web-validate-coupon` edge
// function. The `coupons` table is restricted to authenticated CRM users so
// neither the code nor `used_count` are reachable from the browser. The edge
// function returns only the public-safe fields needed to render the UI.
export async function validateCoupon(
  code: string,
  orderTotal: number,
): Promise<{ valid: boolean; coupon?: Coupon; error?: string }> {
  const { data, error } = await supabase.functions.invoke("web-validate-coupon", {
    body: { code, subtotal: orderTotal },
  });
  if (error) return { valid: false, error: "שגיאה בבדיקת הקופון" };
  if (!data?.valid) return { valid: false, error: data?.error || "קוד קופון לא תקין" };
  return { valid: true, coupon: data.coupon as Coupon };
}

export function calcDiscount(coupon: Coupon, total: number): number {
  if (coupon.type === "percentage") {
    return Math.min(total, (total * coupon.value) / 100);
  }
  return Math.min(total, coupon.value);
}
