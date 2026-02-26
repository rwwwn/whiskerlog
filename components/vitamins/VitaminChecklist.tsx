"use client";

import { useState, useTransition } from "react";
import { format } from "date-fns";
import { arSA } from "date-fns/locale";
import { CheckCircle2, Circle, Loader2 } from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";

interface VitaminEntry {
  id: string;
  vitamin_name: string;
  pet_id: string;
  pet_name: string;
  dosage: string | null;
  frequency: string | null;
  last_given_at: string | null;
  given_today: boolean;
  pet_vitamin_id: string;
}

export function VitaminChecklist({ items }: { items: VitaminEntry[] }) {
  const [given, setGiven] = useState<Set<string>>(
    new Set(items.filter((i) => i.given_today).map((i) => i.pet_vitamin_id))
  );
  const [pending, setPending] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  async function markGiven(item: VitaminEntry) {
    if (given.has(item.pet_vitamin_id) || pending) return;
    setPending(item.pet_vitamin_id);

    const res = await fetch("/api/vitamins/log", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        pet_vitamin_id: item.pet_vitamin_id,
        pet_id: item.pet_id,
        skipped: false,
      }),
    });

    setPending(null);

    if (!res.ok) {
      const { error } = await res.json();
      toast({ variant: "destructive", title: "خطأ", description: error });
      return;
    }

    setGiven((prev) => new Set([...prev, item.pet_vitamin_id]));
  }

  if (!items.length) return null;

  // Group by pet
  const byPet = items.reduce<Record<string, { petName: string; items: VitaminEntry[] }>>(
    (acc, item) => {
      if (!acc[item.pet_id]) {
        acc[item.pet_id] = { petName: item.pet_name, items: [] };
      }
      acc[item.pet_id].items.push(item);
      return acc;
    },
    {}
  );

  return (
    <div className="space-y-6">
      {Object.entries(byPet).map(([petId, group]) => (
        <div key={petId} className="space-y-2">
          <h3 className="text-sm font-semibold text-stone-700">{group.petName}</h3>
          <div className="space-y-1.5">
            {group.items.map((item) => {
              const isDone = given.has(item.pet_vitamin_id);
              const isLoading = pending === item.pet_vitamin_id;

              return (
                <button
                  key={item.pet_vitamin_id}
                  onClick={() => startTransition(() => markGiven(item))}
                  disabled={isDone || isLoading}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-lg border px-4 py-3 text-start transition-colors",
                    isDone
                      ? "border-teal-800 bg-teal-900/20 text-stone-500 cursor-default"
                      : "border-stone-200 bg-white hover:border-stone-300"
                  )}
                >
                  {isLoading ? (
                    <Loader2 size={18} className="animate-spin text-teal-500 shrink-0" />
                  ) : isDone ? (
                    <CheckCircle2 size={18} className="text-teal-500 shrink-0" />
                  ) : (
                    <Circle size={18} className="text-stone-300 shrink-0" />
                  )}
                  <div className="flex-1">
                    <p className={cn("text-sm font-medium", isDone ? "line-through text-stone-400" : "text-stone-800")}>
                      {item.vitamin_name}
                    </p>
                    {item.dosage && (
                      <p className="text-xs text-stone-400">{item.dosage}</p>
                    )}
                  </div>
                  {item.last_given_at && !isDone && (
                    <span className="text-xs text-stone-300 shrink-0">
                      آخر جرعة:{" "}
                      {format(new Date(item.last_given_at), "d MMM", { locale: arSA })}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
