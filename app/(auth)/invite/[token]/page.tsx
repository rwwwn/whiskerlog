'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { toast } from '@/components/ui/use-toast';

interface InviteData {
  household_id: string;
  household_name: string;
  invited_by_name: string;
  role: string;
  email: string;
  status: string;
}

export default function InvitePage({
  params,
}: {
  params: { token: string };
}) {
  const router = useRouter();
  const [inviteData, setInviteData] = useState<InviteData | null>(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    const fetchInvite = async () => {
      try {
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError || !user) {
          setError('You must be logged in to accept an invitation.');
          setLoading(false);
          return;
        }

        // Fetch invitation details
        const { data: invite, error: fetchError } = await supabase
          .from('household_invitations')
          .select(
            `
            id,
            household_id,
            role,
            email,
            status,
            expires_at,
            households (name),
            invited_by:profiles(display_name, full_name)
          `
          )
          .eq('token', params.token)
          .eq('status', 'pending')
          .single();

        if (fetchError || !invite) {
          setError('Invalid or expired invitation.');
          setLoading(false);
          return;
        }

        // Check expiry
        if (new Date(invite.expires_at) < new Date()) {
          setError('This invitation has expired.');
          setLoading(false);
          return;
        }

        // Check email match
        if (invite.email !== user.email) {
          setError(
            `This invitation was sent to ${invite.email}, but you are logged in as ${user.email}. Please log in with the correct account.`
          );
          setLoading(false);
          return;
        }

        const inviterName = (invite.invited_by as any)?.display_name ||
          (invite.invited_by as any)?.full_name || 'Someone';

        setInviteData({
          household_id: invite.household_id,
          household_name: (invite.households as any)?.name || 'Unknown Household',
          invited_by_name: inviterName,
          role: invite.role,
          email: invite.email,
          status: invite.status,
        });
      } catch (err) {
        setError('Failed to load invitation. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchInvite();
  }, [params.token, supabase]);

  const handleAccept = async () => {
    setAccepting(true);
    try {
      const response = await fetch('/api/households/accept-invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: params.token }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to accept invitation');
      }

      const { household_id } = await response.json();

      toast({
        title: 'Success!',
        description: `You've joined the household '${inviteData?.household_name}'`,
      });

      // Redirect to household page
      router.push(`/app/household/${household_id}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to accept invitation';
      setError(message);
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setAccepting(false);
    }
  };

  const handleReject = async () => {
    // For now, just redirect without accepting
    router.push('/app/dashboard');
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Invitation Error</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-red-600">{error}</p>
            <Button
              onClick={() => router.push('/app/dashboard')}
              className="w-full"
              variant="outline"
            >
              Return to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Join Household</CardTitle>
          <CardDescription>You've been invited to a pet care household</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-3 rounded-lg bg-slate-50 p-4">
            <div>
              <p className="text-sm font-medium text-slate-600">Household</p>
              <p className="text-lg font-semibold text-slate-900">
                {inviteData?.household_name}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-slate-600">Invited By</p>
              <p className="text-slate-900">{inviteData?.invited_by_name}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-slate-600">Your Role</p>
              <p className="text-slate-900 capitalize">{inviteData?.role}</p>
            </div>
          </div>

          <div className="space-y-2 text-sm text-slate-600">
            <p>
              You'll be able to view and log information for all pets in this household.
            </p>
            {inviteData?.role === 'member' && (
              <p>As a member, you can add logs and track pet health.</p>
            )}
            {inviteData?.role === 'viewer' && (
              <p>As a viewer, you can see all household data but cannot add new entries.</p>
            )}
          </div>

          <div className="flex gap-3">
            <Button
              onClick={handleAccept}
              disabled={accepting}
              className="flex-1"
            >
              {accepting ? 'Accepting...' : 'Accept Invitation'}
            </Button>
            <Button
              onClick={handleReject}
              variant="outline"
              className="flex-1"
            >
              Decline
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
