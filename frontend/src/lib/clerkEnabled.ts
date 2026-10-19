export function isClerkEnabled(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.trim());
}

export function clerkPublishableKey(): string | undefined {
  const key = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.trim();
  return key || undefined;
}

/** When Clerk is configured, token-only accounts are hidden unless explicitly allowed. */
export function isClerkOnlyAuth(): boolean {
  if (!isClerkEnabled()) return false;
  const flag = process.env.NEXT_PUBLIC_CLERK_ONLY?.trim().toLowerCase();
  if (flag === "0" || flag === "false" || flag === "no") return false;
  return true;
}
