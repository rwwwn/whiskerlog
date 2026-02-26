"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
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
import { toast } from "@/components/ui/use-toast";

const FREQUENCIES = [
  { value: "once", label: "مرة واحدة" },
  { value: "daily", label: "يومياً" },
  { value: "twice_daily", label: "مرتين يومياً" },
  { value: "three_times_daily", label: "ثلاث مرات يومياً" },
  { value: "weekly", label: "أسبوعياً" },
  { value: "biweekly", label: "كل أسبوعين" },
  { value: "monthly", label: "شهرياً" },
  { value: "as_needed", label: "عند الحاجة" },
] as const;

const treatmentSchema = z.object({
  pet_id: z.string().uuid(),
  medication_name: z.string().min(1, "مطلوب"),
  dosage: z.string().optional(),
  frequency: z.enum([
    "once",
    "daily",
    "twice_daily",
    "three_times_daily",
    "weekly",
    "biweekly",
    "monthly",
    "as_needed",
  ]),
  start_date: z.string().min(1, "مطلوب"),
  end_date: z.string().optional(),
  total_doses: z.number().int().positive().optional().nullable(),
  prescribed_by: z.string().optional(),
  notes: z.string().max(1000).optional(),
});

type TreatmentFormValues = z.infer<typeof treatmentSchema>;

export function TreatmentForm({
  pets,
  defaultPetId,
}: {
  pets: { id: string; name: string }[];
  defaultPetId?: string;
}) {
  const t = useT();
  const router = useRouter();

  const form = useForm<TreatmentFormValues>({
    resolver: zodResolver(treatmentSchema),
    defaultValues: {
      pet_id: defaultPetId ?? pets[0]?.id ?? "",
      medication_name: "",
      dosage: "",
      frequency: "daily",
      start_date: new Date().toISOString().substring(0, 10),
      end_date: "",
      total_doses: null,
      prescribed_by: "",
      notes: "",
    },
  });

  const { isSubmitting } = form.formState;

  async function onSubmit(values: TreatmentFormValues) {
    const res = await fetch("/api/treatments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...values,
        end_date: values.end_date || null,
        total_doses: values.total_doses || null,
        prescribed_by: values.prescribed_by || null,
        notes: values.notes || null,
      }),
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

    toast({ title: t?.toast?.success ?? "تمت الإضافة" });
    router.push("/treatments");
    router.refresh();
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
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
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="medication_name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t?.treatment?.medicationName ?? "اسم الدواء"} *</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="dosage"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t?.treatment?.dosage ?? "الجرعة"}</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="مثال: 0.5 مل" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="frequency"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t?.treatment?.frequency ?? "التكرار"} *</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {FREQUENCIES.map((f) => (
                      <SelectItem key={f.value} value={f.value}>
                        {f.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <FormField
            control={form.control}
            name="start_date"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t?.labels?.startDate ?? "تاريخ البدء"} *</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="end_date"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t?.labels?.endDate ?? "تاريخ الانتهاء"}</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="total_doses"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t?.treatment?.totalDoses ?? "إجمالي الجرعات"}</FormLabel>
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
        </div>

        <FormField
          control={form.control}
          name="prescribed_by"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t?.treatment?.prescribedBy ?? "وُصف بواسطة"}</FormLabel>
              <FormControl>
                <Input {...field} placeholder="اسم الطبيب البيطري" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

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
          {t?.actions?.create ?? "إضافة خطة العلاج"}
        </Button>
      </form>
    </Form>
  );
}
