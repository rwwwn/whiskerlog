"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { format } from "date-fns";
import type { Pet } from "@/types";
import { logSchema, MOOD_OPTIONS, type LogFormValues } from "@/lib/validations/log";
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
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { toast } from "@/components/ui/use-toast";

interface LogFormProps {
  pets: Pick<Pet, "id" | "name">[];
  defaultPetId?: string;
  logId?: string;
  initialData?: Partial<LogFormValues>;
}

export function LogForm({ pets, defaultPetId, logId, initialData }: LogFormProps) {
  const router = useRouter();
  const isEditing = !!logId;

  const form = useForm<LogFormValues>({
    resolver: zodResolver(logSchema),
    defaultValues: {
      pet_id: defaultPetId ?? initialData?.pet_id ?? (pets[0]?.id ?? ""),
      log_date: initialData?.log_date ?? format(new Date(), "yyyy-MM-dd"),
      food_type: initialData?.food_type ?? "",
      food_amount_grams: initialData?.food_amount_grams ?? null,
      water_intake_ml: initialData?.water_intake_ml ?? null,
      mood: initialData?.mood ?? null,
      energy_level: initialData?.energy_level ?? null,
      litter_box_urinations: initialData?.litter_box_urinations ?? 0,
      litter_box_defecations: initialData?.litter_box_defecations ?? 0,
      litter_box_notes: initialData?.litter_box_notes ?? "",
      notes: initialData?.notes ?? "",
    },
  });

  const { isSubmitting } = form.formState;

  async function onSubmit(values: LogFormValues) {
    const url = isEditing ? `/api/logs/${logId}` : "/api/logs";
    const method = isEditing ? "PATCH" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });

    if (!res.ok) {
      const { error } = await res.json();
      toast({ variant: "destructive", title: "Save failed", description: error });
      return;
    }

    toast({
      variant: "success",
      title: isEditing ? "Log updated" : "Log saved",
    });

    // Trigger anomaly detection after log creation
    if (!isEditing) {
      fetch("/api/anomaly-detection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pet_id: values.pet_id }),
      }).catch(console.error);
    }

    router.push("/logs");
    router.refresh();
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        {/* Pet + Date */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="pet_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Pet *</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                  disabled={isEditing}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a pet" />
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
            name="log_date"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Date *</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Food section */}
        <fieldset className="space-y-4 rounded-lg border border-stone-200 p-4">
          <legend className="px-1 text-sm font-medium text-stone-700">
            Food Intake
          </legend>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="food_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Food Type</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Dry kibble, wet food…"
                      {...field}
                      value={field.value ?? ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="food_amount_grams"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Amount (grams)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.5"
                      min="0"
                      placeholder="85"
                      value={field.value ?? ""}
                      onChange={(e) =>
                        field.onChange(
                          e.target.value === "" ? null : parseFloat(e.target.value)
                        )
                      }
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </fieldset>

        {/* Water section */}
        <fieldset className="space-y-4 rounded-lg border border-stone-200 p-4">
          <legend className="px-1 text-sm font-medium text-stone-700">
            Water Intake
          </legend>
          <FormField
            control={form.control}
            name="water_intake_ml"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Water (ml)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="1"
                    min="0"
                    placeholder="200"
                    value={field.value ?? ""}
                    onChange={(e) =>
                      field.onChange(
                        e.target.value === "" ? null : parseFloat(e.target.value)
                      )
                    }
                  />
                </FormControl>
                <FormDescription>
                  Combined from all water sources (bowl, wet food, etc.)
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </fieldset>

        {/* Mood & Energy */}
        <fieldset className="space-y-4 rounded-lg border border-stone-200 p-4">
          <legend className="px-1 text-sm font-medium text-stone-700">
            Mood &amp; Energy
          </legend>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="mood"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Mood</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value ?? undefined}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select mood" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {MOOD_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
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
              name="energy_level"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Energy Level (1–5)</FormLabel>
                  <Select
                    onValueChange={(v) => field.onChange(parseInt(v))}
                    defaultValue={field.value?.toString() ?? undefined}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select level" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {[1, 2, 3, 4, 5].map((v) => (
                        <SelectItem key={v} value={v.toString()}>
                          {v} — {["Very Low", "Low", "Moderate", "High", "Very High"][v - 1]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </fieldset>

        {/* Litter box */}
        <fieldset className="space-y-4 rounded-lg border border-stone-200 p-4">
          <legend className="px-1 text-sm font-medium text-stone-700">
            Litter Box Activity
          </legend>
          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="litter_box_urinations"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Urinations</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min="0"
                      max="20"
                      {...field}
                      value={field.value ?? 0}
                      onChange={(e) =>
                        field.onChange(parseInt(e.target.value) || 0)
                      }
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="litter_box_defecations"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Defecations</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min="0"
                      max="10"
                      {...field}
                      value={field.value ?? 0}
                      onChange={(e) =>
                        field.onChange(parseInt(e.target.value) || 0)
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
            name="litter_box_notes"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Litter Box Notes</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Unusual colour, texture, straining…"
                    {...field}
                    value={field.value ?? ""}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </fieldset>

        {/* General notes */}
        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>General Notes</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Any observations or behaviours worth noting…"
                  rows={3}
                  {...field}
                  value={field.value ?? ""}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex gap-3">
          <Button type="submit" variant="teal" disabled={isSubmitting}>
            {isSubmitting && <Loader2 size={16} className="animate-spin" />}
            {isEditing ? "Save Changes" : "Save Log"}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
          >
            Cancel
          </Button>
        </div>
      </form>
    </Form>
  );
}
