import type { Metadata } from "next";
import { LoginForm } from "@/components/auth/LoginForm";

export const metadata: Metadata = { title: "Sign In" };

export default function LoginPage() {
  return (
    <>
      <div className="mb-5">
        <h2 className="text-lg font-semibold text-zinc-100">Sign in</h2>
        <p className="text-sm text-zinc-500">
          Enter your credentials to continue
        </p>
      </div>
      <LoginForm />
    </>
  );
}
