"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

function LoginForm() {
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function login(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setMessage(error.message);
      setLoading(false);
      return;
    }

    window.location.assign(searchParams.get("next") ?? "/dashboard");
  }

  return (
    <main className="min-h-screen bg-[#090b12] px-5 py-10 text-white">
      <div className="mx-auto mt-10 max-w-md rounded-2xl border border-[#222a3d] bg-[#111520] p-8">
        <div className="brand-mark mb-6">L</div>
        <h1 className="text-3xl font-bold">Bei LearnAI anmelden</h1>
        <p className="mt-2 text-sm text-zinc-400">Melde dich mit deiner eingeladenen E-Mail-Adresse an.</p>
        <form onSubmit={login} className="mt-8 space-y-5">
          <label className="block text-sm text-zinc-300">E-Mail-Adresse<input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} className="mt-2 w-full rounded-lg border border-[#30384d] bg-[#171b28] px-4 py-3 outline-none focus:border-violet-500" /></label>
          <label className="block text-sm text-zinc-300">Passwort<input required type="password" value={password} onChange={(event) => setPassword(event.target.value)} className="mt-2 w-full rounded-lg border border-[#30384d] bg-[#171b28] px-4 py-3 outline-none focus:border-violet-500" /></label>
          {message && <p role="alert" className="rounded-lg border border-red-900 bg-red-950/40 px-4 py-3 text-sm text-red-200">{message}</p>}
          <button disabled={loading} className="w-full rounded-lg bg-violet-600 px-4 py-3 font-bold disabled:opacity-60" type="submit">{loading ? "Wird angemeldet…" : "Anmelden"}</button>
        </form>
        <div className="mt-6 flex justify-between text-sm text-violet-300"><a href="/registrieren">Registrieren</a><a href="/passwort-vergessen">Passwort vergessen?</a></div>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-[#090b12] px-5 py-10 text-white"><div className="mx-auto mt-16 max-w-md text-center text-zinc-400">Anmeldung wird geladen…</div></main>}>
      <LoginForm />
    </Suspense>
  );
}
