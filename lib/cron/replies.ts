import { createAdminClient } from "@/lib/supabase/admin";
import { buildBotPrompt } from "@/lib/groq/buildBotPrompt";
import { runGroqChatCompletion } from "@/lib/groq/client";
import { sanitizeBotReply } from "@/lib/groq/sanitizeReply";
import type { Bot, PostWithAuthor } from "@/lib/types/database";
async function replyAsBotNow(bot: Bot, target: PostWithAuthor) {
  const admin = createAdminClient();
  const rootId = target.root_post_id ?? target.id;

  const { data: threadPosts } = await admin
    .from("posts")
    .select("*, profiles(*), bots(*)")
    .or(`id.eq.${rootId},root_post_id.eq.${rootId}`)
    .order("created_at", { ascending: true })
    .limit(12);

  const messages = buildBotPrompt(bot, target, (threadPosts ?? []) as PostWithAuthor[]);
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

/** Pick a fresh bot top-level post and reply as another bot (now). */
export async function createBotToBotReplyNow(preferBotId?: string): Promise<boolean> {
  const admin = createAdminClient();
  const { data: bots } = await admin.from("bots").select("*").eq("active", true);
  if (!bots?.length) return false;

  const since = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
  const { data: posts } = await admin
    .from("posts")
    .select("*, profiles(*), bots(*)")
    .eq("author_type", "bot")
    .is("parent_post_id", null)
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(40);

  if (!posts?.length) return false;

  const target = (posts as PostWithAuthor[])[Math.floor(Math.random() * posts.length)];
  let others = (bots as Bot[]).filter((b) => b.id !== target.bot_id);
  if (!others.length) return false;

  if (preferBotId) {
    const preferred = others.find((b) => b.id === preferBotId);
    if (preferred) others = [preferred];
  }

  const bot = others[Math.floor(Math.random() * others.length)];
  try {
    return await replyAsBotNow(bot, target);
  } catch {
    return false;
  }
}

/** Pick a fresh user top-level post and reply as a bot (now). */
export async function createBotToUserReplyNow(preferBotId?: string): Promise<boolean> {
  const admin = createAdminClient();
  const { data: bots } = await admin.from("bots").select("*").eq("active", true);
  if (!bots?.length) return false;

  const since = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
  const { data: posts } = await admin
    .from("posts")
    .select("*, profiles(*), bots(*)")
    .eq("author_type", "user")
    .is("parent_post_id", null)
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(30);

  if (!posts?.length) return false;

  const target = (posts as PostWithAuthor[])[Math.floor(Math.random() * posts.length)];
  const pool = bots as Bot[];
  const bot = preferBotId
    ? pool.find((b) => b.id === preferBotId) ?? pool[Math.floor(Math.random() * pool.length)]
    : pool[Math.floor(Math.random() * pool.length)];

  try {
    return await replyAsBotNow(bot, target);
  } catch {
    return false;
  }
}

/** @deprecated Prefer scheduling + create*Now helpers. */
export async function runBotToBotReplies(maxReplies = 6) {
  let created = 0;
  for (let i = 0; i < maxReplies; i++) {
    if (await createBotToBotReplyNow()) created += 1;
  }
  return { botReplies: created };
}

/** @deprecated Prefer scheduling + create*Now helpers. */
export async function runBotToUserReplies(maxReplies = 4) {
  let created = 0;
  for (let i = 0; i < maxReplies; i++) {
    if (await createBotToUserReplyNow()) created += 1;
  }
  return { userReplies: created };
}
