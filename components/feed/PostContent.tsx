import Link from "next/link";
import { MENTION_REGEX, BOT_HANDLES } from "@/lib/bots/constants";

export function PostContent({ content }: { content: string }) {
  const parts = content.split(MENTION_REGEX);

  if (parts.length === 1) {
    return <span>{content}</span>;
  }

  const nodes: React.ReactNode[] = [];
  for (let i = 0; i < parts.length; i++) {
    nodes.push(<span key={`t-${i}`}>{parts[i]}</span>);
    if (i + 1 < parts.length) {
      const handle = parts[i + 1];
      const isBot = BOT_HANDLES.includes(handle.toLowerCase() as (typeof BOT_HANDLES)[number]);

      if (isBot) {
        nodes.push(
          <Link
            key={`m-${i}`}
            href={`/profile/${handle}`}
            className="text-neon-cyan hover:underline"
          >
            @{handle}
          </Link>
        );
      } else {
        nodes.push(
          <span key={`m-${i}`} className="text-neon-cyan/70">
            @{handle}
          </span>
        );
      }
      i += 1;
    }
  }

  return <>{nodes}</>;
}
