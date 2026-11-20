"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function register(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    const normalizedEmail = email.trim();
    const name = normalizedEmail.split("@")[0] || "Lernende";

    const supabase = createClient();
    const { data, error } = await supabase.auth.signUp({
      email: normalizedEmail,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?next=/dashboard`,
        data: { name },
      },
    });

    if (error) {
      setMessage(error.message);
    } else if (data.session) {
      window.location.assign("/dashboard");
      return;
    } else {
      setMessage("Prüfe dein E-Mail-Postfach und bestätige dein Konto. Danach kannst du dich anmelden.");
    }
    setLoading(false);
  }

  return (
    <main className="min-h-screen bg-[#090b12] px-5 py-10 text-white">
      <div className="mx-auto mt-10 max-w-md rounded-2xl border border-[#222a3d] bg-[#111520] p-8">
        <h1 className="text-3xl font-bold">Konto erstellen</h1>
        <p className="mt-2 text-sm text-zinc-400">In V1 ist die Registrierung später zusätzlich auf gültige Einladungen beschränkt.</p>
        <form onSubmit={register} className="mt-8 space-y-5">
          <label className="block text-sm text-zinc-300">E-Mail-Adresse<input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} className="mt-2 w-full rounded-lg border border-[#30384d] bg-[#171b28] px-4 py-3 outline-none focus:border-violet-500" /></label>
          <label className="block text-sm text-zinc-300">Passwort (mindestens 8 Zeichen)<input required minLength={8} type="password" value={password} onChange={(event) => setPassword(event.target.value)} className="mt-2 w-full rounded-lg border border-[#30384d] bg-[#171b28] px-4 py-3 outline-none focus:border-violet-500" /></label>
          {message && <p role="status" className="rounded-lg border border-violet-900 bg-violet-950/40 px-4 py-3 text-sm">{message}</p>}
          <button disabled={loading} className="w-full rounded-lg bg-violet-600 px-4 py-3 font-bold disabled:opacity-60" type="submit">{loading ? "Konto wird erstellt…" : "Registrieren"}</button>
        </form>
        <a className="mt-6 block text-sm text-violet-300" href="/login">Zurück zur Anmeldung</a>
      </div>
    </main>
  );
}
