import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Boxes, LogIn, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { ensureAdmin, usernameToEmail } from "@/lib/accounts.functions";

export const Route = createFileRoute("/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Sign in — Asset Ledger" },
      {
        name: "description",
        content: "Sign in to scan, record and export your equipment inventory in Asset Ledger.",
      },
      { property: "og:title", content: "Sign in — Asset Ledger" },
      {
        property: "og:description",
        content: "Sign in to scan, record and export your equipment inventory in Asset Ledger.",
      },
    ],
  }),
  component: SignInPage,
});

function SignInPage() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    ensureAdmin().catch(() => {});
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/ledger", replace: true });
    });
  }, [navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    const { error: err } = await supabase.auth.signInWithPassword({
      email: usernameToEmail(username),
      password,
    });
    setBusy(false);
    if (err) {
      setError("Wrong username or password.");
      return;
    }
    navigate({ to: "/ledger", replace: true });
  };

  return (
    <div className="mx-auto flex min-h-[100dvh] max-w-[520px] flex-col justify-center px-6">
      <div className="mb-7 flex items-center gap-2.5">
        <div className="accent-dim flex h-[34px] w-[34px] items-center justify-center rounded-[8px] text-accent">
          <Boxes className="h-[18px] w-[18px]" />
        </div>
        <h1 className="text-[19px] font-semibold tracking-tight">Asset Ledger</h1>
      </div>

      <h2 className="text-[15px] font-medium">Sign in</h2>
      <p className="mb-5 mt-1 text-[13px] text-muted-foreground">
        Use the username and password given to you by your administrator.
      </p>

      <form onSubmit={submit}>
        <label className="mb-1.5 block text-[12.5px] text-muted-foreground">Username</label>
        <input
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          autoCapitalize="none"
          autoCorrect="off"
          className="mb-3.5 w-full rounded-[10px] border border-border bg-surface px-3.5 py-2.5 text-[14.5px] outline-none focus:border-accent"
        />
        <label className="mb-1.5 block text-[12.5px] text-muted-foreground">Password</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mb-4 w-full rounded-[10px] border border-border bg-surface px-3.5 py-2.5 text-[14.5px] outline-none focus:border-accent"
        />
        {error && <p className="mb-3 text-[13px] text-destructive">{error}</p>}
        <button
          type="submit"
          disabled={busy}
          className="flex w-full items-center justify-center gap-2 rounded-[11px] border border-accent bg-accent px-4 py-3 text-[14.5px] font-semibold text-accent-foreground disabled:opacity-60"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />}
          Sign in
        </button>
      </form>
    </div>
  );
}
