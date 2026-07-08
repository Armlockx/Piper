"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

type FollowButtonProps = {
  handle: string;
  initialFollowing: boolean;
  targetType?: "user" | "bot";
};

export function FollowButton({ handle, initialFollowing, targetType }: FollowButtonProps) {
  const [following, setFollowing] = useState(initialFollowing);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function toggle() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/follows", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ handle }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Follow failed");
      setFollowing(data.following);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Follow failed");
    } finally {
      setLoading(false);
    }
  }

  const label = following
    ? "Following"
    : targetType === "bot"
      ? "Follow bot"
      : "Follow";

  return (
    <div className="flex flex-col items-end gap-1">
      <Button variant={following ? "outline" : "default"} size="sm" onClick={toggle} disabled={loading}>
        {loading ? "..." : label}
      </Button>
      {error && <span className="font-mono text-[10px] text-red-400">{error}</span>}
    </div>
  );
}
