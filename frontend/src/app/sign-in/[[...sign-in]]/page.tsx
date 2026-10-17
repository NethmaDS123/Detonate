import { SignIn } from "@clerk/nextjs";
import { isClerkEnabled } from "@/lib/clerkEnabled";
import Link from "next/link";

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
    <div className="mx-auto flex max-w-md justify-center">
      <SignIn routing="path" path="/sign-in" signUpUrl="/sign-up" />
    </div>
  );
}
