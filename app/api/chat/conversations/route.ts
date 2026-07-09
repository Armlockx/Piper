import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("conversations")
    .select("*, bots(*)")
    .eq("user_id", user.id)
    .order("last_message_at", { ascending: false, nullsFirst: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ conversations: data ?? [] });
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json()) as { botId?: string; botHandle?: string };
  const admin = createAdminClient();

  let botId = body.botId;
  if (!botId && body.botHandle) {
    const { data: bot } = await admin
      .from("bots")
      .select("id")
      .eq("handle", body.botHandle.toLowerCase())
      .eq("active", true)
      .maybeSingle();
    botId = bot?.id;
  }

  if (!botId) {
    return NextResponse.json({ error: "botId or botHandle required" }, { status: 400 });
  }

  const { data: bot } = await admin
    .from("bots")
    .select("*")
    .eq("id", botId)
    .eq("active", true)
    .maybeSingle();

  if (!bot) return NextResponse.json({ error: "Bot not found" }, { status: 404 });

  const { data: existing } = await supabase
    .from("conversations")
    .select("*, bots(*)")
    .eq("user_id", user.id)
    .eq("bot_id", botId)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ conversation: existing });
  }

  const { data: created, error } = await supabase
    .from("conversations")
    .insert({ user_id: user.id, bot_id: botId })
    .select("*, bots(*)")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await admin.from("bot_conversation_state").upsert({
    conversation_id: created.id,
    mood: "curious",
    mood_intensity: 5,
    summary: null,
  });

  return NextResponse.json({ conversation: created }, { status: 201 });
}
