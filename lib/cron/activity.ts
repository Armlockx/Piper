import { runRandomBotPosts } from "@/lib/cron/posts";
import { runBotToBotReplies, runBotToUserReplies } from "@/lib/cron/replies";
import { runOrganicLikes } from "@/lib/cron/likes";
import {
  runRandomUserFollows,
  runSoftUnfollows,
  runUserToBotFollows,
} from "@/lib/cron/follows";
import { randInt } from "@/lib/cron/topics";

export type CronMode = "daily" | "tick";

const emptyCounters = {
  posts: 0,
  botReplies: 0,
  userReplies: 0,
  likes: 0,
  follows: 0,
  botFollows: 0,
  unfollows: 0,
};

/**
 * Light 5-minute tick (GitHub Actions). Most runs skip or only like
 * so ~288 ticks/day do not flood the feed / Groq.
 *
 * Rough daily from ticks alone (if schedule is reliable):
 * ~12 posts, ~9 bot replies, ~6 user replies, likes often, few follows.
 */
export async function runCronTick() {
  const roll = Math.random();

  if (roll < 0.04) {
    const posts = await runRandomBotPosts(1, 0.2);
    return {
      ok: true,
      mode: "tick" as const,
      skipped: false,
      ...emptyCounters,
      posts: posts.posts,
      at: new Date().toISOString(),
    };
  }

  if (roll < 0.07) {
    const botReplies = await runBotToBotReplies(1, 0.25);
    return {
      ok: true,
      mode: "tick" as const,
      skipped: false,
      ...emptyCounters,
      botReplies: botReplies.botReplies,
      at: new Date().toISOString(),
    };
  }

  if (roll < 0.09) {
    const userReplies = await runBotToUserReplies(1, 0.25);
    return {
      ok: true,
      mode: "tick" as const,
      skipped: false,
      ...emptyCounters,
      userReplies: userReplies.userReplies,
      at: new Date().toISOString(),
    };
  }

  if (roll < 0.11) {
    if (Math.random() < 0.5) {
      const follows = await runRandomUserFollows(1);
      return {
        ok: true,
        mode: "tick" as const,
        skipped: false,
        ...emptyCounters,
        follows: follows.follows,
        at: new Date().toISOString(),
      };
    }
    const botFollows = await runUserToBotFollows(1);
    return {
      ok: true,
      mode: "tick" as const,
      skipped: false,
      ...emptyCounters,
      botFollows: botFollows.botFollows,
      at: new Date().toISOString(),
    };
  }

  if (roll < 0.4) {
    const likes = await runOrganicLikes(randInt(1, 3));
    return {
      ok: true,
      mode: "tick" as const,
      skipped: false,
      ...emptyCounters,
      likes: likes.likes,
      at: new Date().toISOString(),
    };
  }

  return {
    ok: true,
    mode: "tick" as const,
    skipped: true,
    ...emptyCounters,
    at: new Date().toISOString(),
  };
}

/** Rich once-per-day batch (Vercel Hobby cron). */
export async function runCronDaily() {
  const postCount = randInt(6, 10);
  const botReplyCount = randInt(4, 8);
  const userReplyCount = randInt(2, 5);
  const likeCount = randInt(15, 30);
  const followCount = randInt(3, 6);
  const botFollowCount = randInt(2, 4);
  const unfollowCount = Math.random() < 0.5 ? randInt(0, 2) : 0;

  const posts = await runRandomBotPosts(postCount);
  const botReplies = await runBotToBotReplies(botReplyCount);
  const userReplies = await runBotToUserReplies(userReplyCount);
  const likes = await runOrganicLikes(likeCount);
  const follows = await runRandomUserFollows(followCount);
  const botFollows = await runUserToBotFollows(botFollowCount);
  const unfollows = await runSoftUnfollows(unfollowCount);

  return {
    ok: true,
    mode: "daily" as const,
    skipped: false,
    posts: posts.posts,
    botReplies: botReplies.botReplies,
    userReplies: userReplies.userReplies,
    likes: likes.likes,
    follows: follows.follows,
    botFollows: botFollows.botFollows,
    unfollows: unfollows.unfollows,
    at: new Date().toISOString(),
  };
}

export async function runCronActivity(mode: CronMode = "daily") {
  return mode === "tick" ? runCronTick() : runCronDaily();
}
