import { createAdminClient } from "@/lib/supabase/admin";
import { buildChatPrompt, buildMoodUpdatePrompt } from "@/lib/groq/buildChatPrompt";
import { runGroqChatCompletion } from "@/lib/groq/client";
import type { Bot, BotConversationState, ChatMessage, Profile } from "@/lib/types/database";

const VALID_MOODS = new Set([
  "neutral",
  "playful",
  "curious",
  "nostalgic",
  "hype",
  "chill",
  "witty",
  "warm",
]);

export async function processChatReplyJob(jobId: string) {
  const admin = createAdminClient();

  const { data: job, error: jobError } = await admin
    .from("chat_reply_jobs")
    .select("*, bots(*), conversations(*)")
    .eq("id", jobId)
    .eq("status", "pending")
    .single();

  if (jobError || !job) return;

  await admin.from("chat_reply_jobs").update({ status: "processing" }).eq("id", jobId);

  try {
    const bot = job.bots as Bot;
    const conversation = job.conversations as { id: string; user_id: string; bot_id: string };

    const { data: profile } = await admin
      .from("profiles")
      .select("handle")
      .eq("id", conversation.user_id)
      .single();

    const userHandle = (profile as Profile | null)?.handle ?? "user";

    const { data: messages } = await admin
      .from("chat_messages")
      .select("*")
      .eq("conversation_id", conversation.id)
      .order("created_at", { ascending: true })
      .limit(50);

    const history = (messages ?? []) as ChatMessage[];

    const { data: stateRow } = await admin
      .from("bot_conversation_state")
      .select("*")
      .eq("conversation_id", conversation.id)
      .maybeSingle();

    const state = (stateRow as BotConversationState | null) ?? null;

    const prompt = buildChatPrompt(bot, history, state, userHandle);
    const { reply } = await runGroqChatCompletion(prompt, "advanced", {
      maxTokens: 600,
      temperature: 0.9,
    });

    if (!reply) throw new Error("Empty chat reply");

    const { data: botMsg, error: msgError } = await admin
      .from("chat_messages")
      .insert({
        conversation_id: conversation.id,
        sender_type: "bot",
        sender_bot_id: bot.id,
        content: reply.slice(0, 4000),
      })
      .select()
      .single();

    if (msgError) throw msgError;

    await admin
      .from("conversations")
      .update({ last_message_at: new Date().toISOString() })
      .eq("id", conversation.id);

    // Update mood / summary every few turns
    const shouldUpdateState = history.length === 0 || history.length % 4 === 0 || !state;
    if (shouldUpdateState) {
      const withBot = [...history, botMsg as ChatMessage];
      try {
        const moodPrompt = buildMoodUpdatePrompt(bot, withBot, state);
        const { raw } = await runGroqChatCompletion(moodPrompt, "default", {
          maxTokens: 200,
          temperature: 0.4,
        });
        const parsed = parseMoodJson(raw);
        if (parsed) {
          await admin.from("bot_conversation_state").upsert({
            conversation_id: conversation.id,
            mood: parsed.mood,
            mood_intensity: parsed.mood_intensity,
            summary: parsed.summary,
            updated_at: new Date().toISOString(),
          });
        }
      } catch {
        // mood update is best-effort
      }
    }

    if (!state) {
      await admin.from("bot_conversation_state").upsert({
        conversation_id: conversation.id,
        mood: "curious",
        mood_intensity: 5,
        summary: null,
        updated_at: new Date().toISOString(),
      });
    }

    await admin
      .from("chat_reply_jobs")
      .update({ status: "done", processed_at: new Date().toISOString() })
      .eq("id", jobId);
  } catch (e) {
    await admin
      .from("chat_reply_jobs")
      .update({
        status: "failed",
        error: e instanceof Error ? e.message : "Unknown error",
        processed_at: new Date().toISOString(),
      })
      .eq("id", jobId);
  }
}

function parseMoodJson(raw: string): {
  mood: string;
  mood_intensity: number;
  summary: string;
} | null {
  try {
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) return null;
    const obj = JSON.parse(match[0]) as {
      mood?: string;
      mood_intensity?: number;
      summary?: string;
    };
    const mood = (obj.mood ?? "neutral").toLowerCase();
    if (!VALID_MOODS.has(mood)) return null;
    const intensity = Math.min(10, Math.max(1, Number(obj.mood_intensity) || 5));
    const summary = String(obj.summary ?? "").slice(0, 200);
    return { mood, mood_intensity: intensity, summary };
  } catch {
    return null;
  }
}

export async function enqueueChatReply(conversationId: string, messageId: string, botId: string) {
  const admin = createAdminClient();
  const { data } = await admin
    .from("chat_reply_jobs")
    .insert({
      conversation_id: conversationId,
      message_id: messageId,
      bot_id: botId,
      status: "pending",
    })
    .select("id")
    .single();

  if (data?.id) {
    void processChatReplyJob(data.id);
  }
}
