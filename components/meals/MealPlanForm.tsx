"use client";

import { useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Loader2 } from "lucide-react";
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

const DAYS = [
  { value: "0", label: "الأحد" },
  { value: "1", label: "الاثنين" },
  { value: "2", label: "الثلاثاء" },
  { value: "3", label: "الأربعاء" },
  { value: "4", label: "الخميس" },
  { value: "5", label: "الجمعة" },
  { value: "6", label: "السبت" },
];

const slotSchema = z.object({
  slot: z.string().min(1, "مطلوب"),
  time: z.string().optional(),
  food_type: z.string().min(1, "مطلوب"),
  quantity_grams: z.number().int().positive().optional().nullable(),
});

const mealPlanSchema = z.object({
  pet_id: z.string().uuid(),
  name: z.string().min(1, "مطلوب"),
  days_of_week: z.array(z.number().int().min(0).max(6)).min(1, "اختر يوماً على الأقل"),
  notes: z.string().max(1000).optional(),
  slots: z.array(slotSchema).min(1, "أضف وجبة واحدة على الأقل"),
});

type MealPlanValues = z.infer<typeof mealPlanSchema>;

export function MealPlanForm({
  pets,
  defaultPetId,
}: {
  pets: { id: string; name: string }[];
  defaultPetId?: string;
}) {
  const t = useT();
  const router = useRouter();
  const [selectedDays, setSelectedDays] = useState<number[]>([0, 1, 2, 3, 4, 5, 6]);

  const form = useForm<MealPlanValues>({
    resolver: zodResolver(mealPlanSchema),
    defaultValues: {
      pet_id: defaultPetId ?? pets[0]?.id ?? "",
      name: "",
      days_of_week: [0, 1, 2, 3, 4, 5, 6],
      notes: "",
      slots: [{ slot: "الصباح", time: "08:00", food_type: "", quantity_grams: null }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "slots",
  });

  const { isSubmitting } = form.formState;

  function toggleDay(day: number) {
    setSelectedDays((prev) => {
      const next = prev.includes(day)
        ? prev.filter((d) => d !== day)
        : [...prev, day].sort((a, b) => a - b);
      form.setValue("days_of_week", next);
      return next;
    });
  }

  async function onSubmit(values: MealPlanValues) {
    const res = await fetch("/api/meals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });

    if (!res.ok) {
      const { error } = await res.json();
      toast({ variant: "destructive", title: t?.toast?.error ?? "خطأ", description: error });
      return;
    }

    toast({ title: (t?.toast as any)?.saved ?? "تمت الإضافة" });
    router.push("/meals");
    router.refresh();
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="pet_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{(t?.labels as any)?.pet ?? "الحيوان الأليف"} *</FormLabel>
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
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{(t?.meals as any)?.planName ?? "اسم الخطة"} *</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="مثال: الروتين الأسبوعي" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Days of week */}
        <div className="space-y-2">
          <p className="text-sm font-medium text-stone-700">
            {(t?.meals as any)?.daysOfWeek ?? "أيام التطبيق"} *
          </p>
          <div className="flex flex-wrap gap-2">
            {DAYS.map((d) => (
              <button
                key={d.value}
                type="button"
                onClick={() => toggleDay(parseInt(d.value))}
                className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                  selectedDays.includes(parseInt(d.value))
                    ? "border-teal-500 bg-sage-600/20 text-sage-500"
                    : "border-stone-300 text-stone-500 hover:border-stone-300"
                }`}
              >
                {d.label}
              </button>
            ))}
          </div>
          {form.formState.errors.days_of_week && (
            <p className="text-xs text-red-500">
              {form.formState.errors.days_of_week.message}
            </p>
          )}
        </div>

        {/* Meal slots */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-stone-700">
              {(t?.meals as any)?.slots ?? "الوجبات"} *
            </p>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="gap-1 text-sage-500"
              onClick={() =>
                append({ slot: "", time: "", food_type: "", quantity_grams: null })
              }
            >
              <Plus size={14} />
              إضافة وجبة
            </Button>
          </div>

          {fields.map((field, idx) => (
            <div
              key={field.id}
              className="grid grid-cols-2 gap-3 rounded-lg border border-stone-200 bg-white p-3 sm:grid-cols-4"
            >
              <FormField
                control={form.control}
                name={`slots.${idx}.slot`}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">{(t?.meals as any)?.slotName ?? "اسم الوجبة"}</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="الصباح" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name={`slots.${idx}.time`}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">{t?.labels?.time ?? "الوقت"}</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name={`slots.${idx}.food_type`}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">{t?.meals?.foodType ?? "نوع الطعام"}</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="طعام جاف" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name={`slots.${idx}.quantity_grams`}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">{(t?.meals as any)?.grams ?? "الكمية (جم)"}</FormLabel>
                    <div className="flex items-center gap-1">
                      <FormControl>
                        <Input
                          type="number"
                          min="1"
                          value={field.value ?? ""}
                          onChange={(e) =>
                            field.onChange(
                              e.target.value ? parseInt(e.target.value) : null
                            )
                          }
                        />
                      </FormControl>
                      {fields.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="text-red-500 hover:text-red-400 shrink-0"
                          onClick={() => remove(idx)}
                        >
                          <Trash2 size={14} />
                        </Button>
                      )}
                    </div>
                  </FormItem>
                )}
              />
            </div>
          ))}
          {form.formState.errors.slots?.root && (
            <p className="text-xs text-red-500">
              {form.formState.errors.slots.root.message}
            </p>
          )}
        </div>

        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t?.labels?.notes ?? "ملاحظات"}</FormLabel>
              <FormControl>
                <Textarea {...field} rows={2} />
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
          {t?.actions?.create ?? "حفظ خطة الوجبات"}
        </Button>
      </form>
    </Form>
  );
}
