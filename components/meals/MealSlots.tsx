"use client";

import { useState } from "react";
import { CheckCircle2, Circle, Loader2 } from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";

interface MealSlotsProps {
  planId: string;
  petName: string;
  mealTimes: string[];
  completedSlots: Array<string | { slot: string; completed_at: string; notes?: string }>;
}

export function MealSlots({ planId, petName, mealTimes, completedSlots }: MealSlotsProps) {
  const [pending, setPending] = useState<string | null>(null);

  // Extract slot labels from completed_slots (could be strings or objects)
  const completedLabels = new Set(
    (completedSlots ?? [])
      .map((slot) => {
        if (typeof slot === "string") return slot;
        if (typeof slot === "object" && slot.slot) return slot.slot;
        return null;
      })
      .filter((s): s is string => s !== null)
  );

  const [optimisticCompleted, setOptimisticCompleted] = useState<Set<string>>(completedLabels);

  async function completeSlot(slot: string) {
    if (optimisticCompleted.has(slot) || pending) return;

    setPending(slot);
    // Optimistic update
    setOptimisticCompleted((prev) => new Set([...prev, slot]));

    try {
      const res = await fetch(`/api/meals/${planId}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slot }),
      });

      if (!res.ok) {
        const { error } = await res.json();
        // Revert optimistic update on error
        setOptimisticCompleted((prev) => {
          const next = new Set(prev);
          next.delete(slot);
          return next;
        });
        toast({ variant: "destructive", title: "خطأ", description: error ?? "فشل تسجيل الوجبة" });
      }
    } catch (err) {
      // Revert optimistic update on error
      setOptimisticCompleted((prev) => {
        const next = new Set(prev);
        next.delete(slot);
        return next;
      });
      toast({ variant: "destructive", title: "خطأ", description: "حدث خطأ في الاتصال" });
    } finally {
      setPending(null);
    }
  }

  if (mealTimes.length === 0) return null;

  return (
    <div className="space-y-1.5 mt-2">
      {mealTimes.map((slot) => {
        const isCompleted = optimisticCompleted.has(slot);
        const isLoading = pending === slot;

        return (
          <button
            key={slot}
            onClick={() => completeSlot(slot)}
            disabled={isCompleted || isLoading}
            className={cn(
              "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium transition-colors text-start",
              isCompleted
                ? "bg-sage-50 text-stone-400 cursor-default"
                : "bg-stone-50 hover:bg-amber-50 text-stone-700 hover:text-amber-700"
            )}
          >
            {isLoading ? (
              <Loader2 size={14} className="animate-spin text-amber-500 shrink-0" />
            ) : isCompleted ? (
              <CheckCircle2 size={14} className="text-sage-500 shrink-0" />
            ) : (
              <Circle size={14} className="text-stone-300 shrink-0" />
            )}
            <span className={isCompleted ? "line-through text-stone-300" : ""}>{slot}</span>
          </button>
        );
      })}
    </div>
  );
}
