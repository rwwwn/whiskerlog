"use client";

import { useState, useEffect, useTransition } from "react";
import { formatDistanceToNow } from "date-fns";
import { arSA } from "date-fns/locale";
import { AlertTriangle, CheckCircle, Trash2, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";

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

function RiskTimer({ startedAt }: { startedAt: string }) {
  const [elapsed, setElapsed] = useState("");

  useEffect(() => {
    function tick() {
      if (!startedAt) return;
      const d = new Date(startedAt);
      if (isNaN(d.getTime())) return;
      setElapsed(
        formatDistanceToNow(d, {
          addSuffix: false,
          locale: arSA,
        })
      );
    }
    tick();
    const id = setInterval(tick, 30_000);
    return () => clearInterval(id);
  }, [startedAt]);

  return <span className="font-mono text-xs tabular-nums">{elapsed}</span>;
}

const SEVERITY_LABELS = { low: "منخفض", medium: "متوسط", high: "عالٍ" };
const SEVERITY_BADGE: Record<string, string> = {
  low: "bg-risk-low/20 text-green-400 border-green-800",
  medium: "bg-risk-medium/20 text-amber-400 border-amber-800",
  high: "bg-risk-high/20 text-red-400 border-red-800 animate-pulse-risk",
};
const GLOW_CLASS: Record<string, string> = {
  low: "border-green-800",
  medium: "risk-glow-medium",
  high: "risk-glow-high",
};

export function RiskSessionCard({ session: initial, onResolved, onDeleted }: {
  session: RiskSession;
  onResolved: (id: string) => void;
  onDeleted: (id: string) => void;
}) {
  const [session, setSession] = useState(initial);
  const [closeDialogOpen, setCloseDialogOpen] = useState(false);
  const [closeNote, setCloseNote] = useState("");
  const [isPending, startTransition] = useTransition();

  async function closeSession() {
    const res = await fetch(`/api/risk/${session.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        is_active: false,
        notes: closeNote || session.notes,
      }),
    });

    if (!res.ok) {
      toast({ variant: "destructive", title: "خطأ", description: "تعذر إغلاق الجلسة" });
      return;
    }

    setCloseDialogOpen(false);
    toast({ title: "تم إغلاق جلسة المراقبة" });
    onResolved(session.id);
  }

  async function deleteSession() {
    if (!confirm("حذف هذه الجلسة نهائياً؟")) return;
    const res = await fetch(`/api/risk/${session.id}`, { method: "DELETE" });
    if (!res.ok) return;
    toast({ title: "تم الحذف" });
    onDeleted(session.id);
  }

  return (
    <>
      <div
        className={cn(
          "rounded-xl border bg-white p-4 space-y-3 transition-all",
          GLOW_CLASS[session.severity] ?? "border-stone-200"
        )}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <AlertTriangle
              size={18}
              className={
                session.severity === "high"
                  ? "text-red-500 animate-pulse"
                  : session.severity === "medium"
                  ? "text-amber-500"
                  : "text-green-500"
              }
            />
            <div>
              <p className="font-semibold text-stone-900">{session.pets.name}</p>
              <p className="text-xs text-stone-400 flex items-center gap-1">
                منذ <RiskTimer startedAt={session.started_at} />
              </p>
            </div>
          </div>
          <Badge
            className={cn(
              "border text-xs",
              SEVERITY_BADGE[session.severity]
            )}
          >
            {SEVERITY_LABELS[session.severity]}
          </Badge>
        </div>

        {session.symptoms.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {session.symptoms.map((s) => (
              <span
                key={s}
                className="rounded-full bg-stone-100 px-2 py-0.5 text-xs text-stone-700"
              >
                {s}
              </span>
            ))}
          </div>
        )}

        {session.notes && (
          <p className="text-xs text-stone-500">{session.notes}</p>
        )}

        <div className="flex gap-2 pt-1">
          <Button
            size="sm"
            onClick={() => setCloseDialogOpen(true)}
            className="gap-2 bg-sage-600 hover:bg-sage-700 text-white"
          >
            <CheckCircle size={14} />
            إغلاق الجلسة
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={deleteSession}
            className="gap-2 text-red-500 hover:text-red-400"
          >
            <Trash2 size={14} />
          </Button>
        </div>
      </div>

      <Dialog open={closeDialogOpen} onOpenChange={setCloseDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>إغلاق جلسة المراقبة</DialogTitle>
          </DialogHeader>
          <Textarea
            placeholder="ملاحظات الخاتمة (اختياري)"
            value={closeNote}
            onChange={(e) => setCloseNote(e.target.value)}
            rows={3}
          />
          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => setCloseDialogOpen(false)}>
              إلغاء
            </Button>
            <Button
              onClick={() => startTransition(closeSession)}
              disabled={isPending}
              className="bg-sage-600 hover:bg-sage-700 text-white"
            >
              {isPending && <Loader2 size={14} className="me-2 animate-spin" />}
              تأكيد
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
