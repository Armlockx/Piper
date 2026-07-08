import { cn } from "@/lib/utils";

export function BotBadge({ handle, color }: { handle: string; color?: string }) {
  return (
    <span
      className="inline-flex items-center gap-1 border px-1.5 py-0.5 font-pixel text-[8px] uppercase tracking-wider"
      style={{ borderColor: color ?? "#00ffd5", color: color ?? "#00ffd5" }}
    >
      <span className="inline-block h-1.5 w-1.5 animate-pulse bg-current" />
      bot · @{handle}
    </span>
  );
}

export function BotTyping({ handle, color }: { handle: string; color?: string }) {
  return (
    <div
      className={cn("flex items-center gap-2 border-2 border-dashed px-4 py-3 font-mono text-xs")}
      style={{ borderColor: `${color ?? "#00ffd5"}55`, color: color ?? "#00ffd5" }}
    >
      <span className="flex gap-1">
        <span className="animate-bounce [animation-delay:0ms]">.</span>
        <span className="animate-bounce [animation-delay:150ms]">.</span>
        <span className="animate-bounce [animation-delay:300ms]">.</span>
      </span>
      @{handle} is typing
    </div>
  );
}
