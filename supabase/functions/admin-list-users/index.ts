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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Missing authorization" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) return json({ error: "Unauthorized" }, 401);

    const admin = createClient(supabaseUrl, serviceKey);
    const [{ data: isAdmin }, { data: isOwner }] = await Promise.all([
      admin.rpc("has_role", { _user_id: userData.user.id, _role: "admin" }),
      admin.rpc("has_role", { _user_id: userData.user.id, _role: "owner" }),
    ]);
    if (!isAdmin && !isOwner) return json({ error: "Forbidden" }, 403);

    const [{ data: profiles, error: pErr }, { data: roles, error: rErr }] = await Promise.all([
      admin
        .from("profiles")
        .select("user_id, display_name, phone, created_at")
        .order("created_at", { ascending: false }),
      admin.from("user_roles").select("user_id, role"),
    ]);
    if (pErr) return json({ error: pErr.message }, 500);
    if (rErr) return json({ error: rErr.message }, 500);

    return json({ success: true, profiles: profiles ?? [], roles: roles ?? [] });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    console.error("admin-list-users error:", msg);
    return json({ error: msg }, 500);
  }
});