import { z } from "zod";

export const petSchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .max(60, "Name must be 60 characters or fewer"),
  breed: z.string().max(80, "Breed must be 80 characters or fewer").optional().or(z.literal("")).nullable(),
  age_years: z
    .number({ invalid_type_error: "Age must be a number" })
    .min(0, "Age cannot be negative")
    .max(30, "Age must be 30 years or less")
    .optional()
    .nullable(),
  weight_kg: z
    .number({ invalid_type_error: "Weight must be a number" })
    .min(0.1, "Weight must be greater than 0")
    .max(30, "Weight must be 30kg or less")
    .optional()
    .nullable(),
  medical_notes: z
    .string()
    .max(2000, "Medical notes must be 2,000 characters or fewer")
    .optional()
    .or(z.literal(""))
    .nullable(),
  photo_url: z.string().url("Must be a valid URL").optional().or(z.literal("")).nullable(),
  pet_type: z
    .enum(["cat", "dog", "rabbit", "bird", "other", "stray_cat"])
    .optional()
    .default("cat"),
  is_stray: z.boolean().optional().default(false),
  location: z.string().max(200).optional().nullable(),
});

export type PetFormValues = z.infer<typeof petSchema>;
