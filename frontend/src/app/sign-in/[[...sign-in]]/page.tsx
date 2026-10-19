import { SignIn } from "@clerk/nextjs";
import Link from "next/link";
import { isClerkEnabled } from "@/lib/clerkEnabled";

export default function SignInPage() {
  if (!isClerkEnabled()) {
    return (
      <div className="mx-auto max-w-md text-center">
        <p className="text-sm text-[var(--muted)]">Clerk is not configured on this deployment.</p>
        <Link href="/account" className="btn btn-primary mt-4 inline-flex">
          Use token sign-in
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-md flex-col gap-4">
      <div className="text-center">
        <h1 className="text-xl font-semibold">Sign in</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Google only. New players choose a username and take a short tour after their first sign-in.
        </p>
      </div>
      <SignIn routing="path" path="/sign-in" forceRedirectUrl="/" />
    </div>
  );
}
