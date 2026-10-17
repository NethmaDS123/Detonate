import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { AccountProvider } from "@/components/AccountProvider";
import { SiteHeader } from "@/components/SiteHeader";
import { siteOriginFromEnv } from "@/lib/siteUrl";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(siteOriginFromEnv() ?? "http://localhost:3000"),
  title: { default: "Detonate — Don't.", template: "%s · Detonate" },
  description: "Competitive Minesweeper. Clear the board. Don't detonate.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <AccountProvider>
          <SiteHeader />
          <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 sm:py-10">
            {children}
          </main>
          <footer className="border-t border-[var(--line)]">
            <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-2 px-4 py-6 text-xs text-[var(--muted)] sm:px-6">
              <span>Detonate — competitive Minesweeper.</span>
              <span className="font-mono">Don&apos;t.</span>
            </div>
          </footer>
        </AccountProvider>
      </body>
    </html>
  );
}
