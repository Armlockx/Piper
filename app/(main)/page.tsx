import Link from "next/link";
import { FeedTabs } from "@/components/feed/FeedTabs";
import { Composer } from "@/components/feed/Composer";
import { FeedList } from "@/components/feed/FeedList";
import { getBots, getCurrentProfile, getGlobalFeed } from "@/lib/posts/queries";
import { createClient } from "@/lib/supabase/server";

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

  const profile = await getCurrentProfile();
  const bots = await getBots();
  const posts =
    tab === "following" && user
      ? await (await import("@/lib/posts/queries")).getFollowingFeed(user.id)
      : await getGlobalFeed();

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <header className="mb-6 flex items-center justify-between">
        <h1 className="font-pixel text-xs text-neon-cyan tracking-widest">FEED</h1>
        <Link href="/login" className="font-mono text-xs text-white/30 md:hidden">
          @{profile?.handle}
        </Link>
      </header>
      <FeedTabs active={tab} />
      <div className="mb-4 mt-4">
        <Composer bots={bots ?? []} placeholder="What's happening? @mention a bot..." />
      </div>
      <FeedList
        key={tab}
        initialPosts={posts} currentUserId={user?.id} feedType={tab === "following" ? "following" : "global"} />
    </div>
  );
}
