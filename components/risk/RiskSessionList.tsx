"use client";

import { useState } from "react";
import Link from "next/link";
import { RiskSessionCard } from "./RiskSessionCard";
import { Button } from "@/components/ui/button";
import { AlertTriangle, PlusCircle } from "lucide-react";

interface RiskSession {
  id: string;
  pet_id: string;
  severity: "low" | "medium" | "high";
  symptoms: string[];
  notes: string | null;
  is_active: boolean;
  started_at: string;
  resolved_at: string | null;
  pets: { name: string };
}

export function RiskSessionList({ initialSessions }: { initialSessions: RiskSession[] }) {
  const [sessions, setSessions] = useState(initialSessions);

  function handleResolved(id: string) {
    setSessions((prev) => prev.filter((s) => s.id !== id));
  }

  function handleDeleted(id: string) {
    setSessions((prev) => prev.filter((s) => s.id !== id));
  }

  if (!sessions.length) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-24 text-stone-400">
        <AlertTriangle size={48} className="opacity-30" />
        <p>لا توجد جلسات مراقبة نشطة</p>
        <Link href="/risk/new">
          <Button variant="outline">بدء جلسة مراقبة</Button>
        </Link>
      </div>
    );
  }

  // Sort: high → medium → low
  const sorted = [...sessions].sort((a, b) => {
    const order = { high: 0, medium: 1, low: 2 };
    return order[a.severity] - order[b.severity];
  });

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {sorted.map((s) => (
        <RiskSessionCard
          key={s.id}
          session={s}
          onResolved={handleResolved}
          onDeleted={handleDeleted}
        />
      ))}
    </div>
  );
}
