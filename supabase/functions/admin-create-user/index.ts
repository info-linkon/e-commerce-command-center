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
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

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
    const [{ data: isAdmin, error: adminErr }, { data: isOwner, error: ownerErr }] = await Promise.all([
      admin.rpc("has_role", { _user_id: userData.user.id, _role: "admin" }),
      admin.rpc("has_role", { _user_id: userData.user.id, _role: "owner" }),
    ]);
    if (adminErr || ownerErr) return json({ error: (adminErr || ownerErr)!.message }, 500);
    if (!isAdmin && !isOwner) return json({ error: "Forbidden: admin or owner role required" }, 403);

    const body = await req.json();
    const username = String(body?.username ?? "").trim().toLowerCase();
    const password = String(body?.password ?? "");
    const displayName = body?.display_name ? String(body.display_name) : username;
    const phone = body?.phone ? String(body.phone) : null;
    const role = body?.role === "admin" ? "admin" : "user";

    if (!username || !password) {
      return json({ error: "username and password are required" }, 400);
    }
    if (!/^[a-z0-9_.-]{2,32}$/.test(username)) {
      return json({ error: "Invalid username format" }, 400);
    }
    if (password.length < 8) {
      return json({ error: "Password must be at least 8 characters" }, 400);
    }

    const email = `${username}@elwejha.app`;

    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { display_name: displayName },
    });
    if (createErr || !created?.user) {
      return json({ error: createErr?.message || "Failed to create user" }, 400);
    }

    const newUserId = created.user.id;

    if (phone) {
      await admin.from("profiles").update({ phone }).eq("user_id", newUserId);
    }

    // The handle_new_user trigger already assigned the default 'user' role.
    // If admin was requested, add it as a second role entry.
    if (role === "admin") {
      await admin
        .from("user_roles")
        .insert({ user_id: newUserId, role: "admin" })
        .select()
        .maybeSingle();
    }

    return json({
      success: true,
      user: { id: newUserId, email: created.user.email, username, role },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    console.error("admin-create-user error:", msg);
    return json({ error: msg }, 500);
  }
});
