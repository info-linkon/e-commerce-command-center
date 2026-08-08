import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface Customer {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  city: string | null;
  notes: string | null;
  created_at: string;
}

export function useCustomers(search?: string) {
  return useQuery({
    queryKey: ["customers", search],
    queryFn: async () => {
      let query = supabase
        .from("customers")
        .select("*")
        .order("name");
      if (search) {
        query = query.or(`name.ilike.%${search}%,phone.ilike.%${search}%,email.ilike.%${search}%`);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data as Customer[];
    },
  });
}

export function useCustomer(id?: string) {
  return useQuery({
    queryKey: ["customers", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("customers")
        .select("*")
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data as Customer;
    },
  });
}

export function useCustomerOrders(customerId?: string) {
  return useQuery({
    queryKey: ["customer-orders", customerId],
    enabled: !!customerId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .eq("customer_id", customerId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateCustomer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (customer: Omit<Customer, "id" | "created_at">) => {
      const { data, error } = await supabase
        .from("customers")
        .insert(customer)
        .select()
        .single();
      if (error) throw error;
      return data as Customer;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["customers"] });
      toast.success("הלקוח נוצר בהצלחה");
    },
    onError: () => toast.error("שגיאה ביצירת לקוח"),
  });
}

export function useUpdateCustomer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Customer> & { id: string }) => {
      const { data, error } = await supabase
        .from("customers")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data as Customer;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["customers"] });
      toast.success("הלקוח עודכן");
    },
    onError: () => toast.error("שגיאה בעדכון לקוח"),
  });
}

export function normalizeCustomerPhone(raw?: string | null): string {
  return String(raw || "").replace(/\D/g, "").replace(/^972/, "0");
}

export function useImportCustomers() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (rows: { name: string; phone: string }[]) => {
      const { data: existing, error: exErr } = await supabase
        .from("customers")
        .select("phone")
        .limit(10000);
      if (exErr) throw exErr;
      const existingSet = new Set(
        (existing || []).map((c) => normalizeCustomerPhone(c.phone)).filter(Boolean),
      );

      const toInsert: { name: string; phone: string }[] = [];
      const seen = new Set<string>();
      let skipped = 0;
      for (const r of rows) {
        const norm = normalizeCustomerPhone(r.phone);
        if (!norm || norm.length < 9) { skipped++; continue; }
        if (existingSet.has(norm) || seen.has(norm)) { skipped++; continue; }
        seen.add(norm);
        toInsert.push({ name: r.name?.trim() || norm, phone: norm });
      }

      let inserted = 0;
      for (let i = 0; i < toInsert.length; i += 200) {
        const chunk = toInsert.slice(i, i + 200);
        const { error } = await supabase.from("customers").insert(chunk);
        if (error) throw error;
        inserted += chunk.length;
      }
      return { inserted, skipped };
    },
    onSuccess: ({ inserted, skipped }) => {
      qc.invalidateQueries({ queryKey: ["customers"] });
      toast.success(`יובאו ${inserted} לקוחות${skipped ? ` · ${skipped} דולגו (כפולים/לא תקינים)` : ""}`);
    },
    onError: () => toast.error("שגיאה בייבוא לקוחות"),
  });
}
