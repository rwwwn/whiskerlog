"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { format } from "date-fns";
import { Check, UtensilsCrossed } from "lucide-react";
import { Progress } from "../ui/progress";

export interface HomeMealLog {
  id: string;
  slotLabel: string;
  occurredAt: string;
  addedByName: string | null;
  addedByAvatar: string | null;
  note: string | null;
}

export interface HomeMealNextSlot {
  planId: string;
  slotLabel: string;
}

interface HomeMealProgressCardProps {
  total: number;
  completed: number;
  nextSlot: HomeMealNextSlot | null;
  logs: HomeMealLog[];
}

export function HomeMealProgressCard({
  total,
  completed,
  nextSlot,
  logs,
}: HomeMealProgressCardProps) {
  const router = useRouter();
  const [currentCompleted, setCurrentCompleted] = useState(completed);
  const [currentLogs, setCurrentLogs] = useState<HomeMealLog[]>(logs);
  const [isPending, startTransition] = useTransition();

  const percent = useMemo(() => {
    if (total <= 0) return 0;
    return Math.min(100, (currentCompleted / total) * 100);
  }, [currentCompleted, total]);

  const handleComplete = () => {
    if (!nextSlot || isPending || currentCompleted >= total) return;

    const optimisticId = `optimistic-${Date.now()}`;
    const optimisticLog: HomeMealLog = {
      id: optimisticId,
      slotLabel: nextSlot.slotLabel,
      occurredAt: new Date().toISOString(),
      addedByName: "أنت",
      addedByAvatar: null,
      note: null,
    };

    setCurrentCompleted((prev) => Math.min(prev + 1, total));
    setCurrentLogs((prev) => [optimisticLog, ...prev]);

    startTransition(async () => {
      const res = await fetch(`/api/meals/${nextSlot.planId}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slot: nextSlot.slotLabel }),
      });

      if (!res.ok) {
        setCurrentCompleted((prev) => Math.max(prev - 1, 0));
        setCurrentLogs((prev) => prev.filter((item) => item.id !== optimisticId));
        return;
      }

      router.refresh();
    });
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <UtensilsCrossed size={14} className="text-amber-500" />
          <span className="text-xs font-semibold text-stone-700">وجبات اليوم</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-stone-400">{currentCompleted}/{total}</span>
          <button
            type="button"
            onClick={handleComplete}
            disabled={isPending || !nextSlot || currentCompleted >= total}
            className={`flex h-7 w-7 items-center justify-center rounded-full border text-[11px] font-semibold transition ${
              currentCompleted >= total
                ? "border-sage-400 bg-sage-50 text-sage-700"
                : "border-amber-300 bg-amber-50 text-amber-700"
            } ${isPending ? "opacity-70" : ""}`}
            aria-label="إكمال وجبة واحدة"
          >
            <Check size={14} />
          </button>
        </div>
      </div>
      <Progress
        value={percent}
        className="h-2 bg-stone-100 [&>*]:bg-amber-400 [&>*]:transition-all"
      />

      {currentLogs.length > 0 && (
        <div className="space-y-2 pt-1">
          {currentLogs.map((log) => {
            const timeStr = format(new Date(log.occurredAt), "h:mm a");
            return (
              <div key={log.id} className="space-y-1 text-[11px] text-stone-500">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-stone-700">
                    {log.slotLabel} – {timeStr}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {log.addedByAvatar ? (
                    <Image
                      src={log.addedByAvatar}
                      alt={log.addedByName ?? ""}
                      width={20}
                      height={20}
                      className="h-5 w-5 rounded-full object-cover"
                    />
                  ) : (
                    <div className="flex h-5 w-5 items-center justify-center rounded-full bg-sage-100 text-[10px] font-bold text-sage-700">
                      {(log.addedByName ?? "أ").charAt(0)}
                    </div>
                  )}
                  <span className="text-stone-500">
                    أضيفت بواسطة: <span className="font-semibold text-stone-700">{log.addedByName ?? "أنت"}</span>
                  </span>
                </div>
                {log.note && (
                  <p className="text-stone-400">{log.note}</p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
