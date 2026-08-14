import type { PostWithAuthor } from "@/lib/types/database";

export type ThreadNode = {
  post: PostWithAuthor;
  depth: number;
  parentHandle: string | null;
  deep: boolean;
  children: ThreadNode[];
};

export type ThreadParticipant = {
  handle: string;
  name: string;
  avatar: string | null;
  accent?: string;
  isBot: boolean;
};

const MAX_INDENT = 4;

function authorHandle(post: PostWithAuthor): string | null {
  if (post.author_type === "bot") return post.bots?.handle ?? null;
  return post.profiles?.handle ?? null;
}

function authorName(post: PostWithAuthor): string {
  if (post.author_type === "bot") return post.bots?.name ?? post.bots?.handle ?? "bot";
  return post.profiles?.display_name ?? post.profiles?.handle ?? "user";
}

function authorAvatar(post: PostWithAuthor): string | null {
  if (post.author_type === "bot") return post.bots?.avatar_url ?? null;
  return post.profiles?.avatar_url ?? null;
}

export function buildThreadTree(posts: PostWithAuthor[]): ThreadNode[] {
  const byId = new Map(posts.map((p) => [p.id, p]));
  const children = new Map<string, PostWithAuthor[]>();

  for (const post of posts) {
    if (!post.parent_post_id) continue;
    const list = children.get(post.parent_post_id) ?? [];
    list.push(post);
    children.set(post.parent_post_id, list);
  }

  for (const list of children.values()) {
    list.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  }

  const visited = new Set<string>();

  function nodeFor(post: PostWithAuthor, parentHandle: string | null, actualDepth: number): ThreadNode {
    visited.add(post.id);
    const kids = children.get(post.id) ?? [];
    return {
      post,
      depth: Math.min(actualDepth, MAX_INDENT),
      parentHandle,
      deep: actualDepth > MAX_INDENT,
      children: kids.map((child) => nodeFor(child, authorHandle(post), actualDepth + 1)),
    };
  }

  const roots = posts.filter((p) => !p.parent_post_id);
  const forest: ThreadNode[] = [];

  for (const root of roots) {
    const kids = children.get(root.id) ?? [];
    for (const child of kids) {
      forest.push(nodeFor(child, authorHandle(root), 0));
    }
  }

  const orphans = posts
    .filter((p) => p.parent_post_id && !visited.has(p.id) && !byId.has(p.parent_post_id))
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

  for (const orphan of orphans) {
    forest.push(nodeFor(orphan, null, 0));
  }

  return forest;
}

export function flattenThreadTree(nodes: ThreadNode[]): ThreadNode[] {
  const out: ThreadNode[] = [];
  function walk(node: ThreadNode) {
    out.push(node);
    for (const child of node.children) walk(child);
  }
  for (const node of nodes) walk(node);
  return out;
}

export function threadParticipants(posts: PostWithAuthor[]): ThreadParticipant[] {
  const seen = new Set<string>();
  const people: ThreadParticipant[] = [];
  for (const post of posts) {
    const handle = authorHandle(post);
    if (!handle || seen.has(handle)) continue;
    seen.add(handle);
    people.push({
      handle,
      name: authorName(post),
      avatar: authorAvatar(post),
      accent: post.author_type === "bot" ? post.bots?.accent_color : undefined,
      isBot: post.author_type === "bot",
    });
  }
  return people;
}
