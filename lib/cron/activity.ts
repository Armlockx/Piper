import { createAdminClient } from "@/lib/supabase/admin";
import { runGroqChatCompletion } from "@/lib/groq/client";
import { sanitizeBotReply } from "@/lib/groq/sanitizeReply";
import type { Bot, Profile } from "@/lib/types/database";

const POST_TOPICS = [
  "a cozy retro internet moment",
  "something nerdy and fun about tech",
  "a small win worth celebrating today",
  "a playful nod to old forums and guestbooks",
  "a friendly question for the timeline",
  "a hot take about pixels and vibes",
  "what makes online communities feel welcoming",
];

function pickRandom<T>(items: T[], count: number): T[] {
  const copy = [...items];
  const picked: T[] = [];
  while (copy.length > 0 && picked.length < count) {
    const i = Math.floor(Math.random() * copy.length);
    picked.push(copy.splice(i, 1)[0]);
  }
  return picked;
}

async function generateBotPost(bot: Bot): Promise<string> {
  const topic = POST_TOPICS[Math.floor(Math.random() * POST_TOPICS.length)];

  const { reply } = await runGroqChatCompletion(
    [
      {
        role: "system",
        content: `${bot.persona_prompt}

You are @${bot.handle} posting on Piper, a retro social network.
Write one original short post under 220 characters.
Plain text only. No wrapping quotes. No hashtags unless natural.`,
      },
      {
        role: "user",
        content: `Write a single timeline post about: ${topic}. Output only the post text.`,
      },
    ],
    Math.random() > 0.5 ? "default" : "advanced"
  );

  return sanitizeBotReply(reply).slice(0, 280);
}

export async function runRandomBotPosts(maxPosts = 2) {
  const admin = createAdminClient();
  const { data: bots } = await admin.from("bots").select("*");
  if (!bots?.length) return { posts: 0 };

  const chosen = pickRandom(bots as Bot[], Math.min(maxPosts, bots.length));
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

      await admin.from("posts").update({ root_post_id: post.id }).eq("id", post.id);
      created += 1;
    } catch {
      // skip failed bot post
    }
  }

  return { posts: created };
}

export async function runRandomFollows(maxFollows = 4) {
  const admin = createAdminClient();
  const { data: profiles } = await admin.from("profiles").select("id, handle").limit(100);

  if (!profiles || profiles.length < 2) return { follows: 0 };

  const users = profiles as Pick<Profile, "id" | "handle">[];
  let created = 0;
  const attempts = maxFollows * 3;

  for (let i = 0; i < attempts && created < maxFollows; i++) {
    const [follower, following] = pickRandom(users, 2);
    if (!follower || !following || follower.id === following.id) continue;

    const { data: existing } = await admin
      .from("follows")
      .select("id")
      .eq("follower_id", follower.id)
      .eq("following_id", following.id)
      .maybeSingle();

    if (existing) continue;

    const { error } = await admin.from("follows").insert({
      follower_id: follower.id,
      following_id: following.id,
    });

    if (error) continue;

    await admin.from("notifications").insert({
      user_id: following.id,
      actor_id: follower.id,
      type: "follow",
    });

    created += 1;
  }

  return { follows: created };
}

export async function runCronActivity() {
  // Hobby Vercel plan: one cron run per day — batch more activity per execution
  const postCount = 2 + Math.floor(Math.random() * 3);
  const followCount = 4 + Math.floor(Math.random() * 4);

  const [posts, follows] = await Promise.all([
    runRandomBotPosts(postCount),
    runRandomFollows(followCount),
  ]);

  return {
    ok: true,
    posts: posts.posts,
    follows: follows.follows,
    at: new Date().toISOString(),
  };
}
