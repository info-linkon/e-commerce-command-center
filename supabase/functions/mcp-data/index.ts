// Read-only MCP server (Model Context Protocol, Streamable HTTP) exposing store DATA
// to the site owner's Claude: sales, orders, products, stock, customers, deliveries.
//
// - Read only: every tool runs a fixed SELECT through supabase-js. No SQL input,
//   no writes, no access to code, edge functions, users, roles, settings or secrets.
// - Auth: a random token stored in Vault ("mcp_data_token"), passed in the URL
//   (?key=...) or as "Authorization: Bearer ...". Checked by verify_mcp_data_token(),
//   which only the service role can call. Rotate by updating the Vault secret.
// - verify_jwt = false (Claude connectors don't send Supabase JWTs).
import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

const SERVER_INFO = { name: "elwejha-store-data", version: "1.0.0" };
const SUPPORTED_VERSIONS = ["2025-06-18", "2025-03-26", "2024-11-05"];
const TZ = "Asia/Jerusalem";
// Same definition as the CRM sales reports: these never count as sales.
const NON_SALE_STATUSES = ["cancelled", "unfulfilled", "external_unfulfilled"];

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type, mcp-session-id, mcp-protocol-version, accept",
  "Access-Control-Allow-Methods": "POST, GET, DELETE, OPTIONS",
  "Access-Control-Expose-Headers": "mcp-session-id",
};
const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

// ---------- helpers ----------

/** Offset like "+02:00" for Asia/Jerusalem on a given date. */
function tzOffset(date: Date): string {
  const part = new Intl.DateTimeFormat("en-US", { timeZone: TZ, timeZoneName: "longOffset" })
    .formatToParts(date)
    .find((p) => p.type === "timeZoneName")?.value || "GMT+02:00";
  const m = part.match(/GMT([+-]\d{2}):?(\d{2})?/);
  return m ? `${m[1]}:${m[2] || "00"}` : "+02:00";
}

/** "YYYY-MM-DD" (Israel time) → ISO timestamp at start of that day; endOfDay → start of next day. */
function dayBoundary(day: string, endOfDay = false): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) throw new Error(`Invalid date "${day}", expected YYYY-MM-DD`);
  const d = new Date(`${day}T12:00:00Z`);
  if (endOfDay) d.setUTCDate(d.getUTCDate() + 1);
  const ymd = d.toISOString().slice(0, 10);
  return new Date(`${ymd}T00:00:00${tzOffset(d)}`).toISOString();
}

function israelDay(iso: string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(iso));
}

function todayIsrael(): string {
  return israelDay(new Date().toISOString());
}

function addDays(day: string, n: number): string {
  const d = new Date(`${day}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

function range(args: Record<string, unknown>, defaultDays = 30) {
  const to = (args.to as string) || todayIsrael();
  const from = (args.from as string) || addDays(to, -(defaultDays - 1));
  return { from, to, fromIso: dayBoundary(from), toIso: dayBoundary(to, true) };
}

const clamp = (v: unknown, def: number, max: number) => Math.max(1, Math.min(max, Math.floor(Number(v) || def)));
const round2 = (n: number) => Math.round(n * 100) / 100;

/** Fetch all rows of a query in pages (capped). */
async function fetchAll<T>(build: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }>, cap = 20000): Promise<T[]> {
  const out: T[] = [];
  const page = 1000;
  for (let i = 0; i < cap; i += page) {
    const { data, error } = await build(i, i + page - 1);
    if (error) throw new Error((error as { message?: string }).message || String(error));
    out.push(...(data || []));
    if (!data || data.length < page) break;
  }
  return out;
}

const itemName = (i: any) =>
  i.product_variations?.products?.name ||
  i.bundle_variations?.name_he ||
  i.bundle_variations?.name ||
  i.product_variations?.name ||
  "";

function weekStart(day: string): string {
  const d = new Date(`${day}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() - d.getUTCDay()); // weeks start on Sunday (Israel)
  return d.toISOString().slice(0, 10);
}

// ---------- tools ----------

type Tool = {
  name: string;
  title: string;
  description: string;
  inputSchema: Record<string, unknown>;
  run: (db: SupabaseClient, args: Record<string, any>) => Promise<unknown>;
};

const dateProps = {
  from: { type: "string", description: "Start date YYYY-MM-DD (Israel time). Default: 30 days before `to`." },
  to: { type: "string", description: "End date YYYY-MM-DD inclusive (Israel time). Default: today." },
};

const TOOLS: Tool[] = [
  {
    name: "sales_summary",
    title: "Sales summary",
    description:
      "Revenue, order count and average order value for a date range, broken down by period and by source (website / pos / manual) and payment method. Cancelled, unfulfilled and deleted orders are excluded (same as the CRM reports). Amounts in ILS (₪).",
    inputSchema: {
      type: "object",
      properties: {
        ...dateProps,
        group_by: { type: "string", enum: ["day", "week", "month", "none"], description: "Period breakdown. Default: day." },
      },
    },
    run: async (db, args) => {
      const r = range(args);
      const groupBy = args.group_by || "day";
      const orders = await fetchAll<any>((a, b) =>
        db.from("orders")
          .select("total, created_at, source, payment_method, shipping_cost, discount_amount")
          .is("deleted_at", null)
          .not("status", "in", `(${NON_SALE_STATUSES.join(",")})`)
          .gte("created_at", r.fromIso).lt("created_at", r.toIso)
          .order("created_at").range(a, b));
      const sum = (xs: any[]) => round2(xs.reduce((s, o) => s + Number(o.total || 0), 0));
      const by = (key: (o: any) => string) => {
        const m = new Map<string, any[]>();
        for (const o of orders) { const k = key(o) || "unknown"; m.set(k, [...(m.get(k) || []), o]); }
        return [...m.entries()].map(([k, xs]) => ({ key: k, orders: xs.length, revenue: sum(xs) }));
      };
      const total = sum(orders);
      return {
        from: r.from, to: r.to, currency: "ILS",
        orders: orders.length,
        revenue: total,
        average_order_value: orders.length ? round2(total / orders.length) : 0,
        shipping_collected: round2(orders.reduce((s, o) => s + Number(o.shipping_cost || 0), 0)),
        discounts_given: round2(orders.reduce((s, o) => s + Number(o.discount_amount || 0), 0)),
        by_source: by((o) => o.source),
        by_payment_method: by((o) => o.payment_method),
        by_period: groupBy === "none" ? undefined : by((o) => {
          const d = israelDay(o.created_at);
          return groupBy === "month" ? d.slice(0, 7) : groupBy === "week" ? weekStart(d) : d;
        }).sort((x, y) => x.key.localeCompare(y.key)).map((p) => ({ period: p.key, orders: p.orders, revenue: p.revenue })),
      };
    },
  },
  {
    name: "list_orders",
    title: "List orders",
    description:
      "List orders (newest first) with customer, total, status, source and payment method. Filter by date range, status, source or a search term (order number, customer name or phone).",
    inputSchema: {
      type: "object",
      properties: {
        ...dateProps,
        status: { type: "string", enum: ["pending", "processing", "completed", "cancelled", "pending_payment", "picking", "shipping", "delivered", "unfulfilled", "external_unfulfilled"] },
        source: { type: "string", enum: ["website", "pos", "manual"] },
        search: { type: "string", description: "Order number, customer name or phone." },
        limit: { type: "number", description: "Max rows (default 50, max 200)." },
        offset: { type: "number", description: "Skip rows for paging." },
      },
    },
    run: async (db, args) => {
      const r = range(args, 30);
      const limit = clamp(args.limit, 50, 200);
      const offset = Math.max(0, Math.floor(Number(args.offset) || 0));
      let q = db.from("orders")
        .select("order_number, created_at, status, source, order_channel, payment_method, total, shipping_cost, discount_amount, customer_name, customer_phone, shipping_city, picking_status", { count: "exact" })
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .range(offset, offset + limit - 1);
      const search = String(args.search || "").trim();
      if (search && /^\d+$/.test(search) && search.length <= 7) q = q.eq("order_number", Number(search));
      else {
        q = q.gte("created_at", r.fromIso).lt("created_at", r.toIso);
        if (search) q = q.or(`customer_name.ilike.%${search.replace(/[%,()]/g, "")}%,customer_phone.ilike.%${search.replace(/[%,()]/g, "")}%`);
      }
      if (args.status) q = q.eq("status", args.status);
      if (args.source) q = q.eq("source", args.source);
      const { data, error, count } = await q;
      if (error) throw new Error(error.message);
      return { total_matching: count, returned: data?.length || 0, offset, orders: (data || []).map((o: any) => ({ ...o, created_at: israelDay(o.created_at) + " " + new Date(o.created_at).toLocaleTimeString("he-IL", { timeZone: TZ, hour: "2-digit", minute: "2-digit" }) })) };
    },
  },
  {
    name: "get_order",
    title: "Order details",
    description: "Full details of one order by order number: customer, address, items, payments, delivery / courier status and invoice.",
    inputSchema: {
      type: "object",
      properties: { order_number: { type: "number", description: "The order number, e.g. 794." } },
      required: ["order_number"],
    },
    run: async (db, args) => {
      const { data: o, error } = await db.from("orders")
        .select("id, order_number, created_at, status, source, order_channel, payment_method, total, shipping_cost, discount_amount, discount_type, customer_name, customer_phone, customer_email, shipping_address, shipping_city, notes, picking_status, invoice_url, deleted_at, order_items(quantity, unit_price, total_price, product_variations(sku, name, products(name)), bundle_variations(sku, name, name_he)), payments(amount, payment_method, created_at), deliveries(status, created_at, delivered_at, external_sequence, external_status, cod_amount, delivery_companies(name)), documents(doc_type, doc_number, total, doc_url, status)")
        .eq("order_number", Number(args.order_number))
        .maybeSingle();
      if (error) throw new Error(error.message);
      if (!o) return { error: `Order ${args.order_number} not found` };
      const { id: _id, order_items, ...rest } = o as any;
      return {
        ...rest,
        items: (order_items || []).map((i: any) => ({
          name: itemName(i), variation: i.product_variations?.name || null,
          sku: i.product_variations?.sku || i.bundle_variations?.sku || null,
          quantity: i.quantity, unit_price: i.unit_price, total_price: i.total_price,
        })),
      };
    },
  },
  {
    name: "top_products",
    title: "Top products",
    description: "Best-selling products in a date range by revenue or quantity (from order lines of non-cancelled, non-deleted orders).",
    inputSchema: {
      type: "object",
      properties: {
        ...dateProps,
        sort_by: { type: "string", enum: ["revenue", "quantity"], description: "Default: revenue." },
        limit: { type: "number", description: "Default 20, max 100." },
      },
    },
    run: async (db, args) => {
      const r = range(args);
      const lines = await fetchAll<any>((a, b) =>
        db.from("order_items")
          .select("quantity, total_price, product_variations(sku, name, products(name)), bundle_variations(sku, name, name_he), orders!inner(created_at, status, deleted_at)")
          .gte("orders.created_at", r.fromIso).lt("orders.created_at", r.toIso)
          .is("orders.deleted_at", null)
          .not("orders.status", "in", `(${NON_SALE_STATUSES.join(",")})`)
          .range(a, b));
      const m = new Map<string, { product: string; quantity: number; revenue: number; orders_lines: number }>();
      for (const l of lines) {
        const k = itemName(l) || "unknown";
        const cur = m.get(k) || { product: k, quantity: 0, revenue: 0, orders_lines: 0 };
        cur.quantity += Number(l.quantity || 0);
        cur.revenue += Number(l.total_price || 0);
        cur.orders_lines += 1;
        m.set(k, cur);
      }
      const key = args.sort_by === "quantity" ? "quantity" : "revenue";
      const rows = [...m.values()].map((x) => ({ ...x, revenue: round2(x.revenue) }))
        .sort((x, y) => (y as any)[key] - (x as any)[key]).slice(0, clamp(args.limit, 20, 100));
      return { from: r.from, to: r.to, sort_by: key, products: rows };
    },
  },
  {
    name: "list_products",
    title: "Products & prices",
    description: "Products with price, sale/compare price, cost price, published flag and total stock across warehouses. Search by name, SKU or product number.",
    inputSchema: {
      type: "object",
      properties: {
        search: { type: "string" },
        published_only: { type: "boolean", description: "Default false." },
        limit: { type: "number", description: "Default 50, max 200." },
        offset: { type: "number" },
      },
    },
    run: async (db, args) => {
      const limit = clamp(args.limit, 50, 200);
      const offset = Math.max(0, Math.floor(Number(args.offset) || 0));
      let q = db.from("products")
        .select("product_number, name, name_ar, sku, product_type, sale_price, compare_at_price, cost_price, is_published, categories!category_id(name), product_variations(sku, name, price, compare_at_price, cost_price, inventory(quantity))", { count: "exact" })
        .order("name").range(offset, offset + limit - 1);
      const s = String(args.search || "").replace(/[%,()]/g, "").trim();
      if (s) q = q.or(`name.ilike.%${s}%,name_ar.ilike.%${s}%,sku.ilike.%${s}%${/^\d+$/.test(s) ? `,product_number.eq.${s}` : ""}`);
      if (args.published_only) q = q.eq("is_published", true);
      const { data, error, count } = await q;
      if (error) throw new Error(error.message);
      return {
        total_matching: count, offset,
        products: (data || []).map((p: any) => {
          const variations = (p.product_variations || []).map((v: any) => ({
            sku: v.sku, name: v.name, price: v.price, compare_at_price: v.compare_at_price, cost_price: v.cost_price,
            stock: (v.inventory || []).reduce((s: number, i: any) => s + Number(i.quantity || 0), 0),
          }));
          return {
            product_number: p.product_number, name: p.name, name_ar: p.name_ar, sku: p.sku, type: p.product_type,
            category: p.categories?.name || null, price: p.sale_price, compare_at_price: p.compare_at_price, cost_price: p.cost_price,
            published: p.is_published, total_stock: variations.reduce((s: number, v: any) => s + v.stock, 0),
            variations: p.product_type === "variable" || variations.length > 1 ? variations : undefined,
          };
        }),
      };
    },
  },
  {
    name: "stock_levels",
    title: "Stock levels",
    description: "Stock per product variation and warehouse. Use low_stock_threshold to list only items at or below a quantity (e.g. 0 for out of stock).",
    inputSchema: {
      type: "object",
      properties: {
        low_stock_threshold: { type: "number", description: "Only rows with quantity <= this." },
        search: { type: "string", description: "Product name or SKU." },
        limit: { type: "number", description: "Default 100, max 500." },
      },
    },
    run: async (db, args) => {
      const rows = await fetchAll<any>((a, b) =>
        db.from("inventory").select("quantity, warehouses(name, is_active), product_variations(sku, name, products(name, is_published))").range(a, b));
      const s = String(args.search || "").toLowerCase().trim();
      let out = rows
        .filter((r: any) => r.warehouses?.is_active !== false)
        .map((r: any) => ({
          product: r.product_variations?.products?.name || "", variation: r.product_variations?.name || null,
          sku: r.product_variations?.sku || null, warehouse: r.warehouses?.name || null,
          quantity: Number(r.quantity || 0), published: r.product_variations?.products?.is_published ?? null,
        }));
      if (s) out = out.filter((r) => `${r.product} ${r.variation} ${r.sku}`.toLowerCase().includes(s));
      if (args.low_stock_threshold !== undefined && args.low_stock_threshold !== null) {
        const t = Number(args.low_stock_threshold);
        out = out.filter((r) => r.quantity <= t);
      }
      out.sort((x, y) => x.quantity - y.quantity || x.product.localeCompare(y.product));
      return { rows: out.length, items: out.slice(0, clamp(args.limit, 100, 500)) };
    },
  },
  {
    name: "list_customers",
    title: "Customers",
    description: "Customers with number of orders, total spent and last order date. Search by name or phone; sort by total spent or most recent.",
    inputSchema: {
      type: "object",
      properties: {
        search: { type: "string" },
        sort_by: { type: "string", enum: ["total_spent", "last_order", "orders"], description: "Default total_spent." },
        limit: { type: "number", description: "Default 50, max 200." },
      },
    },
    run: async (db, args) => {
      const s = String(args.search || "").replace(/[%,()]/g, "").trim();
      const orders = await fetchAll<any>((a, b) => {
        let q = db.from("orders").select("customer_name, customer_phone, customer_email, shipping_city, total, created_at")
          .is("deleted_at", null).not("status", "in", `(${NON_SALE_STATUSES.join(",")})`).range(a, b);
        if (s) q = q.or(`customer_name.ilike.%${s}%,customer_phone.ilike.%${s}%`);
        return q;
      });
      const m = new Map<string, any>();
      for (const o of orders) {
        const key = (o.customer_phone || "").replace(/\D/g, "").slice(-9) || o.customer_name || "unknown";
        const c = m.get(key) || { name: o.customer_name, phone: o.customer_phone, email: o.customer_email, city: o.shipping_city, orders: 0, total_spent: 0, first_order: o.created_at, last_order: o.created_at };
        c.orders += 1; c.total_spent += Number(o.total || 0);
        if (o.created_at > c.last_order) { c.last_order = o.created_at; c.name = o.customer_name || c.name; }
        if (o.created_at < c.first_order) c.first_order = o.created_at;
        m.set(key, c);
      }
      const sortKey = args.sort_by === "last_order" ? "last_order" : args.sort_by === "orders" ? "orders" : "total_spent";
      const list = [...m.values()]
        .sort((x, y) => (sortKey === "last_order" ? String(y.last_order).localeCompare(String(x.last_order)) : y[sortKey] - x[sortKey]))
        .slice(0, clamp(args.limit, 50, 200))
        .map((c) => ({ ...c, total_spent: round2(c.total_spent), first_order: israelDay(c.first_order), last_order: israelDay(c.last_order) }));
      return { customers_matching: m.size, customers: list };
    },
  },
  {
    name: "list_deliveries",
    title: "Deliveries",
    description: "Deliveries with courier (Olivery, internal couriers), status, Olivery tracking number/status and amount to collect. Filter by status or date range.",
    inputSchema: {
      type: "object",
      properties: {
        ...dateProps,
        status: { type: "string", enum: ["pending", "in_transit", "delivered"] },
        limit: { type: "number", description: "Default 50, max 200." },
      },
    },
    run: async (db, args) => {
      const r = range(args, 30);
      let q = db.from("deliveries")
        .select("status, created_at, delivered_at, external_sequence, external_status, external_area, cod_amount, delivery_companies(name), orders(order_number, customer_name, customer_phone, total, shipping_city)")
        .gte("created_at", r.fromIso).lt("created_at", r.toIso)
        .order("created_at", { ascending: false }).limit(clamp(args.limit, 50, 200));
      if (args.status) q = q.eq("status", args.status);
      const { data, error } = await q;
      if (error) throw new Error(error.message);
      return { from: r.from, to: r.to, deliveries: (data || []).map((d: any) => ({
        order_number: d.orders?.order_number, customer: d.orders?.customer_name, phone: d.orders?.customer_phone,
        city: d.orders?.shipping_city, order_total: d.orders?.total, courier: d.delivery_companies?.name,
        status: d.status, olivery_tracking: d.external_sequence, olivery_status: d.external_status,
        area: d.external_area, cod_amount: d.cod_amount, created: israelDay(d.created_at),
        delivered: d.delivered_at ? israelDay(d.delivered_at) : null,
      })) };
    },
  },
  {
    name: "payments_and_expenses",
    title: "Payments & expenses",
    description: "Money in (payments by method and cash register) and money out (expenses) for a date range.",
    inputSchema: { type: "object", properties: { ...dateProps } },
    run: async (db, args) => {
      const r = range(args);
      const payments = await fetchAll<any>((a, b) =>
        db.from("payments").select("amount, payment_method, cash_registers(name)").gte("created_at", r.fromIso).lt("created_at", r.toIso).range(a, b));
      const expenses = await fetchAll<any>((a, b) =>
        db.from("expenses").select("amount, description, payment_source, created_at, cash_registers(name)").gte("created_at", r.fromIso).lt("created_at", r.toIso).order("created_at").range(a, b));
      const group = (xs: any[], key: (x: any) => string) => {
        const m = new Map<string, number>();
        for (const x of xs) m.set(key(x) || "unknown", (m.get(key(x) || "unknown") || 0) + Number(x.amount || 0));
        return [...m.entries()].map(([k, v]) => ({ key: k, amount: round2(v) }));
      };
      return {
        from: r.from, to: r.to, currency: "ILS",
        payments_total: round2(payments.reduce((s, p) => s + Number(p.amount || 0), 0)),
        payments_by_method: group(payments, (p) => p.payment_method),
        payments_by_register: group(payments, (p) => p.cash_registers?.name),
        expenses_total: round2(expenses.reduce((s, e) => s + Number(e.amount || 0), 0)),
        expenses: expenses.slice(0, 200).map((e) => ({ date: israelDay(e.created_at), amount: e.amount, description: e.description, source: e.payment_source, register: e.cash_registers?.name || null })),
      };
    },
  },
];

const TOOL_MAP = new Map(TOOLS.map((t) => [t.name, t]));

// ---------- JSON-RPC / MCP ----------

async function handleRpc(db: SupabaseClient, msg: any): Promise<any | null> {
  const id = msg?.id;
  const isNotification = id === undefined || id === null;
  const ok = (result: unknown) => ({ jsonrpc: "2.0", id, result });
  const err = (code: number, message: string) => ({ jsonrpc: "2.0", id: id ?? null, error: { code, message } });

  if (!msg || msg.jsonrpc !== "2.0" || typeof msg.method !== "string") return isNotification ? null : err(-32600, "Invalid Request");
  if (isNotification) return null; // notifications/initialized etc.

  switch (msg.method) {
    case "initialize": {
      const requested = msg.params?.protocolVersion;
      return ok({
        protocolVersion: SUPPORTED_VERSIONS.includes(requested) ? requested : SUPPORTED_VERSIONS[0],
        capabilities: { tools: { listChanged: false } },
        serverInfo: SERVER_INFO,
        instructions:
          "Read-only access to the Elwejha store data (CRM): sales, orders, products, stock, customers, deliveries, payments and expenses. Amounts are in ILS (₪); dates are Israel time (YYYY-MM-DD). Sales exclude cancelled, unfulfilled and deleted orders, matching the CRM reports. Nothing can be changed through this server.",
      });
    }
    case "ping":
      return ok({});
    case "tools/list":
      return ok({
        tools: TOOLS.map((t) => ({
          name: t.name, title: t.title, description: t.description, inputSchema: t.inputSchema,
          annotations: { title: t.title, readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
        })),
      });
    case "tools/call": {
      const tool = TOOL_MAP.get(msg.params?.name);
      if (!tool) return err(-32602, `Unknown tool: ${msg.params?.name}`);
      try {
        const result = await tool.run(db, msg.params?.arguments || {});
        return ok({ content: [{ type: "text", text: JSON.stringify(result, null, 1) }] });
      } catch (e) {
        return ok({ isError: true, content: [{ type: "text", text: e instanceof Error ? e.message : String(e) }] });
      }
    }
    case "resources/list":
      return ok({ resources: [] });
    case "prompts/list":
      return ok({ prompts: [] });
    default:
      return err(-32601, `Method not found: ${msg.method}`);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });

  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { persistSession: false },
  });

  // Auth: ?key=... or Authorization: Bearer ...
  const url = new URL(req.url);
  const token = url.searchParams.get("key") || (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
  if (!token) return jsonResponse({ error: "Unauthorized" }, 401);
  const { data: valid, error: authErr } = await db.rpc("verify_mcp_data_token", { p_token: token });
  if (authErr || !valid) return jsonResponse({ error: "Unauthorized" }, 401);

  if (req.method === "GET" || req.method === "DELETE") {
    // Stateless server: no SSE stream, no sessions.
    return new Response("Method Not Allowed", { status: 405, headers: { ...cors, Allow: "POST" } });
  }
  if (req.method !== "POST") return new Response("Method Not Allowed", { status: 405, headers: cors });

  let body: any;
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ jsonrpc: "2.0", id: null, error: { code: -32700, message: "Parse error" } }, 400);
  }

  if (Array.isArray(body)) {
    const results = (await Promise.all(body.map((m) => handleRpc(db, m)))).filter(Boolean);
    return results.length ? jsonResponse(results) : new Response(null, { status: 202, headers: cors });
  }
  const result = await handleRpc(db, body);
  return result ? jsonResponse(result) : new Response(null, { status: 202, headers: cors });
});
