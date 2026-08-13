import Link from "next/link";
import { notFound } from "next/navigation";
import { Avatar } from "@/components/ui/avatar";
import { BotBadge } from "@/components/bots/BotBadge";
import { FeedList } from "@/components/feed/FeedList";
import { FollowButton } from "@/components/profile/FollowButton";
import { MessageBotButton } from "@/components/chat/MessageBotButton";
import { VerifiedBadge } from "@/components/profile/VerifiedBadge";
import { getUserPosts } from "@/lib/posts/queries";
import { createClient } from "@/lib/supabase/server";
import {
  getFollowerCount,
  getFollowingCount,
  isFollowing,
  resolveFollowTarget,
} from "@/lib/follows/queries";
import { isEmailVerified } from "@/lib/profiles/isVerified";
import { getTranslations } from "next-intl/server";
import type { Bot, Profile } from "@/lib/types/database";

export default async function ProfilePage({ params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;
  const { profile, posts } = await getUserPosts(handle);
  const tLang = await getTranslations("Language");
  const tProfile = await getTranslations("Profile");

  if (!profile) notFound();

  const isBot = "persona_prompt" in (profile as Bot);
  const bot = isBot ? (profile as Bot) : null;
  const userProfile = !isBot ? (profile as Profile) : null;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const target = await resolveFollowTarget(supabase, handle);
  const following =
    user && target ? await isFollowing(supabase, user.id, target) : false;

  const followerCount = target ? await getFollowerCount(supabase, target) : 0;
  const followingCount = userProfile
    ? await getFollowingCount(supabase, userProfile.id)
    : 0;

  const showFollowButton =
    user && target && !(target.type === "user" && target.id === user.id);

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <div className="border-2 border-white/10 bg-black/30 p-6">
        <div className="flex items-start gap-4">
          <Avatar
            src={isBot ? bot?.avatar_url : userProfile?.avatar_url}
            alt={isBot ? bot?.name ?? "" : userProfile?.display_name ?? ""}
            size="lg"
            accent={bot?.accent_color}
          />
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-mono text-lg font-bold">
                {isBot ? bot?.name : userProfile?.display_name}
              </h1>
              {bot && <BotBadge handle={bot.handle} color={bot.accent_color} />}
              {userProfile && isEmailVerified(userProfile) && <VerifiedBadge />}
            </div>
            <p className="font-mono text-sm text-white/40">@{handle}</p>
            {(userProfile?.bio || bot?.bio || bot?.persona_prompt) && (
              <p className="mt-2 font-mono text-sm text-white/70">
                {userProfile?.bio ?? bot?.bio ?? bot?.persona_prompt}
              </p>
            )}
            {bot?.native_locale && (
              <p className="mt-1 font-mono text-xs text-white/35">
                {bot.native_locale === "pt" ? tLang("writesPt") : tLang("writesEn")}
              </p>
            )}
            <p className="mt-2 font-mono text-xs text-white/30">
              <Link href={`/profile/${handle}/followers`} className="hover:text-neon-cyan">
                {followerCount === 1
                  ? tProfile("follower", { count: followerCount })
                  : tProfile("followers", { count: followerCount })}
              </Link>
              {userProfile && (
                <>
                  {" "}
                  ·{" "}
                  <Link href={`/profile/${handle}/following`} className="hover:text-neon-cyan">
                    {tProfile("following", { count: followingCount })}
                  </Link>
                </>
              )}
            </p>
          </div>
          <div className="flex flex-col gap-2">
            {showFollowButton && (
              <FollowButton
                handle={handle}
                initialFollowing={following}
                targetType={target?.type}
              />
            )}
            {user && bot && bot.active !== false && (
              <MessageBotButton botHandle={bot.handle} />
            )}
          </div>
        </div>
      </div>
      <div className="mt-4">
        <FeedList initialPosts={posts} currentUserId={user?.id} />
      </div>
    </div>
  );
}
