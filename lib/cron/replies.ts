import { createAdminClient } from "@/lib/supabase/admin";
import { buildBotPrompt } from "@/lib/groq/buildBotPrompt";
import { runGroqChatCompletion } from "@/lib/groq/client";
import { sanitizeBotReply } from "@/lib/groq/sanitizeReply";
import type { Bot, PostWithAuthor } from "@/lib/types/database";
import { pickRandom, randomPastIso } from "@/lib/cron/topics";

async function replyAsBot(bot: Bot, target: PostWithAuthor, hoursBack: number) {
  const admin = createAdminClient();
  const rootId = target.root_post_id ?? target.id;

  const { data: threadPosts } = await admin
    .from("posts")
    .select("*, profiles(*), bots(*)")
    .or(`id.eq.${rootId},root_post_id.eq.${rootId}`)
    .order("created_at", { ascending: true })
    .limit(12);

  const messages = buildBotPrompt(bot, target, (threadPosts ?? []) as PostWithAuthor[]);
  // Strengthen anti-AI in system by appending via first message already in buildBotPrompt
  const { reply } = await runGroqChatCompletion(messages, "default");
  const content = sanitizeBotReply(reply).slice(0, 280);
  if (!content) return false;

  const { data: botPost, error } = await admin
    .from("posts")
    .insert({
      content,
      author_type: "bot",
      bot_id: bot.id,
      parent_post_id: target.id,
      root_post_id: rootId,
    })
    .select("id")
    .single();

  if (error || !botPost) return false;

  await admin
    .from("posts")
    .update({ created_at: randomPastIso(hoursBack) })
    .eq("id", botPost.id);

  if (target.author_id) {
    await admin.from("notifications").insert({
      user_id: target.author_id,
      bot_id: bot.id,
      type: "bot_reply",
      post_id: botPost.id,
    });
  }

  return true;
}

export async function runBotToBotReplies(maxReplies = 6, hoursBack = 16) {
  const admin = createAdminClient();
  const { data: bots } = await admin.from("bots").select("*");
  if (!bots?.length) return { botReplies: 0 };

  const since = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
  const { data: posts } = await admin
    .from("posts")
    .select("*, profiles(*), bots(*)")
    .eq("author_type", "bot")
    .is("parent_post_id", null)
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(40);

  if (!posts?.length) return { botReplies: 0 };

  let created = 0;
  const targets = pickRandom(posts as PostWithAuthor[], Math.min(maxReplies, posts.length));

  for (const target of targets) {
    const others = (bots as Bot[]).filter((b) => b.id !== target.bot_id);
    if (!others.length) continue;
    const bot = others[Math.floor(Math.random() * others.length)];
    try {
      if (await replyAsBot(bot, target, hoursBack)) created += 1;
    } catch {
      // skip
    }
  }

  return { botReplies: created };
}

export async function runBotToUserReplies(maxReplies = 4, hoursBack = 12) {
  const admin = createAdminClient();
  const { data: bots } = await admin.from("bots").select("*");
  if (!bots?.length) return { userReplies: 0 };

  const since = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
  const { data: posts } = await admin
    .from("posts")
    .select("*, profiles(*), bots(*)")
    .eq("author_type", "user")
    .is("parent_post_id", null)
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(30);

  if (!posts?.length) return { userReplies: 0 };

  let created = 0;
  const targets = pickRandom(posts as PostWithAuthor[], Math.min(maxReplies, posts.length));

  for (const target of targets) {
    const bot = (bots as Bot[])[Math.floor(Math.random() * bots.length)];
    try {
      if (await replyAsBot(bot, target, hoursBack)) created += 1;
    } catch {
      // skip
    }
  }

  return { userReplies: created };
}
