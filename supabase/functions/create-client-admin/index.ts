import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const ANON = Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ?? Deno.env.get("SUPABASE_ANON_KEY")!;
    const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authHeader = req.headers.get("Authorization") ?? "";
    const userClient = createClient(SUPABASE_URL, ANON, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) {
      return new Response(JSON.stringify({ error: "Não autenticado" }), { status: 401, headers: { ...cors, "Content-Type": "application/json" } });
    }

    const admin = createClient(SUPABASE_URL, SERVICE);
    const { data: isMaster, error: roleErr } = await admin.rpc("is_master_admin", { _user_id: userData.user.id });
    if (roleErr || !isMaster) {
      return new Response(JSON.stringify({ error: "Apenas master admin" }), { status: 403, headers: { ...cors, "Content-Type": "application/json" } });
    }

    const body = await req.json();
    const { email, password, full_name, client_id, role = "client_admin" } = body ?? {};
    if (!email || !password || !client_id) {
      return new Response(JSON.stringify({ error: "email, password e client_id são obrigatórios" }), { status: 400, headers: { ...cors, "Content-Type": "application/json" } });
    }

    let userId: string | null = null;
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: full_name ?? "", client_id },
    });

    if (createErr) {
      const msg = createErr.message?.toLowerCase() ?? "";
      const alreadyExists = msg.includes("already") || msg.includes("registered") || (createErr as any).code === "email_exists";
      if (!alreadyExists) {
        return new Response(JSON.stringify({ error: createErr.message }), { status: 400, headers: { ...cors, "Content-Type": "application/json" } });
      }
      // Find existing user by email
      const { data: list, error: listErr } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
      if (listErr) {
        return new Response(JSON.stringify({ error: listErr.message }), { status: 400, headers: { ...cors, "Content-Type": "application/json" } });
      }
      const existing = list.users.find((u) => u.email?.toLowerCase() === String(email).toLowerCase());
      if (!existing) {
        return new Response(JSON.stringify({ error: "Usuário já existe mas não foi possível localizá-lo" }), { status: 400, headers: { ...cors, "Content-Type": "application/json" } });
      }
      userId = existing.id;
    } else {
      userId = created!.user!.id;
    }

    // Garantir profile (caso trigger falhe)
    await admin.from("profiles").upsert({
      id: created.user.id,
      email,
      full_name: full_name ?? "",
      client_id,
    }, { onConflict: "id" });

    const { error: roleInsertErr } = await admin.from("user_roles").insert({
      user_id: created.user.id,
      role,
      client_id,
    });
    if (roleInsertErr) {
      return new Response(JSON.stringify({ error: roleInsertErr.message }), { status: 400, headers: { ...cors, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ user_id: created.user.id }), {
      status: 200,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});
