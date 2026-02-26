import type { Metadata } from "next";
import { SignupForm } from "@/components/auth/SignupForm";

export const metadata: Metadata = { title: "Create Account" };

export default function SignupPage() {
  return (
    <>
      <div className="mb-5">
        <h2 className="text-lg font-semibold text-zinc-100">Create account</h2>
        <p className="text-sm text-zinc-500">
          Start tracking your cat&apos;s health today
        </p>
      </div>
      <SignupForm />
    </>
  );
}
