import Link from "next/link";
import { AlertTriangle, Bell, CheckCircle2 } from "lucide-react";
import type { AlertWithPet } from "@/types";
import { formatRelative, SEVERITY_COLORS } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

interface RecentAlertsProps {
  alerts: AlertWithPet[];
}

export function RecentAlerts({ alerts }: RecentAlertsProps) {
  if (alerts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-center">
        <CheckCircle2 size={32} className="mb-2 text-sage-600" />
        <p className="text-sm font-medium text-stone-700">No active alerts</p>
        <p className="text-xs text-stone-400">
          All patterns look normal for the last 7 days.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {alerts.map((alert) => (
        <div
          key={alert.id}
          className={cn(
            "flex items-start gap-3 rounded-md border p-3",
            SEVERITY_COLORS[alert.severity]
          )}
        >
          <AlertTriangle size={16} className="mt-0.5 shrink-0" />
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-medium">{alert.title}</p>
              <Badge
                variant={
                  alert.severity === "high"
                    ? "red"
                    : alert.severity === "medium"
                    ? "amber"
                    : "blue"
                }
                className="text-xs"
              >
                {alert.severity}
              </Badge>
            </div>
            <p className="mt-0.5 text-xs opacity-80 line-clamp-2">{alert.message}</p>
            <div className="mt-1.5 flex items-center justify-between">
              <span className="text-[11px] opacity-60">
                {alert.pets?.name} · {formatRelative(alert.created_at)}
              </span>
              <Link
                href="/alerts"
                className="text-[11px] font-medium underline-offset-2 hover:underline"
              >
                View all
              </Link>
            </div>
          </div>
        </div>
      ))}

      {alerts.length > 0 && (
        <div className="pt-1">
          <Link
            href="/alerts"
            className="flex items-center gap-1.5 text-xs text-stone-400 hover:text-stone-700"
          >
            <Bell size={12} />
            Manage all alerts
          </Link>
        </div>
      )}
    </div>
  );
}
