import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import SettingsClient from "./SettingsClient";

export default async function SettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, friend_code, theme, accent, xp")
    .eq("id", user.id)
    .maybeSingle();
  return (
    <SettingsClient
      email={user.email ?? ""}
      displayName={profile?.display_name ?? user.email?.split("@")[0] ?? "Lernende"}
      friendCode={profile?.friend_code ?? user.id.replace(/-/g, "").slice(0, 8).toUpperCase()}
      theme={profile?.theme ?? "dark"}
      accent={profile?.accent ?? "violet"}
      xp={profile?.xp ?? 0}
    />
  );
}
