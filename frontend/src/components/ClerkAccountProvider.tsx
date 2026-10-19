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
  NoProfileError,
  syncClerkAccount,
  updateAccount,
  type Account,
} from "@/lib/account";
import { ApiError } from "@/lib/api";

function resolveStatus(account: Account | null, offline: boolean, signedIn: boolean): AccountStatus {
  if (!signedIn) return "guest";
  if (offline) return "offline";
  if (account === null) return "needs_profile";
  if (!account.onboardingCompleted) return "needs_onboarding";
  return "signed_in";
}

export function ClerkAccountProvider({ children }: { children: ReactNode }) {
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const { user } = useUser();
  const clerk = useClerk();
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [account, setAccount] = useState<Account | null>(null);
  const [offline, setOffline] = useState(false);
  const [attempt, setAttempt] = useState(0);

  const loadProfile = useCallback(async (token: string) => {
    try {
      const me = await fetchAccount(token);
      setAccount(me);
      setOffline(false);
      return me;
    } catch (err) {
      if (err instanceof NoProfileError) {
        setAccount(null);
        setOffline(false);
        return null;
      }
      setOffline(true);
      throw err;
    }
  }, []);

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
        await loadProfile(token);
      } catch {
        if (!cancelled) setOffline(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isLoaded, isSignedIn, getToken, user?.id, attempt, loadProfile]);

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
        await loadProfile(clerkToken);
        return;
      }
      await openClerkSignIn();
    },
    [getToken, loadProfile, openClerkSignIn],
  );

  const register = useCallback(
    async (displayName: string) => {
      const token = await getToken();
      if (!token) throw new ApiError(401, "not signed in");
      await syncClerkAccount(token, displayName.trim());
      const me = await loadProfile(token);
      setSessionToken(token);
      return token;
    },
    [getToken, loadProfile],
  );

  const completeOnboarding = useCallback(async () => {
    const token = await getToken();
    if (!token) throw new ApiError(401, "not signed in");
    const me = await updateAccount(token, { completeOnboarding: true });
    setAccount(me);
    setSessionToken(token);
  }, [getToken]);

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
    status = resolveStatus(account, offline, Boolean(isSignedIn));
  }

  const value = useMemo<AccountContextValue>(
    () => ({
      status,
      account,
      token: sessionToken,
      authMode: "clerk",
      signIn,
      register,
      completeOnboarding,
      signOut,
      retry,
    }),
    [status, account, sessionToken, signIn, register, completeOnboarding, signOut, retry],
  );

  return <AccountContext.Provider value={value}>{children}</AccountContext.Provider>;
}
