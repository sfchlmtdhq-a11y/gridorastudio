import { type FormEvent, type ReactNode, useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { Logo } from "./Logo";

export function AuthGate({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"signIn" | "signUp">("signIn");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!supabase) {
      setSession(null);
      return;
    }
    let active = true;
    void supabase.auth.getSession().then(({ data }) => {
      if (active) setSession(data.session);
    });
    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (active) setSession(nextSession);
    });
    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, []);

  if (session === undefined) return <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">Loading Gridora Studio…</div>;
  const client = supabase;
  if (!client) return <div className="flex min-h-screen items-center justify-center p-6 text-center">Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY to connect Gridora Studio.</div>;
  if (session) return <>{children}</>;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    const result = mode === "signIn"
      ? await client.auth.signInWithPassword({ email, password })
      : await client.auth.signUp({ email, password });
    setBusy(false);
    if (result.error) setMessage(result.error.message);
    else setMessage(mode === "signUp" ? "Account created. Check your email if confirmation is enabled." : "");
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <form onSubmit={submit} className="w-full max-w-md rounded-3xl border border-border bg-card p-7 shadow-xl">
        <Logo />
        <h1 className="mt-8 font-display text-3xl font-bold">{mode === "signIn" ? "Sign in to Gridora Studio" : "Create your Gridora account"}</h1>
        <p className="mt-2 text-sm text-muted-foreground">Your designs are securely stored in your Supabase account.</p>
        <label className="mt-7 block text-sm font-medium">Email<input required type="email" className="field mt-1" value={email} onChange={(e) => setEmail(e.target.value)} /></label>
        <label className="mt-4 block text-sm font-medium">Password<input required minLength={6} type="password" className="field mt-1" value={password} onChange={(e) => setPassword(e.target.value)} /></label>
        {message && <p className="mt-4 text-sm text-muted-foreground">{message}</p>}
        <button disabled={busy} className="mt-6 w-full rounded-xl bg-primary py-3 font-semibold text-primary-foreground disabled:opacity-60">{busy ? "Please wait…" : mode === "signIn" ? "Sign in" : "Create account"}</button>
        <button type="button" className="mt-4 w-full text-sm text-muted-foreground underline" onClick={() => { setMode(mode === "signIn" ? "signUp" : "signIn"); setMessage(""); }}>{mode === "signIn" ? "Need an account? Create one" : "Already have an account? Sign in"}</button>
      </form>
    </main>
  );
}
