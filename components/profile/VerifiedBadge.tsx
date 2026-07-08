import { cn } from "@/lib/utils";

export function VerifiedBadge({ className }: { className?: string }) {
  return (
    <span
      title="Email verificado"
      className={cn(
        "inline-flex items-center gap-1 border border-neon-cyan px-1.5 py-0.5",
        "font-pixel text-[8px] uppercase tracking-wider text-neon-cyan",
        className
      )}
    >
      <span aria-hidden className="inline-block text-[10px] leading-none">
        ✓
      </span>
      verified
    </span>
  );
}
