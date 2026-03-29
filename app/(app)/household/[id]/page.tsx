'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useHousehold } from '@/hooks/useHousehold';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { InviteMemberModal } from '@/components/household/InviteMemberModal';
import { HouseholdMembers } from '@/components/household/HouseholdMembers';
import { ActivityFeed } from '@/components/household/ActivityFeed';
import { UserPlus } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

interface HouseholdPageProps {
  params: { id: string };
}

export default function HouseholdPage({ params }: HouseholdPageProps) {
  const router = useRouter();
  const supabase = createClient();
  const { activeHousehold, isOwner, loading: contextLoading } = useHousehold();
  const [loading, setLoading] = useState(true);
  const [household, setHousehold] = useState<any>(null);
  const [userRole, setUserRole] = useState<'owner' | 'member' | 'viewer' | null>(null);
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchHousehold = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          setCurrentUserId(user.id);
        }

        const response = await fetch(`/api/households/${params.id}`);

        if (!response.ok) {
          if (response.status === 403) {
            setError('You are not a member of this household');
            router.push('/app/dashboard');
            return;
          }
          throw new Error('Failed to fetch household');
        }

        const { data } = await response.json();
        setHousehold(data.household);
        setUserRole(data.userRole);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchHousehold();
  }, [params.id, supabase, router]);

  if (contextLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4">
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="text-red-900">Error</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-red-800">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!household) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-slate-500">Household not found</p>
      </div>
    );
  }

  return (
    <>
      <PageHeader
        title={household.name}
        description={household.description || 'Manage household members and view activity'}
      />

      <div className="space-y-6">
        {/* Household Info Card */}
        <Card>
          <CardHeader>
            <CardTitle>Household Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-sm font-medium text-slate-600">Household Name</p>
                <p className="text-lg font-semibold">{household.name}</p>
              </div>
              {household.description && (
                <div>
                  <p className="text-sm font-medium text-slate-600">Description</p>
                  <p className="text-sm text-slate-700">{household.description}</p>
                </div>
              )}
              <div>
                <p className="text-sm font-medium text-slate-600">Your Role</p>
                <p className="text-sm capitalize font-medium text-slate-900">
                  {userRole}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-slate-600">Created</p>
                <p className="text-sm text-slate-700">
                  {new Date(household.created_at).toLocaleDateString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs defaultValue="members" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="members">Members</TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
          </TabsList>

          {/* Members Tab */}
          <TabsContent value="members" className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Household Members</CardTitle>
                  <CardDescription>
                    Manage members and their access levels
                  </CardDescription>
                </div>
                {userRole === 'owner' && (
                  <Button
                    onClick={() => setInviteModalOpen(true)}
                    className="gap-2"
                    size="sm"
                  >
                    <UserPlus className="h-4 w-4" />
                    Invite Member
                  </Button>
                )}
              </CardHeader>
              <CardContent>
                <HouseholdMembers
                  householdId={params.id}
                  currentUserId={currentUserId || undefined}
                  isOwner={userRole === 'owner'}
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Activity Tab */}
          <TabsContent value="activity" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Household Activity</CardTitle>
                <CardDescription>
                  Recent actions by household members
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ActivityFeed householdId={params.id} />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Invite Modal */}
      <InviteMemberModal
        householdId={params.id}
        open={inviteModalOpen}
        onOpenChange={setInviteModalOpen}
      />
    </>
  );
}
