import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatRelativeTime(date: string | Date, locale: string = "en") {
  const now = Date.now();
  const then = new Date(date).getTime();
  const diff = Math.max(0, now - then);
  const seconds = Math.floor(diff / 1000);

  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  const intlLocale = locale.startsWith("pt") ? "pt-BR" : "en-US";
  return new Date(date).toLocaleDateString(intlLocale);
}
