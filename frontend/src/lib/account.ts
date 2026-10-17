import { ApiError, apiBase } from "@/lib/api";

const TOKEN_KEY = "detonate_account_token";

export type Account = {
  playerId: string;
  displayName: string;
};

export type CreateAccountResult = Account & { token: string };

const tokenListeners = new Set<() => void>();

function notifyTokenChange(): void {
  tokenListeners.forEach((listener) => listener());
}

export function subscribeAccountToken(listener: () => void): () => void {
  tokenListeners.add(listener);
  window.addEventListener("storage", listener);
  return () => {
    tokenListeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

export function loadAccountToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function saveAccountToken(token: string): void {
  window.localStorage.setItem(TOKEN_KEY, token);
  notifyTokenChange();
}

export function clearAccountToken(): void {
  window.localStorage.removeItem(TOKEN_KEY);
  notifyTokenChange();
}

function authHeaders(token: string | null): HeadersInit {
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

export async function fetchAccount(token: string): Promise<Account> {
  const res = await fetch(`${apiBase()}/v1/accounts/me`, { headers: authHeaders(token) });
  if (!res.ok) {
    throw new ApiError(res.status, `account failed (${res.status})`);
  }
  return res.json() as Promise<Account>;
}

export async function syncClerkAccount(
  token: string,
  displayName?: string,
): Promise<Account> {
  const res = await fetch(`${apiBase()}/v1/accounts/clerk/sync`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(displayName ? { displayName } : {}),
  });
  if (!res.ok) {
    throw new ApiError(res.status, `clerk sync failed (${res.status})`);
  }
  return res.json() as Promise<Account>;
}

export async function linkLegacyAccount(token: string, legacyToken: string): Promise<Account> {
  const res = await fetch(`${apiBase()}/v1/accounts/clerk/link`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ legacyToken }),
  });
  if (!res.ok) {
    throw new ApiError(res.status, `clerk link failed (${res.status})`);
  }
  return res.json() as Promise<Account>;
}

export async function createAccount(displayName: string): Promise<CreateAccountResult> {
  const res = await fetch(`${apiBase()}/v1/accounts`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ displayName }),
  });
  if (!res.ok) {
    throw new ApiError(res.status, `create account failed (${res.status})`);
  }
  return res.json() as Promise<CreateAccountResult>;
}
