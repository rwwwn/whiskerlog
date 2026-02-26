"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { CheckCircle, XCircle, Users } from "lucide-react";

interface InviteData {
  household_name: string;
  invited_by_name: string;
  role: string;
  expires_at: string;
}

export default function InvitePage() {
  const params = useParams();
  const token = params?.token as string;
  const router = useRouter();
  const supabase = createClient();

  const [invite, setInvite] = useState<InviteData | null>(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    async function fetchInvite() {
      const { data, error } = await supabase
        .from("household_invitations")
        .select(
          `
          role, expires_at, status,
          households ( name ),
          profiles!invited_by ( display_name )
        `
        )
        .eq("token", token)
        .eq("status", "pending")
        .single();

      if (error || !data) {
        setError("This invitation is invalid or has expired.");
        setLoading(false);
        return;
      }

      const expiresAt = new Date(data.expires_at);
      if (expiresAt < new Date()) {
        setError("This invitation has expired.");
        setLoading(false);
        return;
      }

      setInvite({
        household_name: (data as any).households?.name ?? "Unknown",
        invited_by_name:
          (data as any).profiles?.display_name ?? "A household member",
        role: data.role,
        expires_at: data.expires_at,
      });
      setLoading(false);
    }

    if (token) fetchInvite();
  }, [token, supabase]);

  async function handleAccept() {
    setAccepting(true);
    setError(null);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      // Redirect to login with return URL
      router.push(`/login?redirect=/invite/${token}`);
      return;
    }

    try {
      const res = await fetch("/api/households/accept-invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });

      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Failed to accept invitation.");
        return;
      }

      setSuccess(true);
      setTimeout(() => router.push("/household"), 2000);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setAccepting(false);
    }
  }

  const roleLabel: Record<string, string> = {
    owner: "مالك",
    member: "عضو",
    viewer: "مشاهد",
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-950 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-teal-600/15">
            {error ? (
              <XCircle className="h-6 w-6 text-red-400" />
            ) : success ? (
              <CheckCircle className="h-6 w-6 text-teal-400" />
            ) : (
              <Users className="h-6 w-6 text-teal-400" />
            )}
          </div>
          <CardTitle className="text-xl">
            {error
              ? "دعوة غير صالحة"
              : success
                ? "تمت الموافقة!"
                : "دعوة للانضمام"}
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          {error ? (
            <p className="text-sm text-zinc-400">{error}</p>
          ) : success ? (
            <p className="text-sm text-zinc-400">
              تم قبول الدعوة. جاري تحويلك...
            </p>
          ) : invite ? (
            <>
              <p className="text-sm text-zinc-300">
                دعاك{" "}
                <span className="font-semibold text-teal-400">
                  {invite.invited_by_name}
                </span>{" "}
                للانضمام إلى منزل{" "}
                <span className="font-semibold text-white">
                  {invite.household_name}
                </span>{" "}
                بصفة{" "}
                <span className="font-semibold text-teal-400">
                  {roleLabel[invite.role] ?? invite.role}
                </span>
                .
              </p>
              <p className="text-xs text-zinc-600">
                تنتهي صلاحية هذه الدعوة:{" "}
                {new Date(invite.expires_at).toLocaleDateString("ar-SA")}
              </p>
              <Button
                onClick={handleAccept}
                disabled={accepting}
                className="w-full bg-teal-600 hover:bg-teal-700 text-white"
              >
                {accepting ? "جاري القبول..." : "قبول الدعوة"}
              </Button>
              <Button
                variant="ghost"
                className="w-full text-zinc-400"
                onClick={() => router.push("/")}
              >
                رفض
              </Button>
            </>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
