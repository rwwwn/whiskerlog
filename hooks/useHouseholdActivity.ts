'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';

export interface ActivityLog {
  id: string;
  household_id: string;
  user_id: string | null;
  user_name: string;
  user_avatar: string | null;
  action_type: string;
  resource_type: string;
  resource_id: string | null;
  resource_name: string;
  description: string;
  metadata: Record<string, any>;
  created_at: string;
  time_ago: string;
}

interface UseHouseholdActivityReturn {
  activities: ActivityLog[];
  loading: boolean;
  error: string | null;
  hasMore: boolean;
  loadMore: () => Promise<void>;
  refresh: () => Promise<void>;
}

export function useHouseholdActivity(
  householdId: string | null,
  limit = 50
): UseHouseholdActivityReturn {
  const supabase = createClient();
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [total, setTotal] = useState(0);

  const fetchActivities = useCallback(
    async (fetchOffset: number = 0) => {
      if (!householdId) {
        setActivities([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const response = await fetch(
          `/api/households/${householdId}/activity?limit=${limit}&offset=${fetchOffset}`
        );

        if (!response.ok) {
          throw new Error('Failed to fetch activity');
        }

        const { data, pagination } = await response.json();

        if (fetchOffset === 0) {
          setActivities(data);
        } else {
          setActivities((prev) => [...prev, ...data]);
        }

        setOffset(fetchOffset + limit);
        setTotal(pagination.total);
        setHasMore(fetchOffset + limit < pagination.total);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
        setActivities([]);
      } finally {
        setLoading(false);
      }
    },
    [householdId, limit]
  );

  // Initial load
  useEffect(() => {
    fetchActivities(0);
  }, [householdId, fetchActivities]);

  // Subscribe to real-time updates
  useEffect(() => {
    if (!householdId) return;

    const channel = supabase
      .channel(`activity_${householdId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'activity_audit_logs',
          filter: `household_id=eq.${householdId}`,
        },
        async (payload) => {
          // Fetch the full activity log with user info from the view
          const { data: newActivity, error } = await supabase
            .from('activity_feed_view' as any)
            .select('*')
            .eq('id', payload.new.id)
            .single() as any;

          if (!error && newActivity) {
            setActivities((prev) => [newActivity, ...prev]);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [householdId, supabase]);

  const loadMore = async () => {
    if (hasMore && !loading) {
      await fetchActivities(offset);
    }
  };

  const refresh = async () => {
    setOffset(0);
    setHasMore(true);
    await fetchActivities(0);
  };

  return {
    activities,
    loading,
    error,
    hasMore,
    loadMore,
    refresh,
  };
}
