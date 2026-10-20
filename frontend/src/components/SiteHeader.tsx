"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAccount } from "@/components/AccountProvider";

const NAV = [
  { href: "/daily", label: "Daily" },
  { href: "/play", label: "Classic" },
  { href: "/leaderboard", label: "Leaderboard" },
];

export function SiteHeader() {
  const pathname = usePathname();
  const { status, account } = useAccount();

  return (
    <header className="sticky top-0 z-20 border-b border-[var(--line)] bg-[var(--bg)]/90 backdrop-blur max-sm:pt-[env(safe-area-inset-top)]">
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center gap-6 px-4 sm:px-6 max-sm:min-h-14 max-sm:gap-2 max-sm:px-3">
        <Link
          href="/"
          aria-label="Detonate — don't detonate"
          className="flex shrink-0 items-center gap-2 font-mono text-sm uppercase tracking-[0.2em] max-sm:tracking-normal"
        >
          <span className="inline-block h-2 w-2 rounded-full bg-[var(--accent)]" aria-hidden />
          <span className="line-through decoration-[var(--accent)] decoration-2">Detonate</span>
        </Link>

        <nav
          aria-label="Main"
          className="flex flex-1 items-center gap-1 overflow-x-auto"
        >
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="nav-link"
              aria-current={pathname.startsWith(item.href) ? "page" : undefined}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        {status === "loading" ? (
          <span
            className="h-8 w-20 animate-pulse rounded-md bg-[var(--line)]"
            aria-hidden
          />
        ) : status === "needs_profile" || status === "needs_onboarding" ? (
          <span className="text-xs text-[var(--muted)]">Finish setup</span>
        ) : status === "signed_in" && account ? (
          <Link
            href="/account"
            className="flex shrink-0 items-center gap-2 rounded-md px-2 py-1 text-sm hover:bg-[var(--bg-raised)]"
          >
            <span
              className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--line)] font-mono text-xs uppercase"
              aria-hidden
            >
              {account.displayName.slice(0, 1)}
            </span>
            <span className="hidden sm:inline">{account.displayName}</span>
          </Link>
        ) : (
          <Link href="/account" className="btn btn-sm shrink-0">
            Sign in
          </Link>
        )}
      </div>
    </header>
  );
}
