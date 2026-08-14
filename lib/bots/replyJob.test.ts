import { describe, expect, it } from "vitest";
import {
  cronReplyJobInsert,
  isRecentFailedJob,
  llmJobTypeForTrigger,
  replySourceForTrigger,
} from "@/lib/bots/replyJob";

describe("replySourceForTrigger", () => {
  it("maps each job trigger to a post reply_source", () => {
    expect(replySourceForTrigger("mention")).toBe("bot_mention");
    expect(replySourceForTrigger("auto")).toBe("bot_auto");
    expect(replySourceForTrigger("cron")).toBe("bot_cron");
  });
});

describe("llmJobTypeForTrigger", () => {
  it("routes cron replies through the cron_reply model", () => {
    expect(llmJobTypeForTrigger("mention")).toBe("feed_mention");
    expect(llmJobTypeForTrigger("auto")).toBe("feed_auto");
    expect(llmJobTypeForTrigger("cron")).toBe("cron_reply");
  });
});

describe("cronReplyJobInsert", () => {
  it("enqueues a cron job against the target post and thread root", () => {
    expect(
      cronReplyJobInsert("bot-1", { id: "post-9", root_post_id: "root-1" })
    ).toEqual({
      post_id: "post-9",
      bot_id: "bot-1",
      trigger: "cron",
      root_post_id: "root-1",
    });
  });

  it("uses the target id as root when the target is the thread root", () => {
    expect(
      cronReplyJobInsert("bot-1", { id: "root-1", root_post_id: null })
    ).toEqual({
      post_id: "root-1",
      bot_id: "bot-1",
      trigger: "cron",
      root_post_id: "root-1",
    });
  });
});

describe("isRecentFailedJob", () => {
  it("treats a failure within five minutes as recent", () => {
    const now = Date.parse("2026-08-14T20:00:00.000Z");
    expect(isRecentFailedJob("failed", "2026-08-14T19:56:00.000Z", now)).toBe(true);
    expect(isRecentFailedJob("failed", "2026-08-14T19:54:00.000Z", now)).toBe(false);
    expect(isRecentFailedJob("done", "2026-08-14T19:59:00.000Z", now)).toBe(false);
    expect(isRecentFailedJob("failed", null, now)).toBe(false);
  });
});
