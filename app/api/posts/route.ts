import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { enqueueBotJobs } from "@/lib/bots/processReply";
import { MAX_POST_LENGTH } from "@/lib/bots/constants";
import { ensureProfile } from "@/lib/profiles/ensureProfile";

const postSchema = z.object({
  content: z.string().min(1).max(MAX_POST_LENGTH),
  parentPostId: z.string().uuid().optional(),
  rootPostId: z.string().uuid().optional(),
});

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await ensureProfile(user);

  const body = await request.json();
  const parsed = postSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { content, parentPostId, rootPostId } = parsed.data;
  const isTopLevel = !parentPostId;

  let resolvedRoot = rootPostId ?? parentPostId ?? null;

  if (parentPostId && !rootPostId) {
    const { data: parent } = await supabase
      .from("posts")
      .select("root_post_id, id, author_id")
      .eq("id", parentPostId)
      .single();

    resolvedRoot = parent?.root_post_id ?? parent?.id ?? parentPostId;

    if (parent?.author_id && parent.author_id !== user.id) {
      await supabase.from("notifications").insert({
        user_id: parent.author_id,
        actor_id: user.id,
        type: "reply",
        post_id: parentPostId,
      });
    }
  }

  const { data: post, error } = await supabase
    .from("posts")
    .insert({
      content,
      author_type: "user",
      author_id: user.id,
      parent_post_id: parentPostId ?? null,
      root_post_id: resolvedRoot,
    })
    .select("*, profiles(*), bots(*)")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (isTopLevel) {
    await supabase.from("posts").update({ root_post_id: post.id }).eq("id", post.id);
    post.root_post_id = post.id;
  }

  void enqueueBotJobs(post.id, content, isTopLevel);

  return NextResponse.json({ post });
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const feed = searchParams.get("feed") ?? "global";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (feed === "following" && user) {
    const { getFollowingFeed } = await import("@/lib/posts/queries");
    const posts = await getFollowingFeed(user.id);
    return NextResponse.json({ posts });
  }

  const { getGlobalFeed } = await import("@/lib/posts/queries");
  const posts = await getGlobalFeed();
  return NextResponse.json({ posts });
}
