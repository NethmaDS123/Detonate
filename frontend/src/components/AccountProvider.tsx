"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import {
  clearAccountToken,
  createAccount,
  fetchAccount,
  loadAccountToken,
  saveAccountToken,
  subscribeAccountToken,
  type Account,
} from "@/lib/account";
import { ApiError } from "@/lib/api";

export type AccountStatus = "loading" | "guest" | "signed_in" | "offline";

type AccountContextValue = {
  status: AccountStatus;
  account: Account | null;
  token: string | null;
  signIn: (token: string) => Promise<void>;
  register: (displayName: string) => Promise<string>;
  signOut: () => void;
  retry: () => void;
};

type Lookup = { token: string; account: Account | null };

const AccountContext = createContext<AccountContextValue | null>(null);

export function AccountProvider({ children }: { children: ReactNode }) {
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
      account: { playerId: result.playerId, displayName: result.displayName },
    });
    saveAccountToken(result.token);
    return result.token;
  }, []);

  const signOut = useCallback(() => {
    knownToken.current = null;
    setLookup(null);
    clearAccountToken();
  }, []);

  const retry = useCallback(() => {
    setLookup(null);
    setAttempt((n) => n + 1);
  }, []);

  const current = token && lookup?.token === token ? lookup : null;
  let status: AccountStatus;
  if (token === undefined) status = "loading";
  else if (token === null) status = "guest";
  else if (!current) status = "loading";
  else status = current.account ? "signed_in" : "offline";

  const account = current?.account ?? null;
  const value = useMemo(
    () => ({ status, account, token: token ?? null, signIn, register, signOut, retry }),
    [status, account, token, signIn, register, signOut, retry],
  );

  return <AccountContext.Provider value={value}>{children}</AccountContext.Provider>;
}

export function useAccount(): AccountContextValue {
  const value = useContext(AccountContext);
  if (!value) {
    throw new Error("useAccount must be used inside AccountProvider");
  }
  return value;
}
