export function threadPostHref(postId: string | null | undefined, rootPostId: string | null | undefined): string {
  if (!postId) return "#";
  const threadId = rootPostId ?? postId;
  if (threadId === postId) return `/post/${threadId}`;
  return `/post/${threadId}#reply-${postId}`;
}
