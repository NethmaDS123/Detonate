"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useState, type FormEvent, type ReactNode } from "react";
import { useAccount } from "@/components/AccountProvider";
import { ONBOARDING_STEPS } from "@/lib/onboardingSteps";
import { ApiError } from "@/lib/api";

const NAME_PATTERN = /^[A-Za-z0-9_]{2,24}$/;

function ModalShell({
  children,
  stepLabel,
}: {
  children: ReactNode;
  stepLabel?: string;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="onboarding-title"
    >
      <div className="card w-full max-w-md p-6 shadow-xl">
        {stepLabel ? (
          <p className="eyebrow text-[10px] text-[var(--muted)]">{stepLabel}</p>
        ) : null}
        {children}
      </div>
    </div>
  );
}

function ProfileSetup() {
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
      await register(trimmed);
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setError("That name is taken. Try another.");
      } else {
        setError("Couldn't save your username. Try again.");
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <ModalShell stepLabel="Step 1 of 2">
      <h2 id="onboarding-title" className="mt-1 text-xl font-semibold">
        Pick your username
      </h2>
      <p className="mt-2 text-sm text-[var(--muted)]">
        Shown on leaderboards when you post a verified time. You can change it later on your account
        page.
      </p>
      <form onSubmit={submit} className="mt-5 flex flex-col gap-3" noValidate>
        <label className="flex flex-col gap-1.5 text-sm">
          Username
          <input
            className="input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={24}
            autoComplete="nickname"
            placeholder="e.g. sweep_king"
            autoFocus
          />
        </label>
        {error ? <p className="text-xs text-[var(--accent)]">{error}</p> : null}
        <button type="submit" className="btn btn-primary" disabled={busy}>
          {busy ? "Saving…" : "Continue"}
        </button>
      </form>
    </ModalShell>
  );
}

function Tutorial({ onFinish }: { onFinish: () => void }) {
  const [index, setIndex] = useState(0);
  const step = ONBOARDING_STEPS[index];
  const last = index === ONBOARDING_STEPS.length - 1;

  return (
    <ModalShell stepLabel={`Tour ${index + 1} / ${ONBOARDING_STEPS.length}`}>
      <h2 id="onboarding-title" className="mt-1 text-xl font-semibold">
        {step.title}
      </h2>
      <p className="mt-3 text-sm leading-relaxed text-[var(--muted)]">{step.body}</p>
      {step.hint ? (
        <p className="mt-3 rounded-md border border-[var(--line)] bg-[var(--bg)] px-3 py-2 font-mono text-xs">
          {step.hint}
        </p>
      ) : null}
      <div className="mt-6 flex flex-wrap items-center justify-between gap-2">
        <button
          type="button"
          className="btn btn-sm"
          disabled={index === 0}
          onClick={() => setIndex((i) => Math.max(0, i - 1))}
        >
          Back
        </button>
        <div className="flex gap-1" aria-hidden>
          {ONBOARDING_STEPS.map((s, i) => (
            <span
              key={s.id}
              className={`h-1.5 w-1.5 rounded-full ${i === index ? "bg-[var(--accent)]" : "bg-[var(--line)]"}`}
            />
          ))}
        </div>
        {last ? (
          <button type="button" className="btn btn-primary btn-sm" onClick={onFinish}>
            Play today&apos;s daily
          </button>
        ) : (
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={() => setIndex((i) => i + 1)}
          >
            Next
          </button>
        )}
      </div>
    </ModalShell>
  );
}

export function OnboardingFlow() {
  const { status, completeOnboarding } = useAccount();
  const router = useRouter();

  const finish = useCallback(async () => {
    await completeOnboarding();
    router.push("/daily");
  }, [completeOnboarding, router]);

  if (status === "needs_profile") {
    return <ProfileSetup />;
  }

  if (status === "needs_onboarding") {
    return <Tutorial onFinish={() => void finish()} />;
  }

  return null;
}

/** Shown on /account when guest with Clerk-only deploy. */
export function ClerkSignInPrompt() {
  return (
    <div className="mx-auto flex max-w-md flex-col gap-6">
      <div>
        <p className="eyebrow">Account</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">Sign in to compete</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Use Google to save verified times under your username and appear on leaderboards.
        </p>
      </div>
      <section className="card flex flex-col gap-4 p-6">
        <Link href="/sign-in" className="btn btn-primary text-center">
          Continue with Google
        </Link>
        <p className="text-xs text-[var(--muted)]">
          First time here? You&apos;ll pick a username and take a quick tour after sign-in.
        </p>
      </section>
    </div>
  );
}
