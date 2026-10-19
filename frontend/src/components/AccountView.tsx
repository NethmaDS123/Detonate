"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { useAccount } from "@/components/AccountProvider";
import { PersonalBestsPanel } from "@/components/PersonalBestsPanel";
import { updateAccount } from "@/lib/account";
import { ApiError } from "@/lib/api";
import { ClerkSignInPrompt } from "@/components/OnboardingFlow";
import { isClerkEnabled, isClerkOnlyAuth } from "@/lib/clerkEnabled";

const NAME_PATTERN = /^[A-Za-z0-9_]{2,24}$/;

function describeError(error: unknown, action: "register" | "signIn"): string {
  if (error instanceof ApiError) {
    if (error.status === 409) return "That name is taken. Try another.";
    if (error.status === 422) return "Use 2–24 letters, numbers, or underscores.";
    if (error.status === 401) return "That token doesn't match an account.";
    if (error.status === 409) return "That account is already linked to another sign-in.";
    if (error.status === 503) return "Accounts are temporarily unavailable. Try again shortly.";
  }
  if (error instanceof TypeError) return "Can't reach the server. Check your connection.";
  return action === "register" ? "Couldn't create the account." : "Couldn't sign in.";
}

export function AccountView() {
  const { status, account, token, authMode, retry, signOut } = useAccount();
  const [newToken, setNewToken] = useState<string | null>(null);
  const clerkAuth = isClerkEnabled() && authMode === "clerk";

  if (status === "loading") {
    return (
      <div className="mx-auto w-full max-w-md">
        <div className="card h-48 animate-pulse" />
      </div>
    );
  }

  if (status === "offline") {
    return (
      <div className="card mx-auto w-full max-w-md p-6 text-center">
        <p className="font-medium">Can&apos;t reach the server</p>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Your saved sign-in is kept on this device. We&apos;ll load your account once the server is
          reachable.
        </p>
        <button type="button" className="btn btn-primary mt-5" onClick={retry}>
          Try again
        </button>
      </div>
    );
  }

  if (status === "signed_in" && account && token) {
    return (
      <div className="mx-auto flex max-w-md flex-col gap-4">
        {newToken && <TokenReveal token={newToken} onDone={() => setNewToken(null)} />}
        <section className="card p-6">
          <p className="eyebrow">Signed in</p>
          <div className="mt-3 flex items-center gap-3">
            <span
              className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--line)] font-mono text-lg uppercase"
              aria-hidden
            >
              {account.displayName.slice(0, 1)}
            </span>
            <div>
              <h1 className="text-xl font-semibold">{account.displayName}</h1>
              <p className="text-sm text-[var(--muted)]">Verified wins are ranked under this name.</p>
            </div>
          </div>
          <div className="mt-6 flex flex-wrap gap-2">
            <Link href="/daily" className="btn btn-primary">
              Play today&apos;s daily
            </Link>
            <button type="button" className="btn" onClick={signOut}>
              Sign out
            </button>
          </div>
        </section>
        <PersonalBestsPanel token={token} />
        {clerkAuth ? (
          !isClerkOnlyAuth() ? <LegacyLinkForm /> : null
        ) : !newToken ? (
          <TokenPanel token={token} />
        ) : null}
        {clerkAuth && token ? <UsernameEditor token={token} initialName={account.displayName} /> : null}
      </div>
    );
  }

  if (clerkAuth) {
    if (isClerkOnlyAuth()) {
      return <ClerkSignInPrompt />;
    }
    return (
      <div className="mx-auto flex max-w-md flex-col gap-6">
        <div>
          <p className="eyebrow">Account</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">Sign in to compete</h1>
          <p className="mt-2 text-sm text-[var(--muted)]">
            Use Google (via Clerk) to attach verified wins to your name. Already created a token
            account? Link it after you sign in.
          </p>
        </div>
        <section className="card flex flex-col gap-4 p-6">
          <Link href="/sign-in" className="btn btn-primary text-center">
            Continue with Google
          </Link>
        </section>
      </div>
    );
  }

  return (
    <div className="mx-auto grid max-w-3xl gap-6 md:grid-cols-2">
      <div className="md:col-span-2">
        <p className="eyebrow">Account</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">Put your name on the board</h1>
        <p className="mt-2 max-w-xl text-sm text-[var(--muted)]">
          No email or password. Pick a name and keep your sign-in token safe — it&apos;s the only way
          back into your account on another device.
        </p>
      </div>
      <RegisterForm onCreated={setNewToken} />
      <SignInForm />
    </div>
  );
}

function UsernameEditor({ token, initialName }: { token: string; initialName: string }) {
  const { retry } = useAccount();
  const [name, setName] = useState(initialName);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = name.trim();
    if (!NAME_PATTERN.test(trimmed)) {
      setError("Use 2–24 letters, numbers, or underscores.");
      return;
    }
    if (trimmed === initialName) return;
    setBusy(true);
    setError(null);
    setSaved(false);
    try {
      await updateAccount(token, { displayName: trimmed });
      setSaved(true);
      retry();
    } catch (err) {
      setError(describeError(err, "register"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="card flex flex-col gap-3 p-6" noValidate>
      <div>
        <h2 className="font-medium">Username</h2>
        <p className="mt-1 text-sm text-[var(--muted)]">Shown on verified leaderboard entries.</p>
      </div>
      <label className="flex flex-col gap-1.5 text-sm">
        Display name
        <input className="input" value={name} onChange={(e) => setName(e.target.value)} maxLength={24} />
      </label>
      {error ? <p className="text-xs text-[var(--accent)]">{error}</p> : null}
      {saved ? <p className="text-xs text-emerald-400">Saved.</p> : null}
      <button type="submit" className="btn btn-sm w-fit" disabled={busy}>
        {busy ? "Saving…" : "Save username"}
      </button>
    </form>
  );
}

function LegacyLinkForm() {
  const { signIn } = useAccount();
  const [legacyToken, setLegacyToken] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!legacyToken.trim()) {
      setError("Paste the token from your old account.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await signIn(legacyToken);
    } catch (err) {
      setError(describeError(err, "signIn"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="card flex flex-col gap-3 p-6" noValidate>
      <div>
        <h2 className="font-medium">Link a token account</h2>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Moves your old bearer-token profile onto this Google sign-in.
        </p>
      </div>
      <label className="flex flex-col gap-1.5 text-sm">
        Legacy token
        <input
          className="input font-mono"
          type="password"
          value={legacyToken}
          onChange={(e) => setLegacyToken(e.target.value)}
          autoComplete="off"
          spellCheck={false}
        />
      </label>
      {error ? <p className="text-xs text-[var(--accent)]">{error}</p> : null}
      <button type="submit" className="btn btn-sm" disabled={busy}>
        {busy ? "Linking…" : "Link token account"}
      </button>
    </form>
  );
}

function RegisterForm({ onCreated }: { onCreated: (token: string) => void }) {
  const { register } = useAccount();
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = name.trim();
    if (!NAME_PATTERN.test(trimmed)) {
      setError("Use 2–24 letters, numbers, or underscores.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      onCreated(await register(trimmed));
    } catch (err) {
      setError(describeError(err, "register"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="card flex flex-col gap-4 p-6" noValidate>
      <div>
        <h2 className="font-medium">Create an account</h2>
        <p className="mt-1 text-sm text-[var(--muted)]">Choose the name shown on leaderboards.</p>
      </div>
      <label className="flex flex-col gap-1.5 text-sm">
        Display name
        <input
          className="input"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={24}
          autoComplete="nickname"
          placeholder="e.g. mine_sweeper"
          aria-invalid={error ? true : undefined}
          aria-describedby="register-help"
        />
      </label>
      <p id="register-help" className={`text-xs ${error ? "text-[var(--accent)]" : "text-[var(--muted)]"}`}>
        {error ?? "2–24 characters: letters, numbers, underscores."}
      </p>
      <button type="submit" className="btn btn-primary" disabled={busy}>
        {busy ? "Creating…" : "Create account"}
      </button>
    </form>
  );
}

function SignInForm() {
  const { signIn } = useAccount();
  const [token, setToken] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token.trim()) {
      setError("Paste the token you saved when you created your account.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await signIn(token);
    } catch (err) {
      setError(describeError(err, "signIn"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="card flex flex-col gap-4 p-6" noValidate>
      <div>
        <h2 className="font-medium">Sign in with a token</h2>
        <p className="mt-1 text-sm text-[var(--muted)]">Already have an account on another device?</p>
      </div>
      <label className="flex flex-col gap-1.5 text-sm">
        Sign-in token
        <input
          className="input font-mono"
          type="password"
          value={token}
          onChange={(e) => setToken(e.target.value)}
          autoComplete="off"
          spellCheck={false}
          aria-invalid={error ? true : undefined}
          aria-describedby="signin-help"
        />
      </label>
      <p id="signin-help" className={`text-xs ${error ? "text-[var(--accent)]" : "text-[var(--muted)]"}`}>
        {error ?? "Tokens are stored only on this device after sign-in."}
      </p>
      <button type="submit" className="btn" disabled={busy}>
        {busy ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}

function useCopy(text: string) {
  const [copied, setCopied] = useState<"idle" | "copied" | "failed">("idle");
  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied("copied");
    } catch {
      setCopied("failed");
    }
  }
  const label = copied === "copied" ? "Copied" : copied === "failed" ? "Copy failed" : "Copy";
  return { copy, label };
}

function TokenReveal({ token, onDone }: { token: string; onDone: () => void }) {
  const { copy, label } = useCopy(token);
  return (
    <section className="card border-[var(--accent)] p-6" role="alert">
      <p className="font-medium">Save your sign-in token</p>
      <p className="mt-1 text-sm text-[var(--muted)]">
        This is the only way to sign in on another device. Store it somewhere safe, like a password
        manager.
      </p>
      <code className="mt-4 block break-all rounded-md border border-[var(--line)] bg-[var(--bg)] p-3 font-mono text-xs">
        {token}
      </code>
      <div className="mt-4 flex gap-2">
        <button type="button" className="btn btn-primary" onClick={() => void copy()}>
          {label}
        </button>
        <button type="button" className="btn" onClick={onDone}>
          I&apos;ve saved it
        </button>
      </div>
    </section>
  );
}

function TokenPanel({ token }: { token: string }) {
  const [visible, setVisible] = useState(false);
  const { copy, label } = useCopy(token);
  return (
    <section className="card p-6">
      <h2 className="font-medium">Sign-in token</h2>
      <p className="mt-1 text-sm text-[var(--muted)]">Use this to sign in on another device.</p>
      <code className="mt-4 block break-all rounded-md border border-[var(--line)] bg-[var(--bg)] p-3 font-mono text-xs">
        {visible ? token : "•".repeat(32)}
      </code>
      <div className="mt-4 flex gap-2">
        <button type="button" className="btn btn-sm" onClick={() => setVisible((v) => !v)}>
          {visible ? "Hide" : "Show"}
        </button>
        <button type="button" className="btn btn-sm" onClick={() => void copy()}>
          {label}
        </button>
      </div>
    </section>
  );
}
