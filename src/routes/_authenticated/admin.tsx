import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { ArrowLeft, Plus, Trash2, KeyRound, Loader2 } from "lucide-react";
import {
  listAccounts,
  createAccount,
  updateAccount,
  deleteAccount,
} from "@/lib/accounts.functions";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Manage accounts — Asset Ledger" },
      {
        name: "description",
        content: "Admin area to create staff accounts and change usernames and passwords.",
      },
      { property: "og:title", content: "Manage accounts — Asset Ledger" },
      {
        property: "og:description",
        content: "Admin area to create staff accounts and change usernames and passwords.",
      },
    ],
  }),
  component: AdminPage,
});

type Account = { id: string; username: string; isAdmin: boolean };

function AdminPage() {
  const navigate = useNavigate();
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  const [newUser, setNewUser] = useState("");
  const [newPass, setNewPass] = useState("");
  const [newAdmin, setNewAdmin] = useState(false);
  const [editing, setEditing] = useState<Account | null>(null);
  const [editUser, setEditUser] = useState("");
  const [editPass, setEditPass] = useState("");

  const load = useCallback(async () => {
    try {
      const rows = (await listAccounts()) as Account[];
      setAccounts(rows);
      setAllowed(true);
    } catch {
      setAllowed(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const run = async (fn: () => Promise<unknown>, ok: string) => {
    setBusy(true);
    setMsg("");
    try {
      await fn();
      setMsg(ok);
      await load();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Something went wrong");
    }
    setBusy(false);
  };

  if (allowed === null)
    return (
      <div className="flex h-[100dvh] items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );

  if (!allowed)
    return (
      <div className="mx-auto max-w-[520px] px-6 py-16 text-center">
        <p className="text-[14px] text-muted-foreground">
          This area is for administrators only.
        </p>
        <Link to="/ledger" className="mt-4 inline-block text-[14px] text-accent">
          Back to the ledger
        </Link>
      </div>
    );

  return (
    <div className="mx-auto max-w-[520px] px-[18px] pb-16 pt-4">
      <div className="mb-5 flex items-center gap-2.5">
        <Link to="/ledger" className="text-muted-foreground">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-[16.5px] font-semibold tracking-tight">Manage accounts</h1>
      </div>

      <h2 className="mb-2.5 text-[13px] font-medium text-muted-foreground">Add an account</h2>
      <div className="mb-6 rounded-[13px] border border-border bg-surface p-3.5">
        <input
          value={newUser}
          onChange={(e) => setNewUser(e.target.value)}
          placeholder="username"
          autoCapitalize="none"
          className="mb-2.5 w-full rounded-[10px] border border-border bg-background px-3.5 py-2.5 text-[14.5px] outline-none focus:border-accent"
        />
        <input
          value={newPass}
          onChange={(e) => setNewPass(e.target.value)}
          placeholder="password (min 6 characters)"
          className="mb-2.5 w-full rounded-[10px] border border-border bg-background px-3.5 py-2.5 text-[14.5px] outline-none focus:border-accent"
        />
        <label className="mb-3 flex items-center gap-2 text-[13px] text-muted-foreground">
          <input
            type="checkbox"
            checked={newAdmin}
            onChange={(e) => setNewAdmin(e.target.checked)}
          />
          Make this person an administrator
        </label>
        <button
          disabled={busy}
          onClick={() =>
            run(async () => {
              await createAccount({
                data: { username: newUser, password: newPass, isAdmin: newAdmin },
              });
              setNewUser("");
              setNewPass("");
              setNewAdmin(false);
            }, "Account created")
          }
          className="flex w-full items-center justify-center gap-2 rounded-[11px] border border-accent bg-accent px-4 py-2.5 text-[14px] font-semibold text-accent-foreground disabled:opacity-60"
        >
          <Plus className="h-4 w-4" /> Create account
        </button>
      </div>

      <h2 className="mb-2.5 text-[13px] font-medium text-muted-foreground">Accounts</h2>
      {accounts.map((a) => (
        <div key={a.id} className="mb-2.5 rounded-[13px] border border-border bg-surface p-3.5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="font-mono text-[14.5px]">{a.username}</div>
              <div className="text-[12.5px] text-muted-foreground">
                {a.isAdmin ? "Administrator" : "User"}
              </div>
            </div>
            <div className="flex gap-1.5">
              <button
                onClick={() => {
                  setEditing(editing?.id === a.id ? null : a);
                  setEditUser(a.username);
                  setEditPass("");
                }}
                className="rounded-[9px] border border-border px-2.5 py-2 text-muted-foreground"
              >
                <KeyRound className="h-4 w-4" />
              </button>
              <button
                onClick={() => run(() => deleteAccount({ data: { id: a.id } }), "Account removed")}
                className="rounded-[9px] border border-border px-2.5 py-2 text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>

          {editing?.id === a.id && (
            <div className="mt-3 border-t border-border pt-3">
              <input
                value={editUser}
                onChange={(e) => setEditUser(e.target.value)}
                placeholder="new username"
                autoCapitalize="none"
                className="mb-2.5 w-full rounded-[10px] border border-border bg-background px-3.5 py-2.5 text-[14px] outline-none focus:border-accent"
              />
              <input
                value={editPass}
                onChange={(e) => setEditPass(e.target.value)}
                placeholder="new password (leave blank to keep)"
                className="mb-2.5 w-full rounded-[10px] border border-border bg-background px-3.5 py-2.5 text-[14px] outline-none focus:border-accent"
              />
              <button
                disabled={busy}
                onClick={() =>
                  run(async () => {
                    await updateAccount({
                      data: {
                        id: a.id,
                        username: editUser !== a.username ? editUser : undefined,
                        password: editPass || undefined,
                      },
                    });
                    setEditing(null);
                  }, "Login details updated")
                }
                className="w-full rounded-[11px] border border-border bg-background px-4 py-2.5 text-[14px] font-medium disabled:opacity-60"
              >
                Save login details
              </button>
            </div>
          )}
        </div>
      ))}

      {msg && <p className="mt-3 text-center text-[13px] text-accent">{msg}</p>}

      <button
        onClick={async () => {
          await supabase.auth.signOut();
          navigate({ to: "/", replace: true });
        }}
        className="mt-8 w-full rounded-[11px] px-4 py-3 text-[14px] text-muted-foreground"
      >
        Sign out
      </button>
    </div>
  );
}
