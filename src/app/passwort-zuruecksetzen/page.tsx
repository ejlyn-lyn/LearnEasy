"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function updatePassword(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);

    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      setMessage(error.message);
    } else {
      setMessage("Dein Passwort wurde erfolgreich geändert.");
    }
    setLoading(false);
  }

  return (
    <main className="min-h-screen bg-[#090b12] px-5 py-10 text-white">
      <div className="mx-auto mt-16 max-w-md rounded-2xl border border-[#222a3d] bg-[#111520] p-8">
        <h1 className="text-3xl font-bold">Neues Passwort wählen</h1>
        <form onSubmit={updatePassword} className="mt-8 space-y-5">
          <label className="block text-sm text-zinc-300">Neues Passwort (mindestens 8 Zeichen)<input required minLength={8} type="password" value={password} onChange={(event) => setPassword(event.target.value)} className="mt-2 w-full rounded-lg border border-[#30384d] bg-[#171b28] px-4 py-3 outline-none focus:border-violet-500" /></label>
          {message && <p role="status" className="rounded-lg border border-violet-900 bg-violet-950/40 px-4 py-3 text-sm">{message}</p>}
          <button disabled={loading} className="w-full rounded-lg bg-violet-600 px-4 py-3 font-bold disabled:opacity-60" type="submit">{loading ? "Wird gespeichert…" : "Passwort ändern"}</button>
        </form>
      </div>
    </main>
  );
}
