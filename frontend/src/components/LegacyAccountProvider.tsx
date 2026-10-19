"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import {
  AccountContext,
  type AccountContextValue,
  type AccountStatus,
} from "@/components/account-context";
import {
  clearAccountToken,
  createAccount,
  fetchAccount,
  loadAccountToken,
  saveAccountToken,
  subscribeAccountToken,
  updateAccount,
  type Account,
} from "@/lib/account";
import { ApiError } from "@/lib/api";

type Lookup = { token: string; account: Account | null };

export function LegacyAccountProvider({ children }: { children: ReactNode }) {
  const token = useSyncExternalStore(subscribeAccountToken, loadAccountToken, () => undefined);
  const [lookup, setLookup] = useState<Lookup | null>(null);
  const [attempt, setAttempt] = useState(0);
  const knownToken = useRef<string | null>(null);

  useEffect(() => {
    if (!token || knownToken.current === token) return;
    let cancelled = false;
    void fetchAccount(token).then(
      (account) => {
        if (cancelled) return;
        knownToken.current = token;
        setLookup({ token, account });
      },
      (error: unknown) => {
        if (cancelled) return;
        if (error instanceof ApiError && error.status === 401) {
          clearAccountToken();
          return;
        }
        setLookup({ token, account: null });
      },
    );
    return () => {
      cancelled = true;
    };
  }, [token, attempt]);

  const signIn = useCallback(async (raw: string) => {
    const next = raw.trim();
    const account = await fetchAccount(next);
    knownToken.current = next;
    setLookup({ token: next, account });
    saveAccountToken(next);
  }, []);

  const register = useCallback(async (displayName: string) => {
    const result = await createAccount(displayName.trim());
    knownToken.current = result.token;
    setLookup({
      token: result.token,
      account: {
        playerId: result.playerId,
        displayName: result.displayName,
        onboardingCompleted: false,
      },
    });
    saveAccountToken(result.token);
    return result.token;
  }, []);

  const signOut = useCallback(() => {
    knownToken.current = null;
    setLookup(null);
    clearAccountToken();
  }, []);

  const completeOnboarding = useCallback(async () => {
    const active = knownToken.current ?? token;
    if (!active) throw new ApiError(401, "not signed in");
    const me = await updateAccount(active, { completeOnboarding: true });
    knownToken.current = active;
    setLookup({ token: active, account: me });
  }, [token]);

  const retry = useCallback(() => {
    setLookup(null);
    setAttempt((n) => n + 1);
  }, []);

  const current = token && lookup?.token === token ? lookup : null;
  let status: AccountStatus;
  if (token === undefined) status = "loading";
  else if (token === null) status = "guest";
  else if (!current) status = "loading";
  else if (!current.account) status = "offline";
  else if (!current.account.onboardingCompleted) status = "needs_onboarding";
  else status = "signed_in";

  const account = current?.account ?? null;
  const value = useMemo<AccountContextValue>(
    () => ({
      status,
      account,
      token: token ?? null,
      authMode: "legacy",
      signIn,
      register,
      completeOnboarding,
      signOut,
      retry,
    }),
    [status, account, token, signIn, register, completeOnboarding, signOut, retry],
  );

  return <AccountContext.Provider value={value}>{children}</AccountContext.Provider>;
}
