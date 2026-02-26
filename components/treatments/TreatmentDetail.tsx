"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { format, formatDistanceToNow } from "date-fns";
import { arSA } from "date-fns/locale";
import {
  CheckCircle2,
  Loader2,
  Trash2,
  PauseCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "@/components/ui/use-toast";
import { useT } from "@/lib/i18n";

interface TreatmentLog {
  id: string;
  log_date: string;
  logged_by: string | null;
  completed_items: Record<string, boolean> | null;
  notes: string | null;
}

interface TreatmentPlan {
  id: string;
  title: string;
  description: string | null;
  start_date: string;
  end_date: string | null;
  medication_schedule: Record<string, any> | null;
  notes: string | null;
  is_active: boolean;
  pets: { id: string; name: string };
  treatment_logs: TreatmentLog[];
}

const FREQ_LABELS: Record<string, string> = {
  once: "مرة واحدة",
  daily: "يومياً",
  twice_daily: "مرتين يومياً",
  three_times_daily: "ثلاث مرات يومياً",
  weekly: "أسبوعياً",
  biweekly: "كل أسبوعين",
  monthly: "شهرياً",
  as_needed: "عند الحاجة",
};

export function TreatmentDetail({ plan: initial }: { plan: TreatmentPlan }) {
  const t = useT();
  const router = useRouter();
  const [plan, setPlan] = useState(initial);
  const [logDialogOpen, setLogDialogOpen] = useState(false);
  const [logNote, setLogNote] = useState("");
  const [isPending, startTransition] = useTransition();

  const doseCount = plan.treatment_logs.length;
  const progress = null;

  async function logDose(skip: boolean) {
    const res = await fetch(`/api/treatments/${plan.id}/log`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ skipped: skip, notes: logNote || null }),
    });

    if (!res.ok) {
      const { error } = await res.json();
      toast({ variant: "destructive", title: t?.toast?.error ?? "خطأ", description: error });
      return;
    }

    const { data } = await res.json();
    setPlan((prev) => ({
      ...prev,
      treatment_logs: [data, ...prev.treatment_logs],
    }));
    setLogDialogOpen(false);
    setLogNote("");
    toast({ title: skip ? "تم تسجيل تخطي الجرعة" : "تم تسجيل الجرعة ✓" });
  }

  async function toggleActive() {
    const res = await fetch(`/api/treatments/${plan.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_active: !plan.is_active }),
    });
    if (!res.ok) return;
    const { data } = await res.json();
    setPlan((prev) => ({ ...prev, is_active: data.is_active }));
  }

  async function deletePlan() {
    if (!confirm("حذف خطة العلاج نهائياً؟")) return;
    const res = await fetch(`/api/treatments/${plan.id}`, { method: "DELETE" });
    if (!res.ok) return;
    toast({ title: "تم الحذف" });
    router.push("/treatments");
    router.refresh();
  }

  return (
    <div className="space-y-6">
      {/* Header card */}
      <div className="rounded-xl border border-stone-200 bg-white p-5 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-stone-900">{plan.title}</h2>
            <p className="text-sm text-stone-500">{plan.pets.name}</p>
          </div>
          <Badge
            className={plan.is_active ? "bg-sage-600 text-white" : "bg-stone-200"}
          >
            {plan.is_active ? "نشط" : "منتهٍ"}
          </Badge>
        </div>

        <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
          {plan.medication_schedule && (plan.medication_schedule as any).dosage && (
            <>
              <dt className="text-stone-400">الجرعة</dt>
              <dd className="text-stone-800">{(plan.medication_schedule as any).dosage}</dd>
            </>
          )}
          {plan.medication_schedule && (plan.medication_schedule as any).frequency && (
            <>
              <dt className="text-stone-400">التكرار</dt>
              <dd className="text-stone-800">{FREQ_LABELS[(plan.medication_schedule as any).frequency] ?? (plan.medication_schedule as any).frequency}</dd>
            </>
          )}
          <dt className="text-stone-400">البداية</dt>
          <dd className="text-stone-800">
            {format(new Date(plan.start_date), "d MMM yyyy", { locale: arSA })}
          </dd>
          {plan.end_date && (
            <>
              <dt className="text-stone-400">الانتهاء</dt>
              <dd className="text-stone-800">
                {format(new Date(plan.end_date), "d MMM yyyy", { locale: arSA })}
              </dd>
            </>
          )}
          {plan.medication_schedule && (plan.medication_schedule as any).prescribed_by && (
            <>
              <dt className="text-stone-400">وُصف بواسطة</dt>
              <dd className="text-stone-800">{(plan.medication_schedule as any).prescribed_by}</dd>
            </>
          )}
        </dl>

        {doseCount > 0 && (
          <p className="text-sm text-stone-500">عدد الجرعات المسجّلة: {doseCount}</p>
        )}

        {plan.notes && (
          <p className="text-sm text-stone-500 bg-stone-100 rounded-lg px-3 py-2">
            {plan.notes}
          </p>
        )}

        {/* Actions */}
        <div className="flex flex-wrap gap-2 pt-1">
          {plan.is_active && (
            <Button
              onClick={() => { setLogDialogOpen(true); }}
              className="bg-sage-600 hover:bg-sage-700 text-white gap-2"
            >
              <CheckCircle2 size={16} />
              تسجيل جرعة
            </Button>
          )}
          <Button
            variant="ghost"
            onClick={toggleActive}
            className="gap-2 text-stone-500"
          >
            <PauseCircle size={16} />
            {plan.is_active ? "إيقاف" : "إعادة تفعيل"}
          </Button>
          <Button
            variant="ghost"
            onClick={deletePlan}
            className="gap-2 text-red-500 hover:text-red-400"
          >
            <Trash2 size={16} />
            حذف
          </Button>
        </div>
      </div>

      {/* Dose log */}
      <div>
        <h3 className="mb-3 text-sm font-medium text-stone-500">سجل الجرعات</h3>
        {!plan.treatment_logs.length ? (
          <p className="text-sm text-stone-300 py-4 text-center">لم يُسجَّل أي جرعة بعد</p>
        ) : (
          <div className="space-y-2">
            {plan.treatment_logs.map((log) => (
              <div
                key={log.id}
                className="flex items-center justify-between rounded-lg border border-stone-200 bg-white px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <CheckCircle2 size={16} className="text-sage-500" />
                  <div>
                    <p className="text-sm text-stone-800">جرعة مُعطاة</p>
                    {log.notes && (
                      <p className="text-xs text-stone-400">{log.notes}</p>
                    )}
                  </div>
                </div>
                <p className="text-xs text-stone-400">
                  {formatDistanceToNow(new Date(log.log_date), {
                    addSuffix: true,
                    locale: arSA,
                  })}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Log dose dialog */}
      <Dialog open={logDialogOpen} onOpenChange={setLogDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>تسجيل جرعة</DialogTitle>
          </DialogHeader>
          <Textarea
            placeholder="ملاحظات (اختياري)"
            value={logNote}
            onChange={(e) => setLogNote(e.target.value)}
            rows={3}
          />
          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => setLogDialogOpen(false)}>
              إلغاء
            </Button>
            <Button
              onClick={() => startTransition(() => logDose(false))}
              disabled={isPending}
              className="bg-sage-600 hover:bg-sage-700 text-white"
            >
              {isPending && <Loader2 size={14} className="me-2 animate-spin" />}
              تأكيد
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
