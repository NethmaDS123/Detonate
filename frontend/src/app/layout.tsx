import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { AccountProvider } from "@/components/AccountProvider";
import { OnboardingFlow } from "@/components/OnboardingFlow";
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

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0c0b0a",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-background text-foreground max-sm:overflow-x-clip">
        <AccountProvider>
          <SiteHeader />
          <OnboardingFlow />
          <main className="mx-auto w-full min-w-0 max-w-6xl flex-1 px-4 py-6 sm:px-6 sm:py-9 max-sm:px-3 max-sm:py-4">
            {children}
          </main>
          <footer className="border-t border-[var(--line)]">
            <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-2 px-4 py-6 text-xs text-[var(--muted)] sm:px-6 max-sm:px-3 max-sm:pb-[max(1.5rem,env(safe-area-inset-bottom))]">
              <span>Detonate — competitive Minesweeper.</span>
              <span className="font-mono">Don&apos;t.</span>
            </div>
          </footer>
        </AccountProvider>
      </body>
    </html>
  );
}
