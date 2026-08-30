import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import { TopNav } from "@/components/nav/top-nav";
import { MobileSearchBar } from "@/components/nav/mobile-search-bar";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "CardStory — Know what your collection is worth",
    template: "%s · CardStory",
  },
  description:
    "Catalog your trading card collection, track its real-time value, and make smarter moves.",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html
      lang="en"
      className={`dark ${inter.variable} ${jetbrainsMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <Providers>
          <TopNav />
          <main className="flex-1 pb-20 md:pb-0">{children}</main>
          <MobileSearchBar />
        </Providers>
      </body>
    </html>
  );
}
