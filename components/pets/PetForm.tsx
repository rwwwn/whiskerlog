"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Upload } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { petSchema, type PetFormValues } from "@/lib/validations/pet";
import type { Pet } from "@/types";
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

interface PetFormProps {
  initialData?: Partial<Pet>;
  petId?: string;
}

export function PetForm({ initialData, petId }: PetFormProps) {
  const router = useRouter();
  const supabase = createClient();
  const [uploading, setUploading] = useState(false);

  const form = useForm<PetFormValues>({
    resolver: zodResolver(petSchema),
    defaultValues: {
      name: initialData?.name ?? "",
      breed: initialData?.breed ?? "",
      age_years: initialData?.age_years ?? null,
      weight_kg: initialData?.weight_kg ?? null,
      medical_notes: initialData?.medical_notes ?? "",
      photo_url: initialData?.photo_url ?? "",
      pet_type: (initialData as any)?.pet_type ?? "cat",
      is_stray: (initialData as any)?.is_stray ?? false,
      location: (initialData as any)?.location ?? "",
    },
  });

  const { isSubmitting } = form.formState;
  const isEditing = !!petId;

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast({ variant: "destructive", title: "File too large (max 5MB)" });
      return;
    }

    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const filePath = `pet-photos/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("pet-photos")
        .upload(filePath, file, { cacheControl: "3600", upsert: false });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from("pet-photos")
        .getPublicUrl(filePath);

      form.setValue("photo_url", data.publicUrl);
      toast({ variant: "success", title: "Photo uploaded" });
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Upload failed",
        description: err instanceof Error ? err.message : "Unknown error",
      });
    } finally {
      setUploading(false);
    }
  }

  async function onSubmit(values: PetFormValues) {
    const payload = {
      name: values.name,
      breed: values.breed || null,
      age_years: values.age_years ?? null,
      weight_kg: values.weight_kg ?? null,
      medical_notes: values.medical_notes || null,
      photo_url: values.photo_url || null,
      pet_type: (values as any).pet_type || "cat",
      is_stray: (values as any).is_stray ?? false,
      location: (values as any).is_stray ? ((values as any).location || null) : null,
    };

    const url = isEditing ? `/api/pets/${petId}` : "/api/pets";
    const method = isEditing ? "PATCH" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const { error } = await res.json();
      toast({ variant: "destructive", title: "Save failed", description: error });
      return;
    }

    toast({
      variant: "success",
      title: isEditing ? "Pet profile updated" : "Pet created",
    });
    router.push("/pets");
    router.refresh();
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Photo upload */}
        <div className="flex items-center gap-4">
          <div className="h-20 w-20 overflow-hidden rounded-lg bg-stone-100">
            {form.watch("photo_url") ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={form.watch("photo_url") ?? ""}
                alt="Pet photo preview"
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full items-center justify-center text-stone-300">
                <Upload size={24} />
              </div>
            )}
          </div>
          <label className="cursor-pointer">
            <input
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={handlePhotoUpload}
              disabled={uploading}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={uploading}
              asChild
            >
              <span>
                {uploading && <Loader2 size={14} className="animate-spin" />}
                {uploading ? "Uploading…" : "Upload Photo"}
              </span>
            </Button>
          </label>
        </div>

        {/* Name */}
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name *</FormLabel>
              <FormControl>
                <Input placeholder="Luna" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {/* Breed */}
          <FormField
            control={form.control}
            name="breed"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Breed</FormLabel>
                <FormControl>
                  <Input placeholder="Maine Coon" {...field} value={field.value ?? ""} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Age */}
          <FormField
            control={form.control}
            name="age_years"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Age (years)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="0.1"
                    min="0"
                    max="30"
                    placeholder="3.5"
                    {...field}
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

          {/* Weight */}
          <FormField
            control={form.control}
            name="weight_kg"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Weight (kg)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="0.1"
                    min="0.1"
                    max="30"
                    placeholder="5.2"
                    {...field}
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

        {/* Pet type + stray mode */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name={"pet_type" as any}
            render={({ field }) => (
              <FormItem>
                <FormLabel>نوع الحيوان</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value ?? "cat"}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="cat">قطة 🐱</SelectItem>
                    <SelectItem value="dog">كلب 🐶</SelectItem>
                    <SelectItem value="rabbit">أرنب 🐰</SelectItem>
                    <SelectItem value="bird">طائر 🐦</SelectItem>
                    <SelectItem value="stray_cat">قطة ضالة 🐾</SelectItem>
                    <SelectItem value="other">أخرى</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name={"is_stray" as any}
            render={({ field }) => (
              <FormItem className="flex flex-col justify-center">
                <FormLabel>وضع الضال</FormLabel>
                <div className="flex items-center gap-3 mt-2">
                  <button
                    type="button"
                    onClick={() => field.onChange(!field.value)}
                    className={`relative inline-flex h-6 w-11 rounded-full transition-colors ${
                      field.value ? "bg-amber-500" : "bg-stone-200"
                    }`}
                  >
                    <span
                      className={`inline-block h-5 w-5 rounded-full bg-white shadow transform transition-transform mt-0.5 ${
                        field.value ? "translate-x-5 rtl:-translate-x-5" : "translate-x-0.5 rtl:-translate-x-0.5"
                      }`}
                    />
                  </button>
                  <span className="text-sm text-stone-500">
                    {field.value ? "ضال / محمي مجتمعي" : "أليف"}
                  </span>
                </div>
              </FormItem>
            )}
          />
        </div>

        {/* Location — only when stray */}
        {form.watch("is_stray" as any) && (
          <FormField
            control={form.control}
            name={"location" as any}
            render={({ field }) => (
              <FormItem>
                <FormLabel>الموقع / المنطقة</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="مثال: حديقة الحي، شارع الورود..." />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        {/* Medical notes */}
        <FormField
          control={form.control}
          name="medical_notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Medical Notes</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Allergies, medications, ongoing conditions, vet reminders…"
                  rows={4}
                  {...field}
                  value={field.value ?? ""}
                />
              </FormControl>
              <FormDescription>
                Only visible to you. Max 2,000 characters.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex gap-3">
          <Button type="submit" variant="teal" disabled={isSubmitting}>
            {isSubmitting && <Loader2 size={16} className="animate-spin" />}
            {isEditing ? "Save Changes" : "Create Pet"}
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
