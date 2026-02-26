"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { Loader2 } from "lucide-react";
import type { Pet } from "@/types";
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

// Matches the log_event_type enum in schema_v2.sql
export const LOG_EVENT_TYPES = [
  "fed_food",
  "gave_medication",
  "gave_vitamins",
  "grooming",
  "litter_cleaned",
  "behavior_observed",
  "vet_visit",
  "weight_recorded",
  "other",
] as const;

export type LogEventType = (typeof LOG_EVENT_TYPES)[number];

const logEntrySchema = z.object({
  pet_id: z.string().uuid("اختر قطة صالحة"),
  event_type: z.enum(LOG_EVENT_TYPES, {
    required_error: "نوع الحدث مطلوب",
  }),
  event_date: z.string().min(1, "التاريخ مطلوب"),
  quantity: z.number().nullable().optional(),
  unit: z.string().optional(),
  notes: z.string().max(1000).optional(),
  // weight_recorded extras
  weight_kg: z.number().positive().nullable().optional(),
  // vet_visit extras
  vet_name: z.string().max(120).optional(),
  clinic_name: z.string().max(120).optional(),
});

type LogEntryFormValues = z.infer<typeof logEntrySchema>;

interface LogEntryFormProps {
  pets: Pick<Pet, "id" | "name">[];
  defaultPetId?: string;
  entryId?: string;
  initialData?: Partial<LogEntryFormValues>;
}

export function LogEntryForm({
  pets,
  defaultPetId,
  entryId,
  initialData,
}: LogEntryFormProps) {
  const t = useT();
  const router = useRouter();
  const isEditing = !!entryId;

  const form = useForm<LogEntryFormValues>({
    resolver: zodResolver(logEntrySchema),
    defaultValues: {
      pet_id: defaultPetId ?? initialData?.pet_id ?? (pets[0]?.id ?? ""),
      event_type: initialData?.event_type ?? "fed_food",
      event_date:
        initialData?.event_date ?? format(new Date(), "yyyy-MM-dd'T'HH:mm"),
      quantity: initialData?.quantity ?? null,
      unit: initialData?.unit ?? "",
      notes: initialData?.notes ?? "",
      weight_kg: initialData?.weight_kg ?? null,
      vet_name: initialData?.vet_name ?? "",
      clinic_name: initialData?.clinic_name ?? "",
    },
  });

  const { isSubmitting } = form.formState;
  const eventType = form.watch("event_type");

  const eventTypeLabels: Record<LogEventType, string> = {
    fed_food: t?.logs?.eventTypes?.fed_food ?? "تغذية",
    gave_medication: t?.logs?.eventTypes?.gave_medication ?? "دواء",
    gave_vitamins: t?.logs?.eventTypes?.gave_vitamins ?? "فيتامينات",
    grooming: t?.logs?.eventTypes?.grooming ?? "عناية",
    litter_cleaned: t?.logs?.eventTypes?.litter_cleaned ?? "تنظيف صندوق",
    behavior_observed: t?.logs?.eventTypes?.behavior_observed ?? "ملاحظة سلوكية",
    vet_visit: t?.logs?.eventTypes?.vet_visit ?? "زيارة بيطري",
    weight_recorded: t?.logs?.eventTypes?.weight_recorded ?? "تسجيل وزن",
    other: t?.logs?.eventTypes?.other ?? "أخرى",
  };

  async function onSubmit(values: LogEntryFormValues) {
    const url = isEditing ? `/api/logs/${entryId}` : "/api/logs";
    const method = isEditing ? "PATCH" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
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

    toast({
      title: t?.toast?.success ?? "تم الحفظ",
    });

    router.push("/logs");
    router.refresh();
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Pet + Event Type */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="pet_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t?.labels?.pet ?? "القطة"} *</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                  disabled={isEditing}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder={t?.labels?.selectPet ?? "اختر قطة"} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {pets.map((pet) => (
                      <SelectItem key={pet.id} value={pet.id}>
                        {pet.name}
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
            name="event_type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t?.logs?.eventType ?? "نوع الحدث"} *</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder={t?.logs?.selectEventType ?? "اختر نوع الحدث"} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {LOG_EVENT_TYPES.map((et) => (
                      <SelectItem key={et} value={et}>
                        {eventTypeLabels[et]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Date + Time */}
        <FormField
          control={form.control}
          name="event_date"
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

        {/* Quantity + Unit — shown for fed_food, gave_medication, gave_vitamins */}
        {["fed_food", "gave_medication", "gave_vitamins"].includes(eventType) && (
          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="quantity"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t?.labels?.quantity ?? "الكمية"}</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.1"
                      min="0"
                      value={field.value ?? ""}
                      onChange={(e) =>
                        field.onChange(
                          e.target.value ? parseFloat(e.target.value) : null
                        )
                      }
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="unit"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t?.labels?.unit ?? "الوحدة"}</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="—" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="g">غرام (g)</SelectItem>
                      <SelectItem value="ml">مل (ml)</SelectItem>
                      <SelectItem value="tablet">قرص</SelectItem>
                      <SelectItem value="drop">قطرة</SelectItem>
                      <SelectItem value="sachet">كيس</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        )}

        {/* Weight — only for weight_recorded */}
        {eventType === "weight_recorded" && (
          <FormField
            control={form.control}
            name="weight_kg"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t?.labels?.weightKg ?? "الوزن (كغ)"}</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={field.value ?? ""}
                    onChange={(e) =>
                      field.onChange(
                        e.target.value ? parseFloat(e.target.value) : null
                      )
                    }
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        {/* Vet visit extras */}
        {eventType === "vet_visit" && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="vet_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t?.labels?.vetName ?? "اسم الطبيب"}</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="clinic_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t?.labels?.clinicName ?? "اسم العيادة"}</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        )}

        {/* Notes — always shown */}
        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t?.labels?.notes ?? "ملاحظات"}</FormLabel>
              <FormControl>
                <Textarea
                  {...field}
                  rows={3}
                  placeholder={t?.logs?.notesPlaceholder ?? "أضف ملاحظاتك هنا..."}
                />
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
          {isEditing
            ? (t?.actions?.save ?? "حفظ التعديلات")
            : (t?.actions?.create ?? "تسجيل الحدث")}
        </Button>
      </form>
    </Form>
  );
}
