import Link from "next/link";
import { notFound } from "next/navigation";
import { Avatar } from "@/components/ui/avatar";
import { BotBadge } from "@/components/bots/BotBadge";
import { createClient } from "@/lib/supabase/server";
import { resolveFollowTarget } from "@/lib/follows/queries";

export default async function FollowingPage({
  params,
}: {
  params: Promise<{ handle: string }>;
}) {
  const { handle } = await params;
  const supabase = await createClient();
  const target = await resolveFollowTarget(supabase, handle);
  if (!target || target.type !== "user") notFound();

  type UserRow = {
    id: string;
    handle: string;
    display_name: string;
    avatar_url: string | null;
  };
  type BotRow = {
    id: string;
    handle: string;
    name: string;
    avatar_url: string;
    accent_color: string;
  };

  const [{ data: userFollows }, { data: botFollows }] = await Promise.all([
    supabase
      .from("follows")
      .select("following:profiles!follows_following_id_fkey(id, handle, display_name, avatar_url)")
      .eq("follower_id", target.id)
      .limit(100),
    supabase
      .from("bot_follows")
      .select("bot:bots(id, handle, name, avatar_url, accent_color)")
      .eq("follower_id", target.id)
      .limit(50),
  ]);

  const users = (userFollows ?? [])
    .map((r) => r.following as unknown as UserRow | null)
    .filter((r): r is UserRow => !!r);
  const bots = (botFollows ?? [])
    .map((r) => r.bot as unknown as BotRow | null)
    .filter((r): r is BotRow => !!r);

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <Link href={`/profile/${handle}`} className="font-mono text-xs text-neon-cyan hover:underline">
        ← @{handle}
      </Link>
      <h1 className="mt-4 mb-6 font-pixel text-xs text-neon-magenta tracking-widest">FOLLOWING</h1>
      {users.length === 0 && bots.length === 0 ? (
        <p className="font-mono text-sm text-white/40">Not following anyone yet.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {bots.map((b) => (
            <li key={b.id}>
              <Link
                href={`/profile/${b.handle}`}
                className="flex items-center gap-3 border-2 border-white/10 bg-black/30 p-3 hover:border-neon-cyan/30"
              >
                <Avatar src={b.avatar_url} alt={b.name} size="sm" accent={b.accent_color} />
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-mono text-sm font-bold">{b.name}</p>
                  <BotBadge handle={b.handle} color={b.accent_color} />
                </div>
              </Link>
            </li>
          ))}
          {users.map((u) => (
            <li key={u.id}>
              <Link
                href={`/profile/${u.handle}`}
                className="flex items-center gap-3 border-2 border-white/10 bg-black/30 p-3 hover:border-neon-cyan/30"
              >
                <Avatar src={u.avatar_url} alt={u.display_name} size="sm" />
                <div>
                  <p className="font-mono text-sm font-bold">{u.display_name}</p>
                  <p className="font-mono text-xs text-white/40">@{u.handle}</p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
