import { describe, expect, it } from "vitest";
import {
  buildThreadTree,
  flattenThreadTree,
  threadParticipants,
  type ThreadNode,
} from "@/lib/posts/buildThreadTree";
import type { PostWithAuthor } from "@/lib/types/database";

function post(
  id: string,
  opts: {
    parent?: string | null;
    root?: string | null;
    handle?: string;
    authorType?: "user" | "bot";
    createdAt?: string;
  } = {}
): PostWithAuthor {
  const isBot = opts.authorType === "bot";
  const handle = opts.handle ?? id;
  return {
    id,
    content: id,
    author_type: isBot ? "bot" : "user",
    author_id: isBot ? null : `user-${id}`,
    bot_id: isBot ? `bot-${id}` : null,
    parent_post_id: opts.parent ?? null,
    root_post_id: opts.root ?? null,
    like_count: 0,
    reply_count: 0,
    repost_count: 0,
    created_at: opts.createdAt ?? "2026-08-14T12:00:00.000Z",
    updated_at: opts.createdAt ?? "2026-08-14T12:00:00.000Z",
    profiles: isBot
      ? null
      : {
          id: `user-${id}`,
          handle,
          display_name: handle,
          bio: null,
          avatar_url: null,
          email_verified_at: null,
          verification_sent_at: null,
          onboarding_done: true,
          is_admin: false,
          created_at: "2026-08-01T00:00:00.000Z",
          updated_at: "2026-08-01T00:00:00.000Z",
        },
    bots: isBot
      ? {
          id: `bot-${id}`,
          handle,
          name: handle,
          persona_prompt: "",
          avatar_url: "/bots/x.svg",
          accent_color: "#00ffd5",
          auto_reply_weight: 1,
          created_at: "2026-08-01T00:00:00.000Z",
        }
      : null,
  };
}

describe("buildThreadTree", () => {
  it("nests replies under their parent and sorts siblings by created_at", () => {
    const root = post("root", { handle: "piper" });
    const a = post("a", {
      parent: "root",
      root: "root",
      handle: "alice",
      createdAt: "2026-08-14T12:01:00.000Z",
    });
    const b = post("b", {
      parent: "a",
      root: "root",
      handle: "byte",
      authorType: "bot",
      createdAt: "2026-08-14T12:03:00.000Z",
    });
    const c = post("c", {
      parent: "root",
      root: "root",
      handle: "carol",
      createdAt: "2026-08-14T12:02:00.000Z",
    });

    const tree = buildThreadTree([c, b, a, root]);
    expect(tree.map((n) => n.post.id)).toEqual(["a", "c"]);
    expect(tree[0]?.parentHandle).toBe("piper");
    expect(tree[0]?.depth).toBe(0);
    expect(tree[0]?.children.map((n) => n.post.id)).toEqual(["b"]);
    expect(tree[0]?.children[0]?.parentHandle).toBe("alice");
    expect(tree[0]?.children[0]?.depth).toBe(1);
  });

  it("caps indent depth at 4 and still keeps deeper children", () => {
    const posts: PostWithAuthor[] = [post("root", { handle: "root" })];
    let parent = "root";
    for (let i = 1; i <= 6; i++) {
      posts.push(
        post(`r${i}`, {
          parent,
          root: "root",
          handle: `h${i}`,
          createdAt: `2026-08-14T12:0${i}:00.000Z`,
        })
      );
      parent = `r${i}`;
    }

    const tree = buildThreadTree(posts);
    const flat = flattenThreadTree(tree);
    expect(flat.find((n) => n.post.id === "r5")?.depth).toBe(4);
    expect(flat.find((n) => n.post.id === "r6")?.depth).toBe(4);
    expect(flat.find((n) => n.post.id === "r6")?.deep).toBe(true);
  });

  it("keeps orphan replies at the top of the forest", () => {
    const root = post("root", { handle: "piper" });
    const orphan = post("ghost", {
      parent: "missing",
      root: "root",
      handle: "ghost",
    });
    const tree = buildThreadTree([root, orphan]);
    expect(tree.map((n) => n.post.id)).toEqual(["ghost"]);
    expect(tree[0]?.parentHandle).toBeNull();
  });
});

describe("flattenThreadTree", () => {
  it("walks depth-first so conversation order stays parent-then-child", () => {
    const nodes: ThreadNode[] = [
      {
        post: post("a"),
        depth: 0,
        parentHandle: "root",
        deep: false,
        children: [
          {
            post: post("a1"),
            depth: 1,
            parentHandle: "a",
            deep: false,
            children: [],
          },
        ],
      },
      {
        post: post("b"),
        depth: 0,
        parentHandle: "root",
        deep: false,
        children: [],
      },
    ];
    expect(flattenThreadTree(nodes).map((n) => n.post.id)).toEqual(["a", "a1", "b"]);
  });
});

describe("threadParticipants", () => {
  it("returns unique authors in first-appearance order", () => {
    const posts = [
      post("root", { handle: "piper", authorType: "bot" }),
      post("a", { parent: "root", root: "root", handle: "alice" }),
      post("b", { parent: "root", root: "root", handle: "piper", authorType: "bot" }),
    ];
    const people = threadParticipants(posts);
    expect(people.map((p) => p.handle)).toEqual(["piper", "alice"]);
    expect(people[0]?.isBot).toBe(true);
    expect(people.filter((p) => p.isBot)).toHaveLength(1);
  });
});
