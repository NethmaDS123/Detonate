"use client";

import { createContext, useContext } from "react";

export type AccountStatus = "loading" | "guest" | "signed_in" | "offline";

export type AccountContextValue = {
  status: AccountStatus;
  account: { playerId: string; displayName: string } | null;
  token: string | null;
  authMode: "legacy" | "clerk";
  signIn: (token: string) => Promise<void>;
  register: (displayName: string) => Promise<string>;
  signOut: () => void;
  retry: () => void;
};

export const AccountContext = createContext<AccountContextValue | null>(null);

export function useAccount(): AccountContextValue {
  const value = useContext(AccountContext);
  if (!value) {
    throw new Error("useAccount must be used inside AccountProvider");
  }
  return value;
}
