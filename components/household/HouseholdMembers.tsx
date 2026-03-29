'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { useHouseholdMembers } from '@/hooks/useHouseholdMembers';
import { MoreVertical, Trash2, Shield } from 'lucide-react';
import { useState } from 'react';
import { toast } from '@/components/ui/use-toast';
import type { HouseholdRole } from '@/types';

interface HouseholdMembersProps {
  householdId: string;
  currentUserId?: string;
  isOwner?: boolean;
}

export function HouseholdMembers({
  householdId,
  currentUserId,
  isOwner,
}: HouseholdMembersProps) {
  const { members, loading, error, removeMember, updateMemberRole, isUpdating } =
    useHouseholdMembers(householdId);

  const [menuOpen, setMenuOpen] = useState<string | null>(null);

  const handleRemoveMember = async (userId: string) => {
    const member = members.find((m) => m.user_id === userId);
    const memberName =
      member?.profiles?.display_name ||
      member?.profiles?.full_name ||
      'Member';

    try {
      await removeMember(userId);
      toast({
        title: 'Member removed',
        description: `${memberName} has been removed from the household.`,
      });
    } catch (err) {
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to remove member',
        variant: 'destructive',
      });
    } finally {
      setMenuOpen(null);
    }
  };

  const handlePromoteToMember = async (userId: string) => {
    try {
      await updateMemberRole(userId, 'member');
      toast({
        title: 'Role updated',
        description: 'Member role has been updated.',
      });
    } catch (err) {
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to update role',
        variant: 'destructive',
      });
    } finally {
      setMenuOpen(null);
    }
  };

  const handleDemoteToViewer = async (userId: string) => {
    try {
      await updateMemberRole(userId, 'viewer');
      toast({
        title: 'Role updated',
        description: 'Member role has been updated.',
      });
    } catch (err) {
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to update role',
        variant: 'destructive',
      });
    } finally {
      setMenuOpen(null);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg bg-red-50 p-4 text-sm text-red-700">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {members.map((member) => (
          <div
            key={member.user_id}
            className="flex items-center justify-between rounded-lg border p-4"
          >
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <Avatar>
                <AvatarImage
                  src={member.profiles?.avatar_url || undefined}
                  alt={member.profiles?.display_name || 'Member'}
                />
                <AvatarFallback>
                  {(member.profiles?.display_name ?? 'M').charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="font-medium truncate">
                  {member.profiles?.display_name ||
                    member.profiles?.full_name ||
                    'Unknown'}
                </p>
                <p className="text-xs text-slate-500 truncate">
                  {member.profiles?.email}
                </p>
                <div className="mt-1 flex items-center gap-2">
                  <Badge variant="outline" className="text-xs capitalize">
                    {member.role}
                  </Badge>
                  {currentUserId === member.user_id && (
                    <Badge className="text-xs">You</Badge>
                  )}
                </div>
              </div>
            </div>

            {isOwner && currentUserId !== member.user_id && (
              <DropdownMenu open={menuOpen === member.user_id} onOpenChange={(open) => setMenuOpen(open ? member.user_id : null)}>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={isUpdating}
                    className="ml-2"
                  >
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Actions</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {member.role === 'viewer' && (
                    <DropdownMenuItem onClick={() => handlePromoteToMember(member.user_id)}>
                      <Shield className="mr-2 h-4 w-4" />
                      Promote to Member
                    </DropdownMenuItem>
                  )}
                  {member.role === 'member' && (
                    <DropdownMenuItem onClick={() => handleDemoteToViewer(member.user_id)}>
                      <Shield className="mr-2 h-4 w-4" />
                      Demote to Viewer
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => handleRemoveMember(member.user_id)}
                    className="text-red-600"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Remove
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        ))}
      </div>

      {members.length === 0 && (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <p className="text-sm text-slate-500">No members yet</p>
        </div>
      )}
    </div>
  );
}
