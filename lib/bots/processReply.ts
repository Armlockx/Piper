import { createAdminClient } from "@/lib/supabase/admin";
import { buildBotPrompt } from "@/lib/groq/buildBotPrompt";
import { runGroqChatCompletion } from "@/lib/groq/client";
import type { Bot, PostWithAuthor } from "@/lib/types/database";

export async function processBotReplyJob(jobId: string) {
  const admin = createAdminClient();

  const { data: job, error: jobError } = await admin
    .from("bot_reply_jobs")
    .select("*, bots(*), posts(*, profiles(*), bots(*))")
    .eq("id", jobId)
    .eq("status", "pending")
    .single();

  if (jobError || !job) return;

  await admin.from("bot_reply_jobs").update({ status: "processing" }).eq("id", jobId);

  try {
    const targetPost = job.posts as PostWithAuthor;
    const bot = job.bots as Bot;
    const rootId = targetPost.root_post_id ?? targetPost.id;

    const { data: threadPosts } = await admin
      .from("posts")
      .select("*, profiles(*), bots(*)")
      .or(`id.eq.${rootId},root_post_id.eq.${rootId}`)
      .order("created_at", { ascending: true });

    const messages = buildBotPrompt(bot, targetPost, (threadPosts ?? []) as PostWithAuthor[]);
    const model = job.trigger === "mention" ? "advanced" : "default";
    const { reply } = await runGroqChatCompletion(messages, model);

    if (!reply) throw new Error("Empty bot reply");

    const { data: botPost, error: postError } = await admin
      .from("posts")
      .insert({
        content: reply.slice(0, 280),
        author_type: "bot",
        bot_id: bot.id,
        parent_post_id: targetPost.id,
        root_post_id: rootId,
      })
      .select()
      .single();

    if (postError) throw postError;

    if (targetPost.author_id) {
      await admin.from("notifications").insert({
        user_id: targetPost.author_id,
        bot_id: bot.id,
        type: "bot_reply",
        post_id: botPost.id,
      });
    }

    await admin
      .from("bot_reply_jobs")
      .update({ status: "done", processed_at: new Date().toISOString() })
      .eq("id", jobId);
  } catch (e) {
    await admin
      .from("bot_reply_jobs")
      .update({
        status: "failed",
        error: e instanceof Error ? e.message : "Unknown error",
        processed_at: new Date().toISOString(),
      })
      .eq("id", jobId);
  }
}

export async function enqueueBotJobs(postId: string, content: string, isTopLevel: boolean) {
  const admin = createAdminClient();

  const { data: bots } = await admin.from("bots").select("*");
  if (!bots?.length) return;

  const { detectBotMentions } = await import("@/lib/bots/detectMentions");
  const { shouldAutoReply, pickAutoBot } = await import("@/lib/bots/pickAutoBot");

  const mentioned = detectBotMentions(content, bots);
  const jobs: Array<{ post_id: string; bot_id: string; trigger: "auto" | "mention" }> = [];

  for (const bot of mentioned) {
    jobs.push({ post_id: postId, bot_id: bot.id, trigger: "mention" });
  }

  if (mentioned.length === 0 && shouldAutoReply(isTopLevel)) {
    const picked = pickAutoBot(bots);
    if (picked) {
      jobs.push({ post_id: postId, bot_id: picked.id, trigger: "auto" });
    }
  }

  for (const job of jobs) {
    const { data } = await admin
      .from("bot_reply_jobs")
      .insert(job)
      .select("id")
      .maybeSingle();

    if (data?.id) {
      void processBotReplyJob(data.id);
    }
  }
}
