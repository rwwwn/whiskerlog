"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { Loader2 } from "lucide-react";
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
import { cn } from "@/lib/utils";
import { toast } from "@/components/ui/use-toast";

interface BehaviorType {
  id: string;
  name: string;
  slug: string;
  is_positive: boolean;
}

const behaviorSchema = z.object({
  pet_id: z.string().uuid(),
  observed_at: z.string().min(1),
  severity: z.enum(["mild", "moderate", "severe"]).optional(),
  duration_minutes: z.number().int().positive().optional().nullable(),
  notes: z.string().max(1000).optional(),
  triggers: z.string().max(500).optional(),
});

type BehaviorFormValues = z.infer<typeof behaviorSchema>;

export function BehaviorForm({
  pets,
  defaultPetId,
}: {
  pets: { id: string; name: string }[];
  defaultPetId?: string;
}) {
  const t = useT();
  const router = useRouter();
  const [behaviorTypes, setBehaviorTypes] = useState<BehaviorType[]>([]);
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);

  const form = useForm<BehaviorFormValues>({
    resolver: zodResolver(behaviorSchema),
    defaultValues: {
      pet_id: defaultPetId ?? pets[0]?.id ?? "",
      observed_at: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
      severity: undefined,
      duration_minutes: null,
      notes: "",
      triggers: "",
    },
  });

  const { isSubmitting } = form.formState;

  useEffect(() => {
    // Fetch behavior types from the DB (seeded in schema_v2.sql)
    fetch("/api/behavior/types")
      .then((r) => r.json())
      .then((json) => {
        if (json.data) setBehaviorTypes(json.data);
      })
      .catch(() => {});
  }, []);

  function toggleType(id: string) {
    setSelectedTypes((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  async function onSubmit(values: BehaviorFormValues) {
    if (selectedTypes.length === 0) {
      toast({
        variant: "destructive",
        title: t?.toast?.error ?? "خطأ",
        description: t?.behavior?.selectAtLeast ?? "اختر سلوكًا واحدًا على الأقل",
      });
      return;
    }

    const res = await fetch("/api/behavior", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...values, behavior_type_ids: selectedTypes }),
    });

    if (!res.ok) {
      const { error } = await res.json();
      toast({
        variant: "destructive",
        title: t?.toast?.error ?? "خطأ",
        description: error,
      });
      return;
    }

    toast({ title: t?.toast?.success ?? "تم التسجيل" });
    router.push("/behavior");
    router.refresh();
  }

  const negativeBehaviors = behaviorTypes.filter((b) => !b.is_positive);
  const positiveBehaviors = behaviorTypes.filter((b) => b.is_positive);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Pet + Date */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="pet_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t?.labels?.pet ?? "القطة"} *</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder={t?.labels?.selectPet ?? "اختر قطة"} />
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
          <FormField
            control={form.control}
            name="observed_at"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t?.labels?.dateTime ?? "التاريخ والوقت"} *</FormLabel>
                <FormControl>
                  <Input type="datetime-local" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Behavior type multi-select */}
        <div className="space-y-3">
          <p className="text-sm font-medium text-stone-700">
            {t?.behavior?.selectBehaviors ?? "اختر الأنماط السلوكية"} *
          </p>

          {negativeBehaviors.length > 0 && (
            <div>
              <p className="mb-2 text-xs text-stone-400">
                {t?.behavior?.negative ?? "سلوكيات سلبية"}
              </p>
              <div className="flex flex-wrap gap-2">
                {negativeBehaviors.map((bt) => (
                  <button
                    key={bt.id}
                    type="button"
                    onClick={() => toggleType(bt.id)}
                    className={cn(
                      "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                      selectedTypes.includes(bt.id)
                        ? "border-red-500 bg-red-600/20 text-red-400"
                        : "border-stone-300 text-stone-500 hover:border-stone-300"
                    )}
                  >
                    {bt.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {positiveBehaviors.length > 0 && (
            <div>
              <p className="mb-2 text-xs text-stone-400">
                {t?.behavior?.positive ?? "سلوكيات إيجابية"}
              </p>
              <div className="flex flex-wrap gap-2">
                {positiveBehaviors.map((bt) => (
                  <button
                    key={bt.id}
                    type="button"
                    onClick={() => toggleType(bt.id)}
                    className={cn(
                      "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                      selectedTypes.includes(bt.id)
                        ? "border-green-500 bg-green-600/20 text-green-400"
                        : "border-stone-300 text-stone-500 hover:border-stone-300"
                    )}
                  >
                    {bt.name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Severity */}
        <FormField
          control={form.control}
          name="severity"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t?.behavior?.severity ?? "الشدة"}</FormLabel>
              <Select onValueChange={field.onChange} value={field.value ?? ""}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder={t?.labels?.optional ?? "اختياري"} />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="mild">{t?.behavior?.mild ?? "خفيف"}</SelectItem>
                  <SelectItem value="moderate">{t?.behavior?.moderate ?? "متوسط"}</SelectItem>
                  <SelectItem value="severe">{t?.behavior?.severe ?? "شديد"}</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Duration */}
        <FormField
          control={form.control}
          name="duration_minutes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t?.behavior?.durationMinutes ?? "المدة (دقائق)"}</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  min="1"
                  value={field.value ?? ""}
                  onChange={(e) =>
                    field.onChange(e.target.value ? parseInt(e.target.value) : null)
                  }
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Triggers */}
        <FormField
          control={form.control}
          name="triggers"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t?.behavior?.triggers ?? "المحفزات"}</FormLabel>
              <FormControl>
                <Input {...field} placeholder={t?.behavior?.triggersPlaceholder ?? "مثال: زيارة الضيوف، صوت عالٍ..."} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Notes */}
        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t?.labels?.notes ?? "ملاحظات"}</FormLabel>
              <FormControl>
                <Textarea {...field} rows={3} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-sage-600 hover:bg-sage-700 text-white"
        >
          {isSubmitting && <Loader2 size={16} className="me-2 animate-spin" />}
          {t?.actions?.create ?? "تسجيل الملاحظة"}
        </Button>
      </form>
    </Form>
  );
}
