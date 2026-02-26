"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useT } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  { value: "daily", label: "يومياً" },
  { value: "twice_daily", label: "مرتين يومياً" },
  { value: "every_other_day", label: "كل يومين" },
  { value: "weekly", label: "أسبوعياً" },
  { value: "monthly", label: "شهرياً" },
  { value: "as_needed", label: "عند الحاجة" },
];

const schema = z.object({
  pet_id: z.string().uuid(),
  vitamin_name: z.string().min(1, "مطلوب"),
  dosage: z.string().optional(),
  frequency: z.string().optional(),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

export function VitaminAssignForm({
  pets,
  defaultPetId,
}: {
  pets: { id: string; name: string }[];
  defaultPetId?: string;
}) {
  const t = useT();
  const router = useRouter();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      pet_id: defaultPetId ?? pets[0]?.id ?? "",
      vitamin_name: "",
      dosage: "",
      frequency: "daily",
      notes: "",
    },
  });

  const { isSubmitting } = form.formState;

  async function onSubmit(values: FormValues) {
    const res = await fetch("/api/vitamins", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        pet_id: values.pet_id,
        vitamin_name: values.vitamin_name,
        dosage: values.dosage || null,
        frequency: values.frequency || "daily",
        notes: values.notes || null,
      }),
    });

    if (!res.ok) {
      const { error } = await res.json();
      toast({ variant: "destructive", title: t?.toast?.error ?? "خطأ", description: error });
      return;
    }

    toast({ title: t?.toast?.success ?? "تمت الإضافة" });
    router.push("/vitamins");
    router.refresh();
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
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

        <FormField
          control={form.control}
          name="vitamin_name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t?.vitamins?.name ?? "اسم الفيتامين / المكمل"} *</FormLabel>
              <FormControl>
                <Input {...field} placeholder="مثال: أوميغا 3، فيتامين د، تورين..." />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="dosage"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t?.treatment?.dosage ?? "الجرعة"}</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="مثال: 250 مجم" />
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
                <FormLabel>{t?.treatment?.frequency ?? "التكرار"}</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {FREQUENCIES.map((f) => (
                      <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <Button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-sage-600 hover:bg-sage-700 text-white"
        >
          {isSubmitting && <Loader2 size={16} className="me-2 animate-spin" />}
          {t?.actions?.create ?? "إضافة الفيتامين"}
        </Button>
      </form>
    </Form>
  );
}
