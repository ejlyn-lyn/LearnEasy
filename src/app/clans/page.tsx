import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ClansClient from "./ClansClient";

export default async function ClansPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const [{ data: profile }, membership] = await Promise.all([
    supabase.from("profiles").select("friend_code, xp").eq("id", user.id).maybeSingle(),
    supabase.from("clan_memberships").select("clan_id, role").eq("user_id", user.id).maybeSingle(),
  ]);
  const friendCode = profile?.friend_code
    ?? user.id.replace(/-/g, "").slice(0, 8).toUpperCase();
  let clan = null;
  if (membership.data?.clan_id) {
    const result = await supabase
      .from("clans")
      .select("id, name, join_code, xp")
      .eq("id", membership.data.clan_id)
      .maybeSingle();
    clan = result.data;
  }
  const { data: topClans } = await supabase
    .from("clans")
    .select("id, name, xp")
    .order("xp", { ascending: false })
    .limit(10);

  return <ClansClient friendCode={friendCode} xp={profile?.xp ?? 0} clan={clan} topClans={topClans ?? []} />;
}
