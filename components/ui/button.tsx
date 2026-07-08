import { cn } from "@/lib/utils";
import { ButtonHTMLAttributes, forwardRef } from "react";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "default" | "ghost" | "outline" | "neon";
  size?: "sm" | "md" | "lg";
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "md", ...props }, ref) => {
    const variants = {
      default: "bg-neon-cyan text-black hover:bg-neon-cyan/90 border-2 border-neon-cyan",
      ghost: "bg-transparent hover:bg-white/5 border-2 border-transparent",
      outline: "bg-transparent border-2 border-white/20 hover:border-neon-cyan/50",
      neon: "bg-transparent border-2 border-neon-magenta text-neon-magenta hover:bg-neon-magenta/10",
    };
    const sizes = {
      sm: "px-3 py-1 text-xs",
      md: "px-4 py-2 text-sm",
      lg: "px-6 py-3 text-base",
    };

    return (
      <button
        ref={ref}
        className={cn(
          "font-mono uppercase tracking-wider transition-all disabled:opacity-50 disabled:cursor-not-allowed",
          variants[variant],
          sizes[size],
          className
        )}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";
