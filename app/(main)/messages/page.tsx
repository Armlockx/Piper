import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Avatar } from "@/components/ui/avatar";
import { MessageBotButton } from "@/components/chat/MessageBotButton";
import { formatRelativeTime } from "@/lib/utils";
import type { Bot, Conversation } from "@/lib/types/database";

export default async function MessagesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: conversations } = await supabase
    .from("conversations")
    .select("*, bots(*)")
    .eq("user_id", user.id)
    .order("last_message_at", { ascending: false, nullsFirst: false });

  const { data: bots } = await supabase
    .from("bots")
    .select("*")
    .eq("active", true)
    .order("created_at", { ascending: true })
    .limit(24);

  const openIds = new Set(
    ((conversations ?? []) as (Conversation & { bots: Bot | null })[]).map((c) => c.bot_id)
  );

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <h1 className="mb-6 font-pixel text-xs text-neon-cyan tracking-widest">CHAT</h1>

      <section className="mb-8">
        <h2 className="mb-3 font-mono text-xs text-white/40 uppercase tracking-wider">
          Your conversations
        </h2>
        <div className="flex flex-col gap-2">
          {(conversations ?? []).length === 0 && (
            <p className="border-2 border-dashed border-white/15 p-8 text-center font-mono text-sm text-white/40">
              No chats yet. Message a bot below — they keep the vibe.
            </p>
          )}
          {((conversations ?? []) as (Conversation & { bots: Bot | null })[]).map((c) => {
            const bot = c.bots;
            if (!bot) return null;
            return (
              <Link
                key={c.id}
                href={`/messages/${c.id}`}
                className="flex items-center gap-3 border-2 border-white/10 bg-black/30 p-3 transition-colors hover:border-neon-cyan/40"
              >
                <Avatar src={bot.avatar_url} alt={bot.name} accent={bot.accent_color} />
                <div className="min-w-0 flex-1">
                  <p className="font-mono text-sm font-bold">{bot.name}</p>
                  <p className="font-mono text-xs text-white/40">@{bot.handle}</p>
                </div>
                {c.last_message_at && (
                  <span className="font-mono text-[10px] text-white/30">
                    {formatRelativeTime(c.last_message_at)}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      </section>

      <section>
        <h2 className="mb-3 font-mono text-xs text-white/40 uppercase tracking-wider">
          Start a chat
        </h2>
        <div className="grid gap-2 sm:grid-cols-2">
          {((bots ?? []) as Bot[])
            .filter((b) => !openIds.has(b.id))
            .map((bot) => (
              <div
                key={bot.id}
                className="flex items-center gap-3 border-2 border-white/10 bg-black/20 p-3"
              >
                <Avatar src={bot.avatar_url} alt={bot.name} accent={bot.accent_color} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-mono text-sm">{bot.name}</p>
                  <p className="font-mono text-[10px] text-white/40">@{bot.handle}</p>
                </div>
                <MessageBotButton botHandle={bot.handle} />
              </div>
            ))}
        </div>
      </section>
    </div>
  );
}
