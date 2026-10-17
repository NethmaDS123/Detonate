import { SignUp } from "@clerk/nextjs";
import Link from "next/link";
import { isClerkEnabled } from "@/lib/clerkEnabled";

export default function SignUpPage() {
  if (!isClerkEnabled()) {
    return (
      <div className="mx-auto max-w-md text-center">
        <p className="text-sm text-[var(--muted)]">Clerk is not configured on this deployment.</p>
        <Link href="/account" className="btn btn-primary mt-4 inline-flex">
          Create a token account
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-md justify-center">
      <SignUp routing="path" path="/sign-up" signInUrl="/sign-in" />
    </div>
  );
}
