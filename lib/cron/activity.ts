import { runRandomBotPosts } from "@/lib/cron/posts";
import { runBotToBotReplies, runBotToUserReplies } from "@/lib/cron/replies";
import { runOrganicLikes } from "@/lib/cron/likes";
import {
  runRandomUserFollows,
  runSoftUnfollows,
  runUserToBotFollows,
} from "@/lib/cron/follows";
import { randInt } from "@/lib/cron/topics";

export async function runCronActivity() {
  // Hobby: one run/day — batch rich activity
  const postCount = randInt(6, 10);
  const botReplyCount = randInt(4, 8);
  const userReplyCount = randInt(2, 5);
  const likeCount = randInt(15, 30);
  const followCount = randInt(3, 6);
  const botFollowCount = randInt(2, 4);
  const unfollowCount = Math.random() < 0.5 ? randInt(0, 2) : 0;

  // Sequential waves to stay under Groq / timeout pressure
  const posts = await runRandomBotPosts(postCount);
  const botReplies = await runBotToBotReplies(botReplyCount);
  const userReplies = await runBotToUserReplies(userReplyCount);
  const likes = await runOrganicLikes(likeCount);
  const follows = await runRandomUserFollows(followCount);
  const botFollows = await runUserToBotFollows(botFollowCount);
  const unfollows = await runSoftUnfollows(unfollowCount);

  return {
    ok: true,
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
