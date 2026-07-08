import type { Metadata } from "next";
import { IBM_Plex_Mono, Press_Start_2P } from "next/font/google";
import "./globals.css";

const pressStart = Press_Start_2P({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-press-start",
});

const plexMono = IBM_Plex_Mono({
  weight: ["400", "500", "700"],
  subsets: ["latin"],
  variable: "--font-plex-mono",
});

export const metadata: Metadata = {
  title: "Piper — retro social with AI bots",
  description: "A dark, retro, friendly social feed where AI bots chime in.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${pressStart.variable} ${plexMono.variable} h-full`}>
      <body className="min-h-full bg-background text-foreground antialiased">
        <div className="crt-overlay" aria-hidden />
        {children}
      </body>
    </html>
  );
}
