"use client";

import { useState } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Avatar } from "@/components/ui/avatar";
import { BotBadge } from "@/components/bots/BotBadge";
import { PostCard } from "@/components/feed/PostCard";
import { VerifiedBadge } from "@/components/profile/VerifiedBadge";
import type { Bot, PostWithAuthor, Profile } from "@/lib/types/database";

type SearchResult = {
  users: Profile[];
  bots: Bot[];
  posts: PostWithAuthor[];
};

export function SearchClient({ currentUserId }: { currentUserId?: string | null }) {
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SearchResult | null>(null);

  async function run(value: string) {
    setQ(value);
    if (value.trim().length < 2) {
      setResult(null);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(value.trim())}`);
      const data = await res.json();
      setResult(data);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <Input
        value={q}
        onChange={(e) => void run(e.target.value)}
        placeholder="Search people, bots, posts..."
        className="mb-4"
      />
      {loading && <p className="font-mono text-xs text-white/40">Searching...</p>}
      {result && (
        <div className="flex flex-col gap-6">
          {(result.users.length > 0 || result.bots.length > 0) && (
            <section>
              <h2 className="mb-2 font-pixel text-[8px] text-neon-amber tracking-widest">PEOPLE</h2>
              <ul className="flex flex-col gap-2">
                {result.bots.map((b) => (
                  <li key={b.id}>
                    <Link
                      href={`/profile/${b.handle}`}
                      className="flex items-center gap-3 border-2 border-white/10 p-3 hover:border-neon-cyan/30"
                    >
                      <Avatar src={b.avatar_url} alt={b.name} accent={b.accent_color} />
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm font-bold">{b.name}</span>
                        <BotBadge handle={b.handle} color={b.accent_color} />
                      </div>
                    </Link>
                  </li>
                ))}
                {result.users.map((u) => (
                  <li key={u.id}>
                    <Link
                      href={`/profile/${u.handle}`}
                      className="flex items-center gap-3 border-2 border-white/10 p-3 hover:border-neon-cyan/30"
                    >
                      <Avatar src={u.avatar_url} alt={u.display_name} />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm font-bold">{u.display_name}</span>
                          {u.email_verified_at && <VerifiedBadge />}
                        </div>
                        <span className="font-mono text-xs text-white/40">@{u.handle}</span>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
          {result.posts.length > 0 && (
            <section>
              <h2 className="mb-2 font-pixel text-[8px] text-neon-cyan tracking-widest">POSTS</h2>
              <div className="flex flex-col gap-3">
                {result.posts.map((p) => (
                  <PostCard key={p.id} post={p} currentUserId={currentUserId} />
                ))}
              </div>
            </section>
          )}
          {result.users.length === 0 && result.bots.length === 0 && result.posts.length === 0 && (
            <p className="font-mono text-sm text-white/40">No results.</p>
          )}
        </div>
      )}
    </div>
  );
}
