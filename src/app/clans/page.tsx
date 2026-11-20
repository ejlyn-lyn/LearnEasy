import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ClansClient from "./ClansClient";

type Friend = { friendship_id: string; display_name: string; xp: number; status: string; direction: string; created_at: string };
type ClanMember = { user_id: string; display_name: string; xp: number; role: string; joined_at: string };

export default async function ClansPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const [{ data: profile }, { data: friends }, { data: notifications }, { data: ownClan }] = await Promise.all([
    supabase.from("profiles").select("friend_code, xp").eq("id", user.id).maybeSingle(),
    supabase.rpc("get_friend_overview"),
    supabase.from("notifications").select("id, message, created_at, read_at").eq("recipient_id", user.id).order("created_at", { ascending: false }).limit(10),
    supabase.rpc("get_my_clan"),
  ]);
  const friendCode = profile?.friend_code
    ?? user.id.replace(/-/g, "").slice(0, 8).toUpperCase();
  const clan = ownClan?.[0] ?? null;
  let clanMembers: ClanMember[] = [];
  if (clan) {
    const members = await supabase.rpc("get_clan_members", { p_clan_id: clan.id });
    clanMembers = members.data ?? [];
  }
  const { data: topClans } = await supabase
    .from("clans")
    .select("id, name, xp")
    .order("xp", { ascending: false })
    .limit(10);

  return (
    <ClansClient
      friendCode={friendCode}
      xp={profile?.xp ?? 0}
      clan={clan}
      topClans={topClans ?? []}
      friends={(friends ?? []).map((friend: Friend) => ({ ...friend, xp: Number(friend.xp ?? 0) }))}
      clanMembers={clanMembers.map((member) => ({ ...member, xp: Number(member.xp ?? 0) }))}
      notifications={notifications ?? []}
    />
  );
}
