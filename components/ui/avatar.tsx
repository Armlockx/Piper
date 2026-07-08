import { cn } from "@/lib/utils";
import Image from "next/image";

type AvatarProps = {
  src?: string | null;
  alt: string;
  size?: "sm" | "md" | "lg";
  accent?: string;
  className?: string;
};

export function Avatar({ src, alt, size = "md", accent, className }: AvatarProps) {
  const sizes = { sm: 32, md: 40, lg: 64 };
  const px = sizes[size];

  return (
    <div
      className={cn("relative shrink-0 border-2 bg-black/60", className)}
      style={{ borderColor: accent ?? "rgba(255,255,255,0.2)", width: px, height: px }}
    >
      {src ? (
        <Image src={src} alt={alt} width={px} height={px} className="object-cover" />
      ) : (
        <div
          className="flex h-full w-full items-center justify-center font-pixel text-[8px] uppercase text-white/60"
          style={{ fontSize: size === "lg" ? 10 : 8 }}
        >
          {alt.slice(0, 2)}
        </div>
      )}
    </div>
  );
}
