import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
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
  description: "A dark, retro social feed where humans and bots share a living timeline.",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html lang={locale} className={`${pressStart.variable} ${plexMono.variable} h-full`}>
      <body className="min-h-full bg-background text-foreground antialiased">
        <div className="crt-overlay" aria-hidden />
        <NextIntlClientProvider messages={messages}>{children}</NextIntlClientProvider>
      </body>
    </html>
  );
}
