"use client";

import { useState, useTransition } from "react";
import { CheckCircle2, Circle, Loader2 } from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";

interface MealPlan {
  id: string;
  food_type: string | null;
  meals_per_day: number;
  meal_times: string[];
  pets: { name: string };
  meal_completions: Array<{
    id: string;
    completion_date: string;
    completed_slots: string[];
  }>;
}

export function MealChecklist({ plan }: { plan: MealPlan }) {
  // Find today's completion record
  const todayStr = new Date().toISOString().slice(0, 10);
  const todayRecord = plan.meal_completions.find((c) => c.completion_date === todayStr);
  const [completedSlots, setCompletedSlots] = useState<string[]>(
    (todayRecord?.completed_slots as string[]) ?? []
  );
  const [pending, setPending] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  function isCompleted(slot: string) {
    return completedSlots.includes(slot);
  }

  async function complete(slot: string) {
    if (isCompleted(slot) || pending) return;
    setPending(slot);

    const res = await fetch(`/api/meals/${plan.id}/complete`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slot }),
    });

    setPending(null);

    if (!res.ok) {
      const { error } = await res.json();
      toast({ variant: "destructive", title: "خطأ", description: error });
      return;
    }

    setCompletedSlots((prev) => [...prev, slot]);
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-medium text-stone-900">{plan.food_type ?? "وجبات يومية"}</p>
          <p className="text-xs text-stone-400">{plan.pets.name}</p>
        </div>
        <span className="text-xs text-stone-400">
          {completedSlots.length}/{plan.meal_times.length} مكتملة
        </span>
      </div>

      <div className="space-y-1.5">
        {plan.meal_times.map((slot) => {
          const done = isCompleted(slot);
          const isLoading = pending === slot;

          return (
            <button
              key={slot}
              onClick={() =>
                startTransition(() => {
                  complete(slot);
                })
              }
              disabled={done || isLoading}
              className={cn(
                "flex w-full items-center gap-3 rounded-lg border px-4 py-3 text-start transition-colors",
                done
                  ? "border-sage-200 bg-sage-50 text-stone-500 cursor-default"
                  : "border-stone-200 bg-white hover:border-stone-300"
              )}
            >
              {isLoading ? (
                <Loader2 size={18} className="animate-spin text-sage-500 shrink-0" />
              ) : done ? (
                <CheckCircle2 size={18} className="text-sage-500 shrink-0" />
              ) : (
                <Circle size={18} className="text-stone-300 shrink-0" />
              )}
              <span className={cn("text-sm font-medium flex-1 text-start", done ? "line-through text-stone-400" : "text-stone-800")}>
                {slot}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
