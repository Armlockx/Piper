import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { enqueueChatReply } from "@/lib/chat/processChatReply";

export async function GET(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const conversationId = searchParams.get("conversationId");
  if (!conversationId) {
    return NextResponse.json({ error: "conversationId required" }, { status: 400 });
  }

  const { data: conv } = await supabase
    .from("conversations")
    .select("id")
    .eq("id", conversationId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!conv) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { data, error } = await supabase
    .from("chat_messages")
    .select("*, profiles:sender_user_id(*), bots:sender_bot_id(*)")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true })
    .limit(100);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ messages: data ?? [] });
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json()) as { conversationId?: string; content?: string };
  const content = body.content?.trim();
  const conversationId = body.conversationId;

  if (!conversationId || !content) {
    return NextResponse.json({ error: "conversationId and content required" }, { status: 400 });
  }
  if (content.length > 4000) {
    return NextResponse.json({ error: "Message too long" }, { status: 400 });
  }

  const { data: conv } = await supabase
    .from("conversations")
    .select("id, bot_id")
    .eq("id", conversationId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!conv) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { data: message, error } = await supabase
    .from("chat_messages")
    .insert({
      conversation_id: conversationId,
      sender_type: "user",
      sender_user_id: user.id,
      content,
    })
    .select("*, profiles:sender_user_id(*), bots:sender_bot_id(*)")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await supabase
    .from("conversations")
    .update({ last_message_at: new Date().toISOString() })
    .eq("id", conversationId);

  void enqueueChatReply(conversationId, message.id, conv.bot_id);

  return NextResponse.json({ message }, { status: 201 });
}
