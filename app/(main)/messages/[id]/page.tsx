import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ChatWindow } from "@/components/chat/ChatWindow";
import { OpenDockButton } from "@/components/chat/OpenDockOnMount";
import type { Bot, BotConversationState, ChatMessage, Conversation } from "@/lib/types/database";

export default async function ConversationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: conversation } = await supabase
    .from("conversations")
    .select("*, bots(*)")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!conversation) notFound();

  const conv = conversation as Conversation & { bots: Bot };
  const bot = conv.bots;
  if (!bot) notFound();

  const { data: messages } = await supabase
    .from("chat_messages")
    .select("*, profiles:sender_user_id(*), bots:sender_bot_id(*)")
    .eq("conversation_id", id)
    .order("created_at", { ascending: true })
    .limit(100);

  const { data: state } = await supabase
    .from("bot_conversation_state")
    .select("*")
    .eq("conversation_id", id)
    .maybeSingle();

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <div className="mb-4 flex items-center justify-between">
        <Link href="/messages" className="font-mono text-xs text-white/40 hover:text-neon-cyan">
          ← All chats
        </Link>
        <OpenDockButton conversationId={id} />
      </div>
      <ChatWindow
        conversationId={id}
        bot={bot}
        initialMessages={(messages ?? []) as ChatMessage[]}
        moodState={(state as BotConversationState | null) ?? null}
      />
    </div>
  );
}
