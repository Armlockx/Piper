import Link from "next/link";
import { notFound } from "next/navigation";
import { Avatar } from "@/components/ui/avatar";
import { createClient } from "@/lib/supabase/server";
import { resolveFollowTarget } from "@/lib/follows/queries";

export default async function FollowersPage({
  params,
}: {
  params: Promise<{ handle: string }>;
}) {
  const { handle } = await params;
  const supabase = await createClient();
  const target = await resolveFollowTarget(supabase, handle);
  if (!target) notFound();

  type Row = {
    id: string;
    handle: string;
    display_name: string;
    avatar_url: string | null;
  };

  let rows: Row[] = [];

  if (target.type === "user") {
    const { data } = await supabase
      .from("follows")
      .select("follower:profiles!follows_follower_id_fkey(id, handle, display_name, avatar_url)")
      .eq("following_id", target.id)
      .limit(100);
    rows = (data ?? [])
      .map((r) => r.follower as unknown as Row | null)
      .filter((r): r is Row => !!r);
  } else {
    const { data } = await supabase
      .from("bot_follows")
      .select("follower:profiles!bot_follows_follower_id_fkey(id, handle, display_name, avatar_url)")
      .eq("bot_id", target.id)
      .limit(100);
    rows = (data ?? [])
      .map((r) => r.follower as unknown as Row | null)
      .filter((r): r is Row => !!r);
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <Link href={`/profile/${handle}`} className="font-mono text-xs text-neon-cyan hover:underline">
        ← @{handle}
      </Link>
      <h1 className="mt-4 mb-6 font-pixel text-xs text-neon-cyan tracking-widest">FOLLOWERS</h1>
      {rows.length === 0 ? (
        <p className="font-mono text-sm text-white/40">No followers yet.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {rows.map((u) => (
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
