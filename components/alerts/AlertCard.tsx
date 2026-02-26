"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCheck, AlertTriangle, Clock, ChevronDown, ChevronUp } from "lucide-react";
import type { AlertWithPet } from "@/types";
import { formatDate } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/use-toast";

interface AlertCardProps {
  alert: AlertWithPet;
}

const SEVERITY_BORDER: Record<string, string> = {
  low:    "border-blue-200 bg-blue-50",
  medium: "border-amber-200 bg-amber-50",
  high:   "border-red-200 bg-red-50",
};

const SEVERITY_ICON: Record<string, string> = {
  low:    "text-blue-500",
  medium: "text-amber-500",
  high:   "text-red-500",
};

const SEVERITY_BADGE: Record<string, string> = {
  low:    "bg-blue-100 text-blue-700",
  medium: "bg-amber-100 text-amber-700",
  high:   "bg-red-100 text-red-700 animate-pulse",
};

const SEVERITY_LABELS_AR: Record<string, string> = {
  low:    "منخفض",
  medium: "متوسط",
  high:   "عالٍ",
};

export function AlertCard({ alert }: AlertCardProps) {
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);
  const [resolving, setResolving] = useState(false);

  async function handleResolve() {
    setResolving(true);
    const res = await fetch(`/api/alerts/${alert.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_resolved: true }),
    });

    if (!res.ok) {
      toast({ variant: "destructive", title: "تعذّر تعيين التنبيه كمُعالَج" });
      setResolving(false);
      return;
    }

    toast({ title: "تم تعيين التنبيه كمُعالَج" });
    router.refresh();
  }

  const isResolved = alert.is_resolved;
  const severityKey = (alert.severity ?? "low") as string;

  return (
    <div
      className={cn(
        "rounded-2xl border p-4 transition-colors",
        isResolved
          ? "border-stone-200 bg-white/60 opacity-60"
          : SEVERITY_BORDER[severityKey] ?? "border-stone-200 bg-white"
      )}
    >
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className="mt-0.5 shrink-0">
          {isResolved ? (
            <CheckCheck size={18} className="text-sage-600" />
          ) : (
            <AlertTriangle
              size={18}
              className={SEVERITY_ICON[severityKey] ?? "text-stone-500"}
            />
          )}
        </div>

        {/* Content */}
        <div className="min-w-0 flex-1">
          {/* Title row */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold text-stone-900">
              {alert.title}
            </span>
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-[10px] font-bold",
                isResolved
                  ? "bg-stone-100 text-stone-500"
                  : SEVERITY_BADGE[severityKey]
              )}
            >
              {isResolved ? "مُعالَج" : SEVERITY_LABELS_AR[severityKey] ?? severityKey}
            </span>
          </div>

          {/* Message */}
          <p
            className={cn(
              "mt-1 text-xs text-stone-600 leading-relaxed",
              !expanded && "line-clamp-2"
            )}
          >
            {alert.message}
          </p>

          {/* Footer meta */}
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="flex items-center gap-1 text-[11px] text-stone-400">
              <Clock size={10} />
              {formatDate(alert.created_at)}
            </span>
            {alert.pets?.name && (
              <span className="text-[11px] text-stone-400">· {alert.pets.name}</span>
            )}
            <button
              onClick={() => setExpanded((v) => !v)}
              className="mr-auto flex items-center gap-0.5 text-[11px] text-stone-400 active:text-stone-600"
              aria-label={expanded ? "عرض أقل" : "عرض المزيد"}
            >
              {expanded ? (
                <><span>أقل</span><ChevronUp size={10} /></>
              ) : (
                <><span>المزيد</span><ChevronDown size={10} /></>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Resolve button — only on active alerts */}
      {!isResolved && (
        <div className="mt-3 flex justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={handleResolve}
            disabled={resolving}
            className="h-8 gap-1.5 rounded-xl border-current text-xs"
          >
            <CheckCheck size={13} />
            {resolving ? "جاري المعالجة..." : "تعيين كمُعالَج"}
          </Button>
        </div>
      )}
    </div>
  );
}
