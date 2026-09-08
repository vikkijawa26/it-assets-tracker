import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const DOMAIN = "app.local";

export const normalizeUsername = (u: string) => u.trim().toLowerCase();
export const usernameToEmail = (u: string) => `${normalizeUsername(u)}@${DOMAIN}`;

const validUsername = (u: string) => /^[a-z0-9._-]{3,32}$/.test(normalizeUsername(u));

/** Creates the built-in admin account once, if no admin exists yet. */
export const ensureAdmin = createServerFn({ method: "POST" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const { data: existing } = await supabaseAdmin
    .from("user_roles")
    .select("id")
    .eq("role", "admin")
    .limit(1);
  if (existing && existing.length > 0) return { created: false };

  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email: usernameToEmail("ITadmin"),
    password: "ITadmin",
    email_confirm: true,
  });
  if (error || !data.user) return { created: false };

  await supabaseAdmin.from("profiles").insert({ id: data.user.id, username: "itadmin" });
  await supabaseAdmin.from("user_roles").insert({ user_id: data.user.id, role: "admin" });
  return { created: true };
});

async function assertAdmin(context: { supabase: any; userId: string }) {
  const { data, error } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  if (error || !data) throw new Error("Forbidden");
}

export const listAccounts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context as any);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: profiles } = await supabaseAdmin
      .from("profiles")
      .select("id, username, created_at")
      .order("created_at", { ascending: true });
    const { data: roles } = await supabaseAdmin.from("user_roles").select("user_id, role");
    const adminIds = new Set((roles ?? []).filter((r) => r.role === "admin").map((r) => r.user_id));
    return (profiles ?? []).map((p) => ({ ...p, isAdmin: adminIds.has(p.id) }));
  });

export const createAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { username: string; password: string; isAdmin?: boolean }) => d)
  .handler(async ({ data, context }) => {
    await assertAdmin(context as any);
    if (!validUsername(data.username))
      throw new Error("Username must be 3-32 characters (letters, numbers, . _ -)");
    if (data.password.length < 6) throw new Error("Password must be at least 6 characters");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const username = normalizeUsername(data.username);
    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email: usernameToEmail(username),
      password: data.password,
      email_confirm: true,
    });
    if (error || !created.user) throw new Error(error?.message ?? "Could not create the account");

    await supabaseAdmin.from("profiles").insert({ id: created.user.id, username });
    await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: created.user.id, role: data.isAdmin ? "admin" : "user" });
    return { ok: true };
  });

export const updateAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string; username?: string; password?: string }) => d)
  .handler(async ({ data, context }) => {
    await assertAdmin(context as any);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const payload: { email?: string; password?: string } = {};
    if (data.username) {
      if (!validUsername(data.username)) throw new Error("Invalid username");
      payload.email = usernameToEmail(data.username);
    }
    if (data.password) {
      if (data.password.length < 6) throw new Error("Password must be at least 6 characters");
      payload.password = data.password;
    }
    if (Object.keys(payload).length === 0) return { ok: true };

    const { error } = await supabaseAdmin.auth.admin.updateUserById(data.id, payload);
    if (error) throw new Error(error.message);

    if (data.username) {
      const { error: pErr } = await supabaseAdmin
        .from("profiles")
        .update({ username: normalizeUsername(data.username) })
        .eq("id", data.id);
      if (pErr) throw new Error(pErr.message);
    }
    return { ok: true };
  });

export const deleteAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data, context }) => {
    await assertAdmin(context as any);
    if (data.id === context.userId) throw new Error("You cannot delete your own account");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("assets").delete().eq("user_id", data.id);
    await supabaseAdmin.from("user_roles").delete().eq("user_id", data.id);
    await supabaseAdmin.from("profiles").delete().eq("id", data.id);
    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
