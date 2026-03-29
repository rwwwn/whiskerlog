'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { HouseholdMember, HouseholdRole } from '@/types';

interface MemberWithProfile extends HouseholdMember {
  profiles?: {
    display_name?: string | null;
    full_name?: string | null;
    avatar_url?: string | null;
    email?: string;
  };
}

interface UseHouseholdMembersReturn {
  members: MemberWithProfile[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  removeMember: (userId: string) => Promise<void>;
  updateMemberRole: (userId: string, role: HouseholdRole) => Promise<void>;
  isUpdating: boolean;
}

export function useHouseholdMembers(householdId: string | null): UseHouseholdMembersReturn {
  const supabase = createClient();
  const [members, setMembers] = useState<MemberWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  const fetchMembers = useCallback(async () => {
    if (!householdId) {
      setMembers([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('household_members')
        .select('*, profiles(display_name, full_name, avatar_url, email)')
        .eq('household_id', householdId)
        .eq('is_active', true)
        .order('is_active', { ascending: false });

      if (fetchError) throw fetchError;

      setMembers(
        (data as MemberWithProfile[])?.sort((a, b) => {
          // Sort: owners first, then members
          const roleOrder = { owner: 0, member: 1, viewer: 2 };
          return (roleOrder[a.role] ?? 3) - (roleOrder[b.role] ?? 3);
        }) || []
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch members');
      setMembers([]);
    } finally {
      setLoading(false);
    }
  }, [householdId, supabase]);

  // Initial load
  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  // Subscribe to real-time member changes
  useEffect(() => {
    if (!householdId) return;

    const channel = supabase
      .channel(`members_${householdId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'household_members',
          filter: `household_id=eq.${householdId}`,
        },
        () => {
          // Refetch on any change
          fetchMembers();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [householdId, fetchMembers, supabase]);

  const removeMember = async (userId: string) => {
    setIsUpdating(true);
    try {
      const response = await fetch(
        `/api/households/${householdId}/members/${userId}`,
        { method: 'DELETE' }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to remove member');
      }

      setMembers((prev) =>
        prev.filter((m) => m.user_id !== userId || !m.is_active)
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove member');
      throw err;
    } finally {
      setIsUpdating(false);
    }
  };

  const updateMemberRole = async (userId: string, role: HouseholdRole) => {
    setIsUpdating(true);
    try {
      const response = await fetch(
        `/api/households/${householdId}/members/${userId}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ role }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update member role');
      }

      setMembers((prev) =>
        prev.map((m) => (m.user_id === userId ? { ...m, role } : m))
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update role');
      throw err;
    } finally {
      setIsUpdating(false);
    }
  };

  const refresh = async () => {
    await fetchMembers();
  };

  return {
    members,
    loading,
    error,
    refresh,
    removeMember,
    updateMemberRole,
    isUpdating,
  };
}
