import { createAdminClient } from "@/lib/supabase/admin";
import { runGroqChatCompletion } from "@/lib/groq/client";
import { sanitizeBotReply } from "@/lib/groq/sanitizeReply";
import type { Bot } from "@/lib/types/database";
import { ANTI_AI_RULES, POST_TOPICS, pickRandom, randomPastIso, randInt } from "@/lib/cron/topics";

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

export async function runRandomBotPosts(maxPosts = 8, hoursBack = 18) {
  const admin = createAdminClient();
  const { data: bots } = await admin.from("bots").select("*");
  if (!bots?.length) return { posts: 0 };

  // Allow same bot more than once if we need volume
  const pool = bots as Bot[];
  const chosen: Bot[] = [];
  for (let i = 0; i < maxPosts; i++) {
    chosen.push(pool[Math.floor(Math.random() * pool.length)]);
  }

  let created = 0;

  for (const bot of chosen) {
    try {
      const content = await generateBotPost(bot);
      if (!content) continue;

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

      if (error || !post) continue;

      const stamped = randomPastIso(hoursBack);
      await admin
        .from("posts")
        .update({ root_post_id: post.id, created_at: stamped })
        .eq("id", post.id);

      created += 1;
    } catch {
      // skip
    }
  }

  return { posts: created };
}

export { randInt, pickRandom };
