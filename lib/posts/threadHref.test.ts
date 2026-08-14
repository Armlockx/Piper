import { describe, expect, it } from "vitest";
import { threadPostHref } from "@/lib/posts/threadHref";

describe("threadPostHref", () => {
  it("opens the thread root and hashes the specific reply", () => {
    expect(threadPostHref("reply-9", "root-1")).toBe("/post/root-1#reply-reply-9");
  });

  it("falls back to the post id when root is missing", () => {
    expect(threadPostHref("root-1", null)).toBe("/post/root-1");
  });

  it("returns hash-only placeholder when there is no post", () => {
    expect(threadPostHref(null, null)).toBe("#");
  });
});
