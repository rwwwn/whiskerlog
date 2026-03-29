'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { useHouseholdActivity } from '@/hooks/useHouseholdActivity';
import { ChevronDown } from 'lucide-react';
import { useCallback } from 'react';

interface ActivityFeedProps {
  householdId: string | null;
}

export function ActivityFeed({ householdId }: ActivityFeedProps) {
  const { activities, loading, error, hasMore, loadMore, refresh } =
    useHouseholdActivity(householdId);

  const handleLoadMore = useCallback(async () => {
    await loadMore();
  }, [loadMore]);

  if (loading && activities.length === 0) {
    return (
      <div className="flex justify-center py-8">
        <LoadingSpinner />
      </div>
    );
  }

  if (error && activities.length === 0) {
    return (
      <div className="rounded-lg bg-red-50 p-4 text-sm text-red-700">
        {error}
        <Button
          size="sm"
          variant="outline"
          onClick={() => refresh()}
          className="ml-2"
        >
          Retry
        </Button>
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-8 text-center">
        <p className="text-sm text-slate-500">No activity yet</p>
      </div>
    );
  }

  const getActionIcon = (actionType: string): string => {
    const icons: Record<string, string> = {
      fed_pet: '🍽️',
      gave_medication: '💊',
      observed_behavior: '👁️',
      medical_visit: '🏥',
      added_member: '👥',
      removed_member: '❌',
    };
    return icons[actionType] || '📝';
  };

  return (
    <div className="space-y-4">
      {/* Timeline */}
      <div className="space-y-3">
        {activities.map((activity, idx) => {
          const isLast = idx === activities.length - 1;

          return (
            <div key={activity.id} className="relative">
              {/* Timeline line */}
              {!isLast && (
                <div className="absolute left-6 top-12 h-6 w-0.5 bg-slate-200" />
              )}

              {/* Activity card */}
              <div className="flex gap-4">
                {/* Avatar + icon */}
                <div className="relative flex-shrink-0">
                  <Avatar className="h-12 w-12 border-2 border-white shadow-sm">
                    <AvatarImage
                      src={activity.user_avatar || undefined}
                      alt={activity.user_name}
                    />
                    <AvatarFallback>
                      {activity.user_name?.charAt(0) || '?'}
                    </AvatarFallback>
                  </Avatar>
                  {/* Small icon overlay */}
                  <div className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-slate-100 text-xs">
                    {getActionIcon(activity.action_type)}
                  </div>
                </div>

                {/* Content */}
                <div className="flex-1 space-y-1 rounded-lg bg-slate-50 p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-slate-900">
                        {activity.user_name}
                      </p>
                      <p className="text-sm text-slate-700">
                        {activity.description}
                      </p>
                    </div>
                    <p className="flex-shrink-0 text-xs text-slate-500">
                      {activity.time_ago}
                    </p>
                  </div>

                  {/* Optional metadata display */}
                  {activity.metadata && Object.keys(activity.metadata).length > 0 && (
                    <div className="text-xs text-slate-600">
                      {activity.metadata.food_type && (
                        <p>{activity.metadata.food_type}</p>
                      )}
                      {activity.metadata.severity && (
                        <p className="capitalize">
                          Severity: {activity.metadata.severity}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Load more button */}
      {hasMore && (
        <div className="flex justify-center pt-4">
          <Button
            onClick={handleLoadMore}
            variant="outline"
            size="sm"
            disabled={loading}
            className="gap-2"
          >
            <ChevronDown className="h-4 w-4" />
            Load More
          </Button>
        </div>
      )}
    </div>
  );
}
