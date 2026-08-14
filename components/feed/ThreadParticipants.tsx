import Link from "next/link";
import { Avatar } from "@/components/ui/avatar";
import { getTranslations } from "next-intl/server";
import type { PostWithAuthor } from "@/lib/types/database";
import { threadParticipants } from "@/lib/posts/buildThreadTree";

export async function ThreadParticipants({ posts }: { posts: PostWithAuthor[] }) {
  const t = await getTranslations("Feed");
  const people = threadParticipants(posts);
  const replies = posts.filter((p) => p.parent_post_id);
  const fromBots = replies.filter((p) => p.author_type === "bot").length;

  if (people.length === 0) return null;

  return (
    <div className="mb-4 flex flex-wrap items-center gap-3 border-2 border-white/10 bg-black/20 px-3 py-2">
      <div className="flex -space-x-2">
        {people.slice(0, 8).map((p) => (
          <Link key={p.handle} href={`/profile/${p.handle}`} title={`@${p.handle}`}>
            <Avatar src={p.avatar} alt={p.name} accent={p.accent} size="sm" />
          </Link>
        ))}
      </div>
      <p className="font-mono text-[10px] uppercase tracking-wider text-white/40">
        {t("repliesMeta", { replies: replies.length, bots: fromBots })}
      </p>
    </div>
  );
}
