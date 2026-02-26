"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { Loader2, Plus, Trash2 } from "lucide-react";
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

const medicalSchema = z.object({
  pet_id: z.string().uuid(),
  record_date: z.string().min(1),
  vet_name: z.string().max(120).optional(),
  clinic_name: z.string().max(120).optional(),
  diagnosis: z.string().max(500).optional(),
  treatment: z.string().max(1000).optional(),
  notes: z.string().max(2000).optional(),
  follow_up_date: z.string().optional().nullable(),
});

type MedicalFormValues = z.infer<typeof medicalSchema>;

interface MedicationRow {
  name: string;
  dosage: string;
  frequency: string;
  duration_days: string;
}

interface MedicalFormProps {
  pets: { id: string; name: string }[];
  defaultPetId?: string;
  recordId?: string;
  initialData?: Partial<MedicalFormValues>;
}

export function MedicalForm({
  pets,
  defaultPetId,
  recordId,
  initialData,
}: MedicalFormProps) {
  const t = useT();
  const router = useRouter();
  const isEditing = !!recordId;

  const [medications, setMedications] = useState<MedicationRow[]>([]);

  const form = useForm<MedicalFormValues>({
    resolver: zodResolver(medicalSchema),
    defaultValues: {
      pet_id: defaultPetId ?? initialData?.pet_id ?? (pets[0]?.id ?? ""),
      record_date: initialData?.record_date ?? format(new Date(), "yyyy-MM-dd"),
      vet_name: initialData?.vet_name ?? "",
      clinic_name: initialData?.clinic_name ?? "",
      diagnosis: initialData?.diagnosis ?? "",
      treatment: initialData?.treatment ?? "",
      notes: initialData?.notes ?? "",
      follow_up_date: initialData?.follow_up_date ?? null,
    },
  });

  const { isSubmitting } = form.formState;

  function addMedication() {
    setMedications((prev) => [
      ...prev,
      { name: "", dosage: "", frequency: "", duration_days: "" },
    ]);
  }

  function removeMedication(idx: number) {
    setMedications((prev) => prev.filter((_, i) => i !== idx));
  }

  function updateMedication(
    idx: number,
    field: keyof MedicationRow,
    value: string
  ) {
    setMedications((prev) =>
      prev.map((m, i) => (i === idx ? { ...m, [field]: value } : m))
    );
  }

  async function onSubmit(values: MedicalFormValues) {
    const url = isEditing ? `/api/medical/${recordId}` : "/api/medical";
    const method = isEditing ? "PATCH" : "POST";

    const prescribedMedications = medications
      .filter((m) => m.name.trim())
      .map((m) => ({
        name: m.name,
        dosage: m.dosage,
        frequency: m.frequency,
        ...(m.duration_days && { duration_days: parseInt(m.duration_days) }),
      }));

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...values,
        prescribed_medications:
          prescribedMedications.length > 0 ? prescribedMedications : undefined,
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

    toast({ title: t?.toast?.success ?? "تم الحفظ" });
    router.push("/medical");
    router.refresh();
  }

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
            name="record_date"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t?.labels?.date ?? "التاريخ"} *</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Vet + Clinic */}
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

        {/* Diagnosis */}
        <FormField
          control={form.control}
          name="diagnosis"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t?.medical?.diagnosis ?? "التشخيص"}</FormLabel>
              <FormControl>
                <Input {...field} placeholder={t?.medical?.diagnosisPlaceholder ?? "مثال: التهاب في الأذن"} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Treatment */}
        <FormField
          control={form.control}
          name="treatment"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t?.medical?.treatment ?? "العلاج الموصوف"}</FormLabel>
              <FormControl>
                <Textarea {...field} rows={3} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Prescribed medications */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-stone-700">
              {t?.medical?.prescribedMedications ?? "الأدوية الموصوفة"}
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addMedication}
              className="gap-1.5"
            >
              <Plus size={13} />
              {t?.actions?.addMedication ?? "إضافة دواء"}
            </Button>
          </div>
          {medications.map((med, idx) => (
            <div
              key={idx}
              className="grid grid-cols-2 gap-3 rounded-lg border border-stone-200 p-3"
            >
              <Input
                placeholder={t?.labels?.medicationName ?? "اسم الدواء"}
                value={med.name}
                onChange={(e) => updateMedication(idx, "name", e.target.value)}
              />
              <Input
                placeholder={t?.labels?.dosage ?? "الجرعة"}
                value={med.dosage}
                onChange={(e) =>
                  updateMedication(idx, "dosage", e.target.value)
                }
              />
              <Input
                placeholder={t?.labels?.frequency ?? "التكرار"}
                value={med.frequency}
                onChange={(e) =>
                  updateMedication(idx, "frequency", e.target.value)
                }
              />
              <div className="flex gap-2">
                <Input
                  type="number"
                  placeholder={t?.labels?.durationDays ?? "المدة (أيام)"}
                  value={med.duration_days}
                  onChange={(e) =>
                    updateMedication(idx, "duration_days", e.target.value)
                  }
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeMedication(idx)}
                  className="text-red-400 hover:text-red-300"
                >
                  <Trash2 size={14} />
                </Button>
              </div>
            </div>
          ))}
        </div>

        {/* Follow-up date */}
        <FormField
          control={form.control}
          name="follow_up_date"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t?.medical?.followUpDate ?? "تاريخ المتابعة"}</FormLabel>
              <FormControl>
                <Input
                  type="date"
                  value={field.value ?? ""}
                  onChange={(e) =>
                    field.onChange(e.target.value || null)
                  }
                />
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
              <FormLabel>{t?.labels?.notes ?? "ملاحظات إضافية"}</FormLabel>
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
          {isEditing ? t?.actions?.save ?? "حفظ" : t?.actions?.create ?? "إضافة السجل"}
        </Button>
      </form>
    </Form>
  );
}
