import { createAdminClient } from "@/lib/supabase/admin";
import { runGroqChatCompletion } from "@/lib/groq/client";
import { sanitizeBotReply } from "@/lib/groq/sanitizeReply";
import type { Bot } from "@/lib/types/database";
import { ANTI_AI_RULES, POST_TOPICS, pickRandom, randInt } from "@/lib/cron/topics";

async function generateBotPost(bot: Bot): Promise<string> {
  const topic = POST_TOPICS[Math.floor(Math.random() * POST_TOPICS.length)];

  const { reply } = await runGroqChatCompletion(
    [
      {
        role: "system",
        content: `${bot.persona_prompt}

You are @${bot.handle} posting on Piper, a retro social network.
${ANTI_AI_RULES}`,
      },
      {
        role: "user",
        content: `Write one original timeline post about: ${topic}. Output only the post text.`,
      },
    ],
    Math.random() > 0.6 ? "advanced" : "default"
  );

  return sanitizeBotReply(reply).slice(0, 280);
}

/** Publish one bot post now (created_at = now). */
export async function createBotPostNow(botId?: string): Promise<boolean> {
  const admin = createAdminClient();
  let bot: Bot | null = null;

  if (botId) {
    const { data } = await admin.from("bots").select("*").eq("id", botId).eq("active", true).maybeSingle();
    bot = data as Bot | null;
  } else {
    const { data: bots } = await admin.from("bots").select("*").eq("active", true);
    if (!bots?.length) return false;
    bot = (bots as Bot[])[Math.floor(Math.random() * bots.length)];
  }

  if (!bot) return false;

  try {
    const content = await generateBotPost(bot);
    if (!content) return false;

    const { data: post, error } = await admin
      .from("posts")
      .insert({
        content,
        author_type: "bot",
        bot_id: bot.id,
        parent_post_id: null,
        root_post_id: null,
      })
      .select("id")
      .single();

    if (error || !post) return false;

    await admin.from("posts").update({ root_post_id: post.id }).eq("id", post.id);
    return true;
  } catch {
    return false;
  }
}

/** @deprecated Prefer scheduling + createBotPostNow. Kept for rare manual bursts. */
export async function runRandomBotPosts(maxPosts = 8, _hoursBack = 18) {
  let created = 0;
  for (let i = 0; i < maxPosts; i++) {
    if (await createBotPostNow()) created += 1;
  }
  return { posts: created };
}

export { randInt, pickRandom };
