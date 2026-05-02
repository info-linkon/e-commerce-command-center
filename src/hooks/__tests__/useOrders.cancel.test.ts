import { describe, it, expect, beforeEach, vi } from "vitest";

// ---------------------------------------------------------------------------
// In-memory fake Supabase tailored to the queries used by useCancelOrder,
// useUpdateOrderStatus and useDeleteOrder. The fake keeps tables as plain
// arrays and exposes a chainable query builder that supports the subset of
// methods the hooks call: select / eq / in / ilike / limit / maybeSingle /
// single / update / insert / delete + functions.invoke + auth.getUser + rpc.
// ---------------------------------------------------------------------------

type Row = Record<string, any>;

interface DB {
  orders: Row[];
  order_items: Row[];
  product_variations: Row[];
  bundles: Row[];
  bundle_items: Row[];
  bundle_variations: Row[];
  bundle_variation_items: Row[];
  inventory: Row[];
  inventory_log: Row[];
  payments: Row[];
  payment_events: Row[];
  cash_registers: Row[];
  deliveries: Row[];
  order_picking_items: Row[];
  documents: Row[];
}

const db: DB = {
  orders: [],
  order_items: [],
  product_variations: [],
  bundles: [],
  bundle_items: [],
  bundle_variations: [],
  bundle_variation_items: [],
  inventory: [],
  inventory_log: [],
  payments: [],
  payment_events: [],
  cash_registers: [],
  deliveries: [],
  order_picking_items: [],
  documents: [],
};

const rpcCalls: Array<{ name: string; args: any }> = [];
const fnInvocations: Array<{ name: string; body: any }> = [];

function resetDb() {
  (Object.keys(db) as (keyof DB)[]).forEach((k) => {
    db[k] = [] as any;
  });
  rpcCalls.length = 0;
  fnInvocations.length = 0;
}

function applyFilters(rows: Row[], filters: Array<[string, string, any]>): Row[] {
  return rows.filter((r) =>
    filters.every(([col, op, val]) => {
      if (op === "eq") return r[col] === val;
      if (op === "in") return (val as any[]).includes(r[col]);
      if (op === "ilike") {
        const pat = String(val).replace(/%/g, "");
        return typeof r[col] === "string" && r[col].includes(pat);
      }
      return true;
    }),
  );
}

// Resolve a "select" string with embedded relations like:
//   "*, order_items(*, product_variations(product_id))"
// We only need to attach the subset of relations the hooks actually read.
function expandRelations(table: keyof DB, rows: Row[], select: string): Row[] {
  const sel = select.replace(/\s+/g, "");
  return rows.map((row) => {
    const out: Row = { ...row };
    if (table === "orders" && sel.includes("order_items(")) {
      const items = db.order_items
        .filter((i) => i.order_id === row.id)
        .map((i) => {
          const v = db.product_variations.find((pv) => pv.id === i.variation_id);
          return { ...i, product_variations: v ? { product_id: v.product_id } : null };
        });
      out.order_items = items;
    }
    return out;
  });
}

function makeBuilder(table: keyof DB) {
  let filters: Array<[string, string, any]> = [];
  let selectStr = "*";
  let limitN: number | null = null;
  let mode: "select" | "update" | "insert" | "delete" = "select";
  let payload: any = null;

  const exec = () => {
    let rows = applyFilters(db[table], filters);
    if (mode === "update") {
      rows.forEach((r) => Object.assign(r, payload));
      return { data: rows, error: null };
    }
    if (mode === "delete") {
      const ids = new Set(rows.map((r) => r.id));
      db[table] = db[table].filter((r) => !ids.has(r.id)) as any;
      return { data: null, error: null };
    }
    rows = expandRelations(table, rows, selectStr);
    if (limitN != null) rows = rows.slice(0, limitN);
    return { data: rows, error: null };
  };

  const builder: any = {
    select(s = "*") {
      selectStr = s;
      mode = mode === "insert" ? "insert" : "select";
      return builder;
    },
    eq(col: string, val: any) {
      filters.push([col, "eq", val]);
      return builder;
    },
    in(col: string, val: any[]) {
      filters.push([col, "in", val]);
      return builder;
    },
    ilike(col: string, val: any) {
      filters.push([col, "ilike", val]);
      return builder;
    },
    limit(n: number) {
      limitN = n;
      return builder;
    },
    order() {
      return builder;
    },
    update(p: any) {
      mode = "update";
      payload = p;
      return builder;
    },
    delete() {
      mode = "delete";
      return builder;
    },
    insert(p: any) {
      const arr = Array.isArray(p) ? p : [p];
      arr.forEach((row) => {
        db[table].push({ id: row.id || `gen-${Math.random().toString(36).slice(2, 10)}`, ...row });
      });
      return {
        select: () => ({
          single: async () => ({ data: db[table][db[table].length - 1], error: null }),
        }),
        single: async () => ({ data: db[table][db[table].length - 1], error: null }),
        then: (resolve: any) => resolve({ data: null, error: null }),
      };
    },
    async maybeSingle() {
      const { data } = exec();
      return { data: (data as any[])[0] || null, error: null };
    },
    async single() {
      const { data } = exec();
      const arr = data as any[];
      if (!arr.length) return { data: null, error: { message: "not found" } };
      return { data: arr[0], error: null };
    },
    then(resolve: any) {
      resolve(exec());
    },
  };
  return builder;
}

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: (table: keyof DB) => makeBuilder(table),
    auth: {
      getUser: async () => ({ data: { user: { id: "test-user" } }, error: null }),
    },
    rpc: async (name: string, args: any) => {
      rpcCalls.push({ name, args });
      if (name === "increment_cash_register") {
        const reg = db.cash_registers.find((r) => r.id === args.reg_id);
        if (reg) reg.current_balance = (reg.current_balance || 0) + args.delta;
      }
      return { data: null, error: null };
    },
    functions: {
      invoke: async (name: string, opts: any) => {
        fnInvocations.push({ name, body: opts?.body });
        return { data: { ok: true }, error: null };
      },
    },
  },
}));

// Stop wooStockSync from making real calls.
vi.mock("@/lib/wooStockSync", () => ({
  syncMultipleStockToWoo: vi.fn(),
  syncStockToWoo: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

// Import AFTER mocks are registered.
import { useCancelOrder, useUpdateOrderStatus, useDeleteOrder } from "@/hooks/useOrders";
import { QueryClient } from "@tanstack/react-query";

// Tiny helper to actually run a useMutation hook outside of React.
// We rebuild the mutationFn by calling the hook factory and grabbing the
// internal `mutationFn` via React Query's mutation observer — easier path:
// just re-implement by extracting via the hook's options. Here we cheat by
// invoking the hook through a fresh QueryClient and a direct mutate call.
import { renderHook } from "@testing-library/react";
import { QueryClientProvider } from "@tanstack/react-query";
import React from "react";

function wrapper(client: QueryClient) {
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client }, children);
}

async function runMutation<TVar>(
  hook: () => any,
  vars: TVar,
): Promise<{ ok: boolean; error?: any }> {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  const { result } = renderHook(() => hook(), { wrapper: wrapper(client) });
  try {
    await result.current.mutateAsync(vars);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e };
  }
}

// ---------------------------------------------------------------------------
// Fixture helpers
// ---------------------------------------------------------------------------

function seedSimpleOrder(opts: {
  orderId?: string;
  status?: string;
  warehouseId?: string | null;
  variationId?: string;
  quantity?: number;
  inventoryQty?: number;
  payments?: Array<{ amount: number; method: string; registerId?: string | null }>;
  registers?: Array<{ id: string; deferred?: boolean; balance?: number }>;
}) {
  const orderId = opts.orderId || "order-1";
  const variationId = opts.variationId || "var-1";
  const productId = "prod-1";
  const warehouseId = opts.warehouseId === undefined ? "wh-1" : opts.warehouseId;

  db.orders.push({
    id: orderId,
    order_number: 100,
    status: opts.status || "processing",
    assigned_warehouse_id: warehouseId,
    source: "manual",
    total: (opts.payments || []).reduce((s, p) => s + p.amount, 0) || 100,
  });
  db.product_variations.push({ id: variationId, product_id: productId });
  db.order_items.push({
    id: "oi-1",
    order_id: orderId,
    variation_id: variationId,
    quantity: opts.quantity ?? 1,
  });
  if (warehouseId) {
    db.inventory.push({
      id: "inv-1",
      variation_id: variationId,
      warehouse_id: warehouseId,
      quantity: opts.inventoryQty ?? 5,
    });
  }
  (opts.registers || []).forEach((r) =>
    db.cash_registers.push({
      id: r.id,
      requires_completed_order: !!r.deferred,
      current_balance: r.balance ?? 0,
    }),
  );
  (opts.payments || []).forEach((p, i) =>
    db.payments.push({
      id: `pay-${i}`,
      order_id: orderId,
      amount: p.amount,
      payment_method: p.method,
      cash_register_id: p.registerId ?? null,
    }),
  );
}

function seedBundleOrder() {
  // Bundle order: 1x bundle product expanding into 2x var-A and 1x var-B
  db.orders.push({
    id: "order-bundle",
    order_number: 200,
    status: "processing",
    assigned_warehouse_id: "wh-1",
    source: "manual",
    total: 250,
  });
  db.product_variations.push({ id: "bundle-var", product_id: "bundle-prod" });
  db.product_variations.push({ id: "var-A", product_id: "prod-A" });
  db.product_variations.push({ id: "var-B", product_id: "prod-B" });
  db.order_items.push({
    id: "oi-bundle",
    order_id: "order-bundle",
    variation_id: "bundle-var",
    quantity: 1,
  });
  db.bundles.push({ id: "bundle-1", product_id: "bundle-prod", bundle_type: "simple_bundle" });
  db.bundle_items.push({ bundle_id: "bundle-1", variation_id: "var-A", quantity: 2 });
  db.bundle_items.push({ bundle_id: "bundle-1", variation_id: "var-B", quantity: 1 });
  db.inventory.push({ id: "inv-A", variation_id: "var-A", warehouse_id: "wh-1", quantity: 0 });
  db.inventory.push({ id: "inv-B", variation_id: "var-B", warehouse_id: "wh-1", quantity: 3 });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("useCancelOrder — inventory restoration", () => {
  beforeEach(() => resetDb());

  it("restores inventory and marks order cancelled (assigned warehouse)", async () => {
    seedSimpleOrder({ inventoryQty: 4, quantity: 1 });
    const r = await runMutation(useCancelOrder, "order-1");
    expect(r.ok).toBe(true);

    expect(db.inventory[0].quantity).toBe(5); // 4 + 1
    expect(db.orders[0].status).toBe("cancelled");
    expect(db.inventory_log.filter((l) => l.action_type === "adjustment").length).toBe(1);
  });

  it("is idempotent: a second cancel does not double-restore", async () => {
    seedSimpleOrder({ inventoryQty: 4, quantity: 1 });
    await runMutation(useCancelOrder, "order-1");
    expect(db.inventory[0].quantity).toBe(5);

    // Re-open the order (simulate retry path) but keep the existing log entry.
    db.orders[0].status = "processing";
    const r2 = await runMutation(useCancelOrder, "order-1");
    expect(r2.ok).toBe(true);

    // No double restore — quantity should stay at 5.
    expect(db.inventory[0].quantity).toBe(5);
    expect(db.inventory_log.filter((l) => l.action_type === "adjustment").length).toBe(1);
  });

  it("throws when order is already cancelled", async () => {
    seedSimpleOrder({ status: "cancelled" });
    const r = await runMutation(useCancelOrder, "order-1");
    expect(r.ok).toBe(false);
    expect(String(r.error?.message || r.error)).toMatch(/כבר בוטלה/);
  });

  it("skips inventory step when no warehouse assigned", async () => {
    seedSimpleOrder({ warehouseId: null });
    const r = await runMutation(useCancelOrder, "order-1");
    expect(r.ok).toBe(true);
    expect(db.inventory_log.length).toBe(0);
    expect(db.orders[0].status).toBe("cancelled");
  });

  it("expands bundles into component variations on restore", async () => {
    seedBundleOrder();
    const r = await runMutation(useCancelOrder, "order-bundle");
    expect(r.ok).toBe(true);

    const invA = db.inventory.find((i) => i.variation_id === "var-A");
    const invB = db.inventory.find((i) => i.variation_id === "var-B");
    expect(invA?.quantity).toBe(2); // 0 + (2*1)
    expect(invB?.quantity).toBe(4); // 3 + (1*1)
  });

  it("refunds cash on a non-deferred register and skips deferred ones", async () => {
    seedSimpleOrder({
      registers: [
        { id: "reg-immediate", deferred: false, balance: 500 },
        { id: "reg-deferred", deferred: true, balance: 1000 },
      ],
      payments: [
        { amount: 80, method: "cash", registerId: "reg-immediate" },
        { amount: 120, method: "cash", registerId: "reg-deferred" },
      ],
    });
    const r = await runMutation(useCancelOrder, "order-1");
    expect(r.ok).toBe(true);

    const calls = rpcCalls.filter((c) => c.name === "increment_cash_register");
    expect(calls.length).toBe(1);
    expect(calls[0].args).toEqual({ reg_id: "reg-immediate", delta: -80 });

    expect(db.payments.length).toBe(0);
  });
});

describe("useUpdateOrderStatus — cancellation guard", () => {
  beforeEach(() => resetDb());

  it("blocks direct transition to 'cancelled'", async () => {
    seedSimpleOrder({ status: "processing" });
    const r = await runMutation(useUpdateOrderStatus, { id: "order-1", status: "cancelled" } as any);
    expect(r.ok).toBe(false);
    expect(String(r.error?.message || r.error)).toMatch(/כפתור 'בטל הזמנה'/);
    // Order must remain in its previous status.
    expect(db.orders[0].status).toBe("processing");
    // No inventory mutation.
    expect(db.inventory_log.length).toBe(0);
  });

  it("allows non-cancellation status changes", async () => {
    seedSimpleOrder({ status: "processing" });
    const r = await runMutation(useUpdateOrderStatus, { id: "order-1", status: "picking" } as any);
    expect(r.ok).toBe(true);
    expect(db.orders[0].status).toBe("picking");
  });
});

describe("useDeleteOrder — inventory restoration", () => {
  beforeEach(() => resetDb());

  it("restores inventory when deleting an assigned, non-cancelled order", async () => {
    seedSimpleOrder({ inventoryQty: 4, quantity: 2, status: "processing" });
    const r = await runMutation(useDeleteOrder, "order-1");
    expect(r.ok).toBe(true);

    expect(db.inventory[0].quantity).toBe(6); // 4 + 2
    expect(db.orders.length).toBe(0); // order deleted
    expect(db.inventory_log.filter((l) => l.notes?.includes("מחיקת הזמנה")).length).toBe(1);
  });

  it("does NOT restore inventory when deleting an already-cancelled order (no double credit)", async () => {
    seedSimpleOrder({ inventoryQty: 5, quantity: 2, status: "cancelled" });
    const r = await runMutation(useDeleteOrder, "order-1");
    expect(r.ok).toBe(true);

    // Inventory unchanged because cancel already restored it.
    expect(db.inventory[0].quantity).toBe(5);
    expect(db.orders.length).toBe(0);
    expect(db.inventory_log.length).toBe(0);
  });

  it("does not restore when no warehouse was assigned", async () => {
    seedSimpleOrder({ warehouseId: null, status: "pending" });
    const r = await runMutation(useDeleteOrder, "order-1");
    expect(r.ok).toBe(true);
    expect(db.inventory_log.length).toBe(0);
    expect(db.orders.length).toBe(0);
  });

  it("reverses cash from non-deferred register only when the order was completed", async () => {
    seedSimpleOrder({
      status: "completed",
      registers: [
        { id: "reg-imm", deferred: false, balance: 200 },
        { id: "reg-def", deferred: true, balance: 300 },
      ],
      payments: [
        { amount: 50, method: "cash", registerId: "reg-imm" },
        { amount: 70, method: "cash", registerId: "reg-def" },
      ],
    });
    const r = await runMutation(useDeleteOrder, "order-1");
    expect(r.ok).toBe(true);

    const calls = rpcCalls.filter((c) => c.name === "increment_cash_register");
    expect(calls.length).toBe(1);
    expect(calls[0].args).toEqual({ reg_id: "reg-imm", delta: -50 });
  });

  it("does not reverse cash for a non-completed order (balance was never added)", async () => {
    seedSimpleOrder({
      status: "processing",
      registers: [{ id: "reg-imm", deferred: false, balance: 200 }],
      payments: [{ amount: 50, method: "cash", registerId: "reg-imm" }],
    });
    const r = await runMutation(useDeleteOrder, "order-1");
    expect(r.ok).toBe(true);
    expect(rpcCalls.filter((c) => c.name === "increment_cash_register").length).toBe(0);
  });
});
