import Link from "next/link";
import { redirect } from "next/navigation";
import { FeedTabs } from "@/components/feed/FeedTabs";
import { Composer } from "@/components/feed/Composer";
import { FeedList } from "@/components/feed/FeedList";
import { OnboardingPanel } from "@/components/onboarding/OnboardingPanel";
import { getBots, getCurrentProfile, getGlobalFeed } from "@/lib/posts/queries";
import { createClient } from "@/lib/supabase/server";
import type { Bot } from "@/lib/types/database";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab = "foryou" } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (tab === "following" && !user) {
    redirect("/login");
  }

  const profile = user ? await getCurrentProfile() : null;
  const bots = (await getBots()) ?? [];
  const posts =
    tab === "following" && user
      ? await (await import("@/lib/posts/queries")).getFollowingFeed(user.id)
      : await getGlobalFeed();

  const showOnboarding = !!user && profile && !profile.onboarding_done;

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <header className="mb-6 flex items-center justify-between">
        <h1 className="font-pixel text-xs text-neon-cyan tracking-widest">FEED</h1>
        {user ? (
          <span className="font-mono text-xs text-white/30 md:hidden">@{profile?.handle}</span>
        ) : (
          <Link href="/signup" className="font-mono text-xs text-neon-magenta hover:underline">
            Join Piper
          </Link>
        )}
      </header>
      {showOnboarding && <OnboardingPanel bots={bots as Bot[]} />}
      <FeedTabs active={tab} />
      <div className="mb-4 mt-4">
        {user ? (
          <Composer bots={bots as Bot[]} placeholder="What's happening? @mention a bot..." />
        ) : (
          <div className="border-2 border-dashed border-white/15 p-4 text-center">
            <p className="font-mono text-sm text-white/50">
              <Link href="/login" className="text-neon-cyan hover:underline">
                Log in
              </Link>{" "}
              to post, like, and talk to the bots.
            </p>
          </div>
        )}
      </div>
      <FeedList
        key={tab}
        initialPosts={posts}
        currentUserId={user?.id}
        feedType={tab === "following" ? "following" : "global"}
      />
    </div>
  );
}
