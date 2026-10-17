"use client";

import { ClerkProvider } from "@clerk/nextjs";
import type { ReactNode } from "react";
import { ClerkAccountProvider } from "@/components/ClerkAccountProvider";
import { LegacyAccountProvider } from "@/components/LegacyAccountProvider";
import { clerkPublishableKey, isClerkEnabled } from "@/lib/clerkEnabled";

export { useAccount } from "@/components/account-context";
export type { AccountContextValue, AccountStatus } from "@/components/account-context";

export function AccountProvider({ children }: { children: ReactNode }) {
  if (isClerkEnabled()) {
    const publishableKey = clerkPublishableKey();
    if (!publishableKey) {
      return <LegacyAccountProvider>{children}</LegacyAccountProvider>;
    }
    return (
      <ClerkProvider publishableKey={publishableKey} afterSignOutUrl="/">
        <ClerkAccountProvider>{children}</ClerkAccountProvider>
      </ClerkProvider>
    );
  }
  return <LegacyAccountProvider>{children}</LegacyAccountProvider>;
}
