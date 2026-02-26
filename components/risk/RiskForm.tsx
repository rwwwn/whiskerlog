"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { Plus, X, Loader2 } from "lucide-react";
import { useT } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { toast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";

const COMMON_SYMPTOMS = [
  "فقدان الشهية",
  "قيء",
  "إسهال",
  "خمول",
  "عطش مفرط",
  "صعوبة في التنفس",
  "حكة",
  "عطس متكرر",
  "إفرازات من العين",
  "إفرازات من الأنف",
  "ارتفاع درجة الحرارة",
  "فقدان الوزن",
  "اضطراب في المشي",
  "نزيف",
];

const riskSchema = z.object({
  pet_id: z.string().uuid(),
  severity: z.enum(["low", "medium", "high"]),
  notes: z.string().max(1000).optional(),
});

type RiskFormValues = z.infer<typeof riskSchema>;

export function RiskForm({
  pets,
  defaultPetId,
}: {
  pets: { id: string; name: string }[];
  defaultPetId?: string;
}) {
  const t = useT();
  const router = useRouter();
  const [symptoms, setSymptoms] = useState<string[]>([]);
  const [customSymptom, setCustomSymptom] = useState("");

  const form = useForm<RiskFormValues>({
    resolver: zodResolver(riskSchema),
    defaultValues: {
      pet_id: defaultPetId ?? pets[0]?.id ?? "",
      severity: "medium",
      notes: "",
    },
  });

  const { isSubmitting } = form.formState;
  const severity = form.watch("severity");

  function toggleSymptom(s: string) {
    setSymptoms((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]
    );
  }

  function addCustom() {
    const trimmed = customSymptom.trim();
    if (!trimmed || symptoms.includes(trimmed)) return;
    setSymptoms((prev) => [...prev, trimmed]);
    setCustomSymptom("");
  }

  async function onSubmit(values: RiskFormValues) {
    if (!symptoms.length) {
      toast({
        variant: "destructive",
        title: "خطأ",
        description: "أضف عرضاً واحداً على الأقل",
      });
      return;
    }

    const res = await fetch("/api/risk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...values, symptoms }),
    });

    if (!res.ok) {
      const { error } = await res.json();
      toast({ variant: "destructive", title: "خطأ", description: error });
      return;
    }

    toast({ title: "تم بدء جلسة المراقبة" });
    router.push("/risk");
    router.refresh();
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="pet_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t?.labels?.pet ?? "القطة"} *</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {pets.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Severity */}
        <FormField
          control={form.control}
          name="severity"
          render={({ field }) => (
            <FormItem>
              <FormLabel>مستوى الخطورة *</FormLabel>
              <div className="grid grid-cols-3 gap-3">
                {(["low", "medium", "high"] as const).map((level) => (
                  <button
                    key={level}
                    type="button"
                    onClick={() => field.onChange(level)}
                    className={cn(
                      "rounded-lg border py-3 text-center text-sm font-medium transition-colors",
                      field.value === level
                        ? level === "high"
                          ? "border-red-500 bg-red-600/20 text-red-400"
                          : level === "medium"
                          ? "border-amber-500 bg-amber-600/20 text-amber-400"
                          : "border-green-500 bg-green-600/20 text-green-400"
                        : "border-stone-300 text-stone-500 hover:border-stone-300"
                    )}
                  >
                    {level === "high" ? "عالٍ 🔴" : level === "medium" ? "متوسط 🟡" : "منخفض 🟢"}
                  </button>
                ))}
              </div>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Symptoms */}
        <div className="space-y-3">
          <p className="text-sm font-medium text-stone-700">الأعراض *</p>

          <div className="flex flex-wrap gap-2">
            {COMMON_SYMPTOMS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => toggleSymptom(s)}
                className={cn(
                  "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                  symptoms.includes(s)
                    ? "border-red-500 bg-red-600/20 text-red-400"
                    : "border-stone-300 text-stone-500 hover:border-stone-300"
                )}
              >
                {s}
              </button>
            ))}
          </div>

          {/* Custom symptom input */}
          <div className="flex gap-2">
            <Input
              value={customSymptom}
              onChange={(e) => setCustomSymptom(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addCustom())}
              placeholder="عرض مخصص..."
              className="text-sm"
            />
            <Button type="button" variant="outline" size="icon" onClick={addCustom}>
              <Plus size={16} />
            </Button>
          </div>

          {/* Selected symptoms */}
          {symptoms.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {symptoms.map((s) => (
                <span
                  key={s}
                  className="flex items-center gap-1 rounded-full bg-red-600/20 border border-red-800 px-2.5 py-0.5 text-xs text-red-400"
                >
                  {s}
                  <button
                    type="button"
                    onClick={() => toggleSymptom(s)}
                    className="hover:text-red-300"
                  >
                    <X size={10} />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t?.labels?.notes ?? "ملاحظات"}</FormLabel>
              <FormControl>
                <Textarea {...field} rows={3} placeholder="وصف إضافي للحالة..." />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button
          type="submit"
          disabled={isSubmitting}
          className={cn(
            "w-full text-white",
            severity === "high"
              ? "bg-red-600 hover:bg-red-700"
              : severity === "medium"
              ? "bg-amber-600 hover:bg-amber-700"
              : "bg-sage-600 hover:bg-sage-700"
          )}
        >
          {isSubmitting && <Loader2 size={16} className="me-2 animate-spin" />}
          بدء المراقبة
        </Button>
      </form>
    </Form>
  );
}
