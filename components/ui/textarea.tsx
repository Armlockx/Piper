import { cn } from "@/lib/utils";
import { TextareaHTMLAttributes, forwardRef } from "react";

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(
      "w-full bg-black/40 border-2 border-white/15 px-4 py-3 font-mono text-sm resize-none",
      "placeholder:text-white/30 focus:border-neon-cyan focus:outline-none transition-colors",
      className
    )}
    {...props}
  />
));
Textarea.displayName = "Textarea";
