import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ensureProfile } from "@/lib/profiles/ensureProfile";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await ensureProfile(user);

  const body = (await request.json().catch(() => ({}))) as {
    followBots?: boolean;
    skip?: boolean;
  };

  if (body.skip) {
    await supabase.from("profiles").update({ onboarding_done: true }).eq("id", user.id);
    return NextResponse.json({ ok: true });
  }

  if (body.followBots !== false) {
    const { data: bots } = await supabase.from("bots").select("id");
    for (const bot of bots ?? []) {
      await supabase.from("bot_follows").upsert(
        { follower_id: user.id, bot_id: bot.id },
        { onConflict: "follower_id,bot_id", ignoreDuplicates: true }
      );
    }
  }

  await supabase.from("profiles").update({ onboarding_done: true }).eq("id", user.id);
  return NextResponse.json({ ok: true });
}
