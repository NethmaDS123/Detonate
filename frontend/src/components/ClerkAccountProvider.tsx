"use client";

import { useAuth, useClerk, useUser } from "@clerk/nextjs";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  AccountContext,
  type AccountContextValue,
  type AccountStatus,
} from "@/components/account-context";
import {
  fetchAccount,
  linkLegacyAccount,
  syncClerkAccount,
  type Account,
} from "@/lib/account";
import { ApiError } from "@/lib/api";

export function ClerkAccountProvider({ children }: { children: ReactNode }) {
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const { user } = useUser();
  const clerk = useClerk();
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [account, setAccount] = useState<Account | null>(null);
  const [offline, setOffline] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn) {
      setSessionToken(null);
      setAccount(null);
      setOffline(false);
      return;
    }

    let cancelled = false;
    void (async () => {
      const token = await getToken();
      if (!token || cancelled) return;
      setSessionToken(token);
      try {
        await syncClerkAccount(token);
        const me = await fetchAccount(token);
        if (!cancelled) {
          setAccount(me);
          setOffline(false);
        }
      } catch {
        if (!cancelled) setOffline(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isLoaded, isSignedIn, getToken, user?.id, attempt]);

  const openClerkSignIn = useCallback(async () => {
    await clerk.openSignIn({});
  }, [clerk]);

  const signIn = useCallback(
    async (raw: string) => {
      const legacyToken = raw.trim();
      if (legacyToken) {
        const clerkToken = await getToken();
        if (!clerkToken) {
          throw new ApiError(401, "Sign in with Google first, then link your token.");
        }
        await linkLegacyAccount(clerkToken, legacyToken);
        const me = await fetchAccount(clerkToken);
        setAccount(me);
        setOffline(false);
        return;
      }
      await openClerkSignIn();
    },
    [getToken, openClerkSignIn],
  );

  const register = useCallback(
    async (displayName: string) => {
      const token = await getToken();
      if (!token) throw new ApiError(401, "not signed in");
      await syncClerkAccount(token, displayName.trim());
      const me = await fetchAccount(token);
      setAccount(me);
      setSessionToken(token);
      return token;
    },
    [getToken],
  );

  const signOut = useCallback(() => {
    void clerk.signOut();
    setSessionToken(null);
    setAccount(null);
  }, [clerk]);

  const retry = useCallback(() => {
    setOffline(false);
    setAttempt((n) => n + 1);
  }, []);

  let status: AccountStatus = "loading";
  if (isLoaded) {
    if (!isSignedIn) status = "guest";
    else if (offline) status = "offline";
    else if (account) status = "signed_in";
    else status = "loading";
  }

  const value = useMemo<AccountContextValue>(
    () => ({
      status,
      account,
      token: sessionToken,
      authMode: "clerk",
      signIn,
      register,
      signOut,
      retry,
    }),
    [status, account, sessionToken, signIn, register, signOut, retry],
  );

  return <AccountContext.Provider value={value}>{children}</AccountContext.Provider>;
}
