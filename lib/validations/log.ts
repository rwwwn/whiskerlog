import { z } from "zod";

export const MOOD_OPTIONS = [
  { value: "happy", label: "Happy" },
  { value: "calm", label: "Calm" },
  { value: "playful", label: "Playful" },
  { value: "anxious", label: "Anxious" },
  { value: "lethargic", label: "Lethargic" },
  { value: "irritable", label: "Irritable" },
] as const;

export const logSchema = z.object({
  pet_id: z.string().uuid("Invalid pet selection"),
  log_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format"),
  food_type: z
    .string()
    .max(100, "Food type must be 100 characters or fewer")
    .optional()
    .or(z.literal("")),
  food_amount_grams: z
    .number({ invalid_type_error: "Must be a number" })
    .min(0, "Cannot be negative")
    .max(2000, "Value seems too high")
    .optional()
    .nullable(),
  water_intake_ml: z
    .number({ invalid_type_error: "Must be a number" })
    .min(0, "Cannot be negative")
    .max(2000, "Value seems too high")
    .optional()
    .nullable(),
  mood: z
    .enum(["happy", "calm", "anxious", "lethargic", "playful", "irritable"])
    .optional()
    .nullable(),
  energy_level: z
    .number()
    .int()
    .min(1, "Minimum energy level is 1")
    .max(5, "Maximum energy level is 5")
    .optional()
    .nullable(),
  litter_box_urinations: z
    .number()
    .int()
    .min(0, "Cannot be negative")
    .max(20, "Value seems too high")
    .default(0),
  litter_box_defecations: z
    .number()
    .int()
    .min(0, "Cannot be negative")
    .max(10, "Value seems too high")
    .default(0),
  litter_box_notes: z
    .string()
    .max(500, "Notes must be 500 characters or fewer")
    .optional()
    .or(z.literal("")),
  notes: z
    .string()
    .max(2000, "Notes must be 2,000 characters or fewer")
    .optional()
    .or(z.literal("")),
});

export type LogFormValues = z.infer<typeof logSchema>;
