import { redirect } from "next/navigation";
import Link from "next/link";
import { isClerkEnabled, isClerkOnlyAuth } from "@/lib/clerkEnabled";

export default function SignUpPage() {
  if (isClerkEnabled() && isClerkOnlyAuth()) {
    redirect("/sign-in");
  }

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

  redirect("/sign-in");
}
