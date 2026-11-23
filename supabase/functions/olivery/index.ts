// Olivery delivery API integration (https://ainmem.olivery.app)
// Called from the CRM with the logged-in user's JWT.
//
// Required secrets:
//   OLIVERY_LOGIN     – Olivery business username (mobile number)
//   OLIVERY_PASSWORD  – Olivery password
// Optional:
//   OLIVERY_DB        – Olivery database name (default "ainmem")
//   OLIVERY_BASE_URL  – API base URL (default "https://ainmem.olivery.app")
//
// Actions (POST body { action, ... }):
//   areas                         → list of areas
//   sub_areas { area_id? }        → list of sub areas (optionally filtered by area)
//   create { delivery_id, area, sub_area?, cod_amount, address?, notes? }
//                                 → creates the shipment in Olivery, stores its id/sequence
//   sync { delivery_id }          → refreshes the Olivery status for one delivery
//   sync_all                      → refreshes every open Olivery delivery
//                                   (also run every 15 min by pg_cron, see migration olivery_status_cron)
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const BASE_URL = (Deno.env.get("OLIVERY_BASE_URL") || "https://ainmem.olivery.app").replace(/\/$/, "");
const DB = Deno.env.get("OLIVERY_DB") || "ainmem";

// Olivery status name → local delivery_status
const DELIVERED = new Set([
  "delivered", "delivered_stuck", "delivered_partial", "completed",
  "money_received", "money_in", "money_out", "money_out_to_branch", "paid",
]);
const PENDING = new Set(["waiting"]);
// Final statuses where we stop polling (delivered or returned/cancelled)
const FINAL = new Set([
  ...DELIVERED, "canceled", "deleted", "completed_returned", "returned_delivered", "branch_returned",
]);

function mapStatus(s: string | null | undefined): "pending" | "in_transit" | "delivered" | null {
  if (!s) return null;
  if (DELIVERED.has(s)) return "delivered";
  if (PENDING.has(s)) return "pending";
  return "in_transit";
}

// Note: some endpoints are documented as GET, but all accept POST (Deno fetch forbids a body on GET).
async function olivery(path: string, params: Record<string, unknown>) {
  const login = Deno.env.get("OLIVERY_LOGIN");
  const password = Deno.env.get("OLIVERY_PASSWORD");
  if (!login || !password) throw new Error("Olivery credentials are not configured (OLIVERY_LOGIN / OLIVERY_PASSWORD)");

  const res = await fetch(`${BASE_URL}/${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", params: { login, password, db: DB, ...params } }),
  });
  const text = await res.text();
  let data: any;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(`Olivery ${path}: HTTP ${res.status} – ${text.slice(0, 200)}`);
  }
  if (data.error) {
    throw new Error(`Olivery ${path}: ${data.error?.data?.message || data.error?.message || JSON.stringify(data.error)}`);
  }
  const result = data.result;
  if (result && typeof result === "object" && !Array.isArray(result)) {
    const code = result.code ?? result.status;
    if (result.Success === false || (code && Number(code) >= 400)) {
      throw new Error(`Olivery ${path}: ${result.Message || result.message || JSON.stringify(result)}`);
    }
  }
  return result;
}

/** Normalise Israeli/Palestinian numbers to local 05XXXXXXXX format. */
function normalizePhone(p: string | null | undefined): string {
  let s = (p || "").replace(/[^\d+]/g, "");
  if (s.startsWith("+")) s = s.slice(1);
  if (s.startsWith("00")) s = s.slice(2);
  if (s.startsWith("972") || s.startsWith("970")) s = "0" + s.slice(3);
  return s;
}

/** Finds an Olivery shipment by our reference id (order number) via the bulk /order endpoint. */
async function findByReference(ref: string): Promise<{ id: string; sequence: string | null; state: string | null } | null> {
  const result = await olivery("order", { order_ids: [ref] });
  const list: any[] = Array.isArray(result?.response) ? result.response : [];
  const matches = list.filter((o) => String(o.reference_id) === ref && o.state !== "deleted" && o.state !== "canceled");
  if (!matches.length) return null;
  const best = matches.sort((x, y) => Number(y.id) - Number(x.id))[0];
  return { id: String(best.id), sequence: best.sequence ? String(best.sequence) : null, state: best.state ?? null };
}

async function syncOne(admin: any, delivery: any) {
  const orderId = delivery.external_sequence || delivery.external_id;
  if (!orderId) return { id: delivery.id, skipped: true };
  try {
    const result = await olivery("get_order_status", { order_id: orderId });
    const extStatus: string | null = result?.response?.status ?? null;
    if (!delivery.external_sequence && result?.response?.sequence) {
      await admin.from("deliveries").update({ external_sequence: String(result.response.sequence) }).eq("id", delivery.id);
    }
    const local = mapStatus(extStatus);
    const updates: Record<string, unknown> = {
      external_status: extStatus,
      external_synced_at: new Date().toISOString(),
      external_error: null,
    };
    if (local) updates.status = local;
    if (local === "delivered" && !delivery.delivered_at) updates.delivered_at = new Date().toISOString();
    await admin.from("deliveries").update(updates).eq("id", delivery.id);
    return { id: delivery.id, external_status: extStatus, status: local ?? delivery.status };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await admin.from("deliveries").update({ external_error: msg, external_synced_at: new Date().toISOString() }).eq("id", delivery.id);
    return { id: delivery.id, error: msg };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const admin = createClient(supabaseUrl, serviceKey);

    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace(/^Bearer\s+/i, "");
    const body = await req.json().catch(() => ({}));
    const action = body.action as string;

    // Scheduled job (pg_cron): a Vault-stored token that only allows "sync_all".
    const cronToken = req.headers.get("x-cron-token");
    let isCron = false;
    if (cronToken) {
      const { data: ok } = await admin.rpc("verify_olivery_cron_token", { p_token: cronToken });
      if (!ok || action !== "sync_all") return json({ error: "Unauthorized" }, 401);
      isCron = true;
    }

    // Otherwise allow the service role, or require a logged-in user.
    if (!isCron && token !== serviceKey) {
      if (!token) return json({ error: "Missing authorization" }, 401);
      const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
      const { data: userData, error: userErr } = await userClient.auth.getUser();
      if (userErr || !userData?.user) return json({ error: "Unauthorized" }, 401);
    }

    switch (action) {
      case "areas": {
        const result = await olivery("get_areas", {});
        const areas = (result?.response || []).map((a: any) => ({ id: a.id, name: a.name, code: a.code }));
        return json({ success: true, areas });
      }

      case "sub_areas": {
        const result = await olivery("get_sub_areas", {});
        const list = Array.isArray(result) ? result : result?.response || [];
        let subAreas = list.map((s: any) => ({ id: s.id, name: s.name, code: s.code, area_id: s.area?.id, area_name: s.area?.name }));
        if (body.area_id) subAreas = subAreas.filter((s: any) => String(s.area_id) === String(body.area_id));
        return json({ success: true, sub_areas: subAreas });
      }

      case "create": {
        const { delivery_id, area, sub_area, cod_amount, address, notes } = body;
        if (!delivery_id) return json({ error: "delivery_id is required" }, 400);
        if (!area) return json({ error: "area is required" }, 400);

        const { data: delivery, error: dErr } = await admin
          .from("deliveries")
          .select("*, orders(*, order_items(quantity, product_variations(products(name)), bundle_variations(name, name_he)))")
          .eq("id", delivery_id)
          .single();
        if (dErr || !delivery) return json({ error: dErr?.message || "Delivery not found" }, 404);
        if (delivery.external_id) {
          return json({ success: true, already: true, external_id: delivery.external_id, external_sequence: delivery.external_sequence });
        }

        const order = delivery.orders;
        const items: any[] = order?.order_items || [];
        const itemCount = items.reduce((s, i) => s + (Number(i.quantity) || 0), 0);
        const itemName = (i: any) => i.product_variations?.products?.name || i.bundle_variations?.name_he || i.bundle_variations?.name || "";
        const productNote = items.map((i) => `${itemName(i)} x${i.quantity}`).join(", ").slice(0, 500);
        const fullAddress = address || [order?.shipping_address, order?.shipping_city].filter(Boolean).join(", ");
        const cost = Math.max(0, Number(cod_amount ?? 0));

        const params: Record<string, unknown> = {
          customer_name: order?.customer_name || "",
          customer_mobile: normalizePhone(order?.customer_phone),
          customer_address: fullAddress,
          customer_area: String(area),
          customer_sub_area: sub_area ? String(sub_area) : "",
          reference_id: String(order?.order_number ?? ""),
          cost,
          no_of_items: itemCount || 1,
          product_note: productNote,
        };
        if (notes || delivery.notes) params.note = notes || delivery.notes;

        const reference = String(params.reference_id);
        let externalId: string | null = null;
        let sequence: string | null = null;
        let extStatus: string | null = "waiting";
        let linkedExisting = false;

        try {
          const result = await olivery("create_order", params);
          console.log("olivery create_order result:", JSON.stringify(result));
          const rawId = result?.ID ?? result?.id ?? result?.order_id ?? result?.IDs?.[0] ?? null;
          externalId = rawId != null && rawId !== false ? String(rawId) : null;
          const rawSeq = result?.Sequence ?? result?.sequence ?? result?.Sequences?.[0] ?? null;
          sequence = rawSeq ? String(rawSeq) : null;
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          // The shipment already exists in Olivery (e.g. an earlier attempt succeeded) → link to it.
          if (!/reference id already exists/i.test(msg)) {
            await admin.from("deliveries").update({ external_error: msg }).eq("id", delivery_id);
            return json({ error: msg }, 502);
          }
          linkedExisting = true;
        }

        // Resolve id / sequence / status by reference id (authoritative, works for both paths).
        if (reference && (!externalId || !sequence || linkedExisting)) {
          try {
            const found = await findByReference(reference);
            if (found) {
              externalId = found.id;
              sequence = found.sequence;
              if (found.state) extStatus = found.state;
            }
          } catch (e) {
            console.error("olivery findByReference failed:", e instanceof Error ? e.message : e);
          }
        }
        if (externalId && !sequence) {
          try {
            const st = await olivery("get_order_status", { order_id: externalId });
            if (st?.response?.sequence) sequence = String(st.response.sequence);
            if (st?.response?.status) extStatus = String(st.response.status);
          } catch (_) { /* non-fatal */ }
        }

        if (!externalId) {
          const msg = linkedExisting
            ? `Olivery: הזמנה עם מספר אסמכתא ${reference} כבר קיימת אך לא נמצאה לקישור`
            : "Olivery: המשלוח נוצר אך לא התקבל מספר משלוח";
          await admin.from("deliveries").update({ external_error: msg }).eq("id", delivery_id);
          return json({ error: msg }, 502);
        }

        await admin.from("deliveries").update({
          external_id: externalId,
          external_sequence: sequence,
          external_status: extStatus,
          external_area: String(area),
          external_sub_area: sub_area ? String(sub_area) : null,
          cod_amount: cost,
          external_synced_at: new Date().toISOString(),
          external_error: null,
        }).eq("id", delivery_id);

        return json({ success: true, external_id: externalId, external_sequence: sequence, linked_existing: linkedExisting });
      }

      case "sync": {
        if (!body.delivery_id) return json({ error: "delivery_id is required" }, 400);
        const { data: delivery, error } = await admin.from("deliveries").select("*").eq("id", body.delivery_id).single();
        if (error || !delivery) return json({ error: error?.message || "Delivery not found" }, 404);
        const r = await syncOne(admin, delivery);
        return json({ success: !("error" in r), ...r });
      }

      case "sync_all": {
        const { data: deliveries, error } = await admin
          .from("deliveries")
          .select("*")
          .not("external_id", "is", null)
          .neq("status", "delivered")
          .limit(200);
        if (error) return json({ error: error.message }, 500);
        const open = (deliveries || []).filter((d: any) => !FINAL.has(d.external_status));
        const results = [];
        for (const d of open) results.push(await syncOne(admin, d));
        return json({ success: true, count: results.length, results });
      }

      default:
        return json({ error: `Unknown action: ${action}` }, 400);
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("olivery error:", msg);
    return json({ error: msg }, 500);
  }
});
