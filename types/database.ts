// ============================================================
// WhiskerLog v2 — Database TypeScript Types
// Auto-maintained: update whenever schema_v2.sql changes
// ============================================================

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

// ── Enums ────────────────────────────────────────────────────
export type HouseholdRole = "owner" | "member" | "viewer";
export type InvitationStatus = "pending" | "accepted" | "declined" | "expired";
export type PetType = "cat" | "dog" | "rabbit" | "bird" | "other" | "stray_cat";
export type LogEventType =
  | "fed_food"
  | "gave_medication"
  | "gave_vitamins"
  | "grooming"
  | "litter_cleaned"
  | "behavior_observed"
  | "vet_visit"
  | "weight_recorded"
  | "other";
export type BehaviorSeverity = "mild" | "moderate" | "severe";
export type TreatmentFrequency = "once" | "daily" | "twice_daily" | "weekly" | "as_needed";
export type VitaminFrequency = "daily" | "weekly";
export type PreferredLang = "ar" | "en";
export type AlertSeverity = "low" | "medium" | "high";
export type MoodType = "happy" | "calm" | "anxious" | "lethargic" | "playful" | "irritable";

export type BehaviorSlug =
  | "lethargy"
  | "vomiting"
  | "aggression"
  | "loss_of_appetite"
  | "excess_grooming"
  | "hiding"
  | "vocalization"
  | "diarrhea"
  | "sneezing"
  | "limping"
  | "playful"
  | "normal_appetite"
  | "affectionate"
  | "restless"
  | "drinking_excess";

export interface PrescribedMedication {
  name: string;
  dose: string;
  frequency: string;
  duration_days?: number | null;
  notes?: string | null;
}

export interface MedicationScheduleItem {
  medication_name: string;
  dose: string;
  frequency: TreatmentFrequency;
  times_per_day?: number;
  time_slots?: string[];
  notes?: string | null;
}

export interface TreatmentCompletedItem {
  medication_name: string;
  time_slot?: string;
  completed_at: string;
}

export interface MealCompletedSlot {
  slot_index: number;
  meal_time: string;
  completed_at: string;
  completed_by_name?: string;
}

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          display_name: string | null;
          avatar_url: string | null;
          preferred_lang: PreferredLang;
          phone: string | null;
          timezone: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name?: string | null;
          display_name?: string | null;
          avatar_url?: string | null;
          preferred_lang?: PreferredLang;
          phone?: string | null;
          timezone?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string | null;
          display_name?: string | null;
          avatar_url?: string | null;
          preferred_lang?: PreferredLang;
          phone?: string | null;
          timezone?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };

      households: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          owner_id: string;
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          owner_id: string;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string | null;
          owner_id?: string;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "households_owner_id_fkey";
            columns: ["owner_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };

      household_members: {
        Row: {
          id: string;
          household_id: string;
          user_id: string;
          role: HouseholdRole;
          is_active: boolean;
          joined_at: string;
        };
        Insert: {
          id?: string;
          household_id: string;
          user_id: string;
          role?: HouseholdRole;
          is_active?: boolean;
          joined_at?: string;
        };
        Update: {
          id?: string;
          household_id?: string;
          user_id?: string;
          role?: HouseholdRole;
          is_active?: boolean;
          joined_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "household_members_household_id_fkey";
            columns: ["household_id"];
            isOneToOne: false;
            referencedRelation: "households";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "household_members_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };

      household_invitations: {
        Row: {
          id: string;
          household_id: string;
          invited_by: string;
          email: string;
          role: HouseholdRole;
          token: string;
          status: InvitationStatus;
          expires_at: string;
          accepted_at: string | null;
          accepted_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          household_id: string;
          invited_by: string;
          email: string;
          role?: HouseholdRole;
          token?: string;
          status?: InvitationStatus;
          expires_at?: string;
          accepted_at?: string | null;
          accepted_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          household_id?: string;
          invited_by?: string;
          email?: string;
          role?: HouseholdRole;
          token?: string;
          status?: InvitationStatus;
          expires_at?: string;
          accepted_at?: string | null;
          accepted_by?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "household_invitations_household_id_fkey";
            columns: ["household_id"];
            isOneToOne: false;
            referencedRelation: "households";
            referencedColumns: ["id"];
          }
        ];
      };

      pets: {
        Row: {
          id: string;
          user_id: string;
          household_id: string | null;
          name: string;
          pet_type: PetType;
          is_stray: boolean;
          location: string | null;
          breed: string | null;
          birth_date: string | null;
          age_years: number | null;
          weight_kg: number | null;
          color: string | null;
          gender: "male" | "female" | "unknown" | null;
          neutered: boolean | null;
          microchip_id: string | null;
          insurance_id: string | null;
          photo_url: string | null;
          medical_notes: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          household_id?: string | null;
          name: string;
          pet_type?: PetType;
          is_stray?: boolean;
          location?: string | null;
          breed?: string | null;
          birth_date?: string | null;
          age_years?: number | null;
          weight_kg?: number | null;
          color?: string | null;
          gender?: "male" | "female" | "unknown" | null;
          neutered?: boolean | null;
          microchip_id?: string | null;
          insurance_id?: string | null;
          photo_url?: string | null;
          medical_notes?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          household_id?: string | null;
          name?: string;
          pet_type?: PetType;
          is_stray?: boolean;
          location?: string | null;
          breed?: string | null;
          birth_date?: string | null;
          age_years?: number | null;
          weight_kg?: number | null;
          color?: string | null;
          gender?: "male" | "female" | "unknown" | null;
          neutered?: boolean | null;
          microchip_id?: string | null;
          insurance_id?: string | null;
          photo_url?: string | null;
          medical_notes?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "pets_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "pets_household_id_fkey";
            columns: ["household_id"];
            isOneToOne: false;
            referencedRelation: "households";
            referencedColumns: ["id"];
          }
        ];
      };

      log_entries: {
        Row: {
          id: string;
          pet_id: string;
          household_id: string | null;
          created_by: string | null;
          event_type: LogEventType;
          occurred_at: string;
          notes: string | null;
          food_name: string | null;
          food_amount_g: number | null;
          medication_name: string | null;
          medication_dose: string | null;
          vitamin_name: string | null;
          weight_kg: number | null;
          did_eat: boolean | null;
          photo_url: string | null;
          metadata: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          pet_id: string;
          household_id?: string | null;
          created_by?: string | null;
          event_type: LogEventType;
          occurred_at?: string;
          notes?: string | null;
          food_name?: string | null;
          food_amount_g?: number | null;
          medication_name?: string | null;
          medication_dose?: string | null;
          vitamin_name?: string | null;
          weight_kg?: number | null;
          did_eat?: boolean | null;
          photo_url?: string | null;
          metadata?: Json | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          pet_id?: string;
          household_id?: string | null;
          created_by?: string | null;
          event_type?: LogEventType;
          occurred_at?: string;
          notes?: string | null;
          food_name?: string | null;
          food_amount_g?: number | null;
          medication_name?: string | null;
          medication_dose?: string | null;
          vitamin_name?: string | null;
          weight_kg?: number | null;
          did_eat?: boolean | null;
          photo_url?: string | null;
          metadata?: Json | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "log_entries_pet_id_fkey";
            columns: ["pet_id"];
            isOneToOne: false;
            referencedRelation: "pets";
            referencedColumns: ["id"];
          }
        ];
      };

      behavior_types: {
        Row: {
          id: string;
          slug: string;
          label_ar: string;
          label_en: string;
          is_concern: boolean;
          sort_order: number;
        };
        Insert: {
          id?: string;
          slug: string;
          label_ar: string;
          label_en: string;
          is_concern?: boolean;
          sort_order?: number;
        };
        Update: {
          id?: string;
          slug?: string;
          label_ar?: string;
          label_en?: string;
          is_concern?: boolean;
          sort_order?: number;
        };
        Relationships: [];
      };

      behavior_observations: {
        Row: {
          id: string;
          pet_id: string;
          log_entry_id: string | null;
          created_by: string | null;
          household_id: string | null;
          observed_at: string;
          severity: BehaviorSeverity;
          notes: string | null;
          behavior_slugs: string[];
          created_at: string;
        };
        Insert: {
          id?: string;
          pet_id: string;
          log_entry_id?: string | null;
          created_by?: string | null;
          household_id?: string | null;
          observed_at?: string;
          severity?: BehaviorSeverity;
          notes?: string | null;
          behavior_slugs: string[];
          created_at?: string;
        };
        Update: {
          id?: string;
          pet_id?: string;
          log_entry_id?: string | null;
          created_by?: string | null;
          household_id?: string | null;
          observed_at?: string;
          severity?: BehaviorSeverity;
          notes?: string | null;
          behavior_slugs?: string[];
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "behavior_observations_pet_id_fkey";
            columns: ["pet_id"];
            isOneToOne: false;
            referencedRelation: "pets";
            referencedColumns: ["id"];
          }
        ];
      };

      medical_records: {
        Row: {
          id: string;
          pet_id: string;
          created_by: string | null;
          household_id: string | null;
          record_date: string;
          clinic_name: string | null;
          vet_name: string | null;
          visit_reason: string | null;
          symptoms: string[];
          diagnosis: string | null;
          treatment: string | null;
          prescribed_medications: Json;
          follow_up_date: string | null;
          weight_at_visit_kg: number | null;
          attachments: Json;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          pet_id: string;
          created_by?: string | null;
          household_id?: string | null;
          record_date: string;
          clinic_name?: string | null;
          vet_name?: string | null;
          visit_reason?: string | null;
          symptoms?: string[];
          diagnosis?: string | null;
          treatment?: string | null;
          prescribed_medications?: Json;
          follow_up_date?: string | null;
          weight_at_visit_kg?: number | null;
          attachments?: Json;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          pet_id?: string;
          created_by?: string | null;
          household_id?: string | null;
          record_date?: string;
          clinic_name?: string | null;
          vet_name?: string | null;
          visit_reason?: string | null;
          symptoms?: string[];
          diagnosis?: string | null;
          treatment?: string | null;
          prescribed_medications?: Json;
          follow_up_date?: string | null;
          weight_at_visit_kg?: number | null;
          attachments?: Json;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "medical_records_pet_id_fkey";
            columns: ["pet_id"];
            isOneToOne: false;
            referencedRelation: "pets";
            referencedColumns: ["id"];
          }
        ];
      };

      treatment_plans: {
        Row: {
          id: string;
          pet_id: string;
          medical_record_id: string | null;
          created_by: string | null;
          household_id: string | null;
          title: string;
          description: string | null;
          start_date: string;
          end_date: string | null;
          is_active: boolean;
          medication_schedule: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          pet_id: string;
          medical_record_id?: string | null;
          created_by?: string | null;
          household_id?: string | null;
          title: string;
          description?: string | null;
          start_date: string;
          end_date?: string | null;
          is_active?: boolean;
          medication_schedule?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          pet_id?: string;
          medical_record_id?: string | null;
          created_by?: string | null;
          household_id?: string | null;
          title?: string;
          description?: string | null;
          start_date?: string;
          end_date?: string | null;
          is_active?: boolean;
          medication_schedule?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "treatment_plans_pet_id_fkey";
            columns: ["pet_id"];
            isOneToOne: false;
            referencedRelation: "pets";
            referencedColumns: ["id"];
          }
        ];
      };

      treatment_logs: {
        Row: {
          id: string;
          treatment_plan_id: string;
          pet_id: string;
          logged_by: string | null;
          log_date: string;
          completed_items: Json;
          notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          treatment_plan_id: string;
          pet_id: string;
          logged_by?: string | null;
          log_date: string;
          completed_items?: Json;
          notes?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          treatment_plan_id?: string;
          pet_id?: string;
          logged_by?: string | null;
          log_date?: string;
          completed_items?: Json;
          notes?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "treatment_logs_treatment_plan_id_fkey";
            columns: ["treatment_plan_id"];
            isOneToOne: false;
            referencedRelation: "treatment_plans";
            referencedColumns: ["id"];
          }
        ];
      };

      meal_plans: {
        Row: {
          id: string;
          pet_id: string;
          household_id: string | null;
          created_by: string | null;
          meals_per_day: number;
          meal_times: string[];
          food_type: string | null;
          food_brand: string | null;
          portion_grams: number | null;
          notes: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          pet_id: string;
          household_id?: string | null;
          created_by?: string | null;
          meals_per_day?: number;
          meal_times?: string[];
          food_type?: string | null;
          food_brand?: string | null;
          portion_grams?: number | null;
          notes?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          pet_id?: string;
          household_id?: string | null;
          created_by?: string | null;
          meals_per_day?: number;
          meal_times?: string[];
          food_type?: string | null;
          food_brand?: string | null;
          portion_grams?: number | null;
          notes?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "meal_plans_pet_id_fkey";
            columns: ["pet_id"];
            isOneToOne: false;
            referencedRelation: "pets";
            referencedColumns: ["id"];
          }
        ];
      };

      meal_completions: {
        Row: {
          id: string;
          meal_plan_id: string;
          pet_id: string;
          completed_by: string | null;
          completion_date: string;
          completed_slots: Json;
          vitamins_given: string[];
          created_at: string;
        };
        Insert: {
          id?: string;
          meal_plan_id: string;
          pet_id: string;
          completed_by?: string | null;
          completion_date: string;
          completed_slots?: Json;
          vitamins_given?: string[];
          created_at?: string;
        };
        Update: {
          id?: string;
          meal_plan_id?: string;
          pet_id?: string;
          completed_by?: string | null;
          completion_date?: string;
          completed_slots?: Json;
          vitamins_given?: string[];
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "meal_completions_meal_plan_id_fkey";
            columns: ["meal_plan_id"];
            isOneToOne: false;
            referencedRelation: "meal_plans";
            referencedColumns: ["id"];
          }
        ];
      };

      meal_events: {
        Row: {
          id: string;
          household_id: string | null;
          logged_by: string | null;
          slot_label: string;
          food_type: string | null;
          notes: string | null;
          vitamins: string[];
          occurred_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          household_id?: string | null;
          logged_by?: string | null;
          slot_label: string;
          food_type?: string | null;
          notes?: string | null;
          vitamins?: string[];
          occurred_at?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          household_id?: string | null;
          logged_by?: string | null;
          slot_label?: string;
          food_type?: string | null;
          notes?: string | null;
          vitamins?: string[];
          occurred_at?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "meal_events_household_id_fkey";
            columns: ["household_id"];
            isOneToOne: false;
            referencedRelation: "households";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "meal_events_logged_by_fkey";
            columns: ["logged_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };

      meal_event_pets: {
        Row: {
          id: string;
          meal_event_id: string;
          pet_id: string;
          meal_plan_id: string | null;
          did_eat: boolean;
          notes: string | null;
        };
        Insert: {
          id?: string;
          meal_event_id: string;
          pet_id: string;
          meal_plan_id?: string | null;
          did_eat?: boolean;
          notes?: string | null;
        };
        Update: {
          id?: string;
          meal_event_id?: string;
          pet_id?: string;
          meal_plan_id?: string | null;
          did_eat?: boolean;
          notes?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "meal_event_pets_meal_event_id_fkey";
            columns: ["meal_event_id"];
            isOneToOne: false;
            referencedRelation: "meal_events";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "meal_event_pets_pet_id_fkey";
            columns: ["pet_id"];
            isOneToOne: false;
            referencedRelation: "pets";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "meal_event_pets_meal_plan_id_fkey";
            columns: ["meal_plan_id"];
            isOneToOne: false;
            referencedRelation: "meal_plans";
            referencedColumns: ["id"];
          }
        ];
      };

      vitamins: {
        Row: {
          id: string;
          household_id: string;
          name: string;
          description: string | null;
          frequency: VitaminFrequency;
          days_of_week: number[];
          dose: string | null;
          notes: string | null;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          household_id: string;
          name: string;
          description?: string | null;
          frequency?: VitaminFrequency;
          days_of_week?: number[];
          dose?: string | null;
          notes?: string | null;
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          household_id?: string;
          name?: string;
          description?: string | null;
          frequency?: VitaminFrequency;
          days_of_week?: number[];
          dose?: string | null;
          notes?: string | null;
          is_active?: boolean;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "vitamins_household_id_fkey";
            columns: ["household_id"];
            isOneToOne: false;
            referencedRelation: "households";
            referencedColumns: ["id"];
          }
        ];
      };

      pet_vitamins: {
        Row: {
          id: string;
          pet_id: string;
          vitamin_id: string;
          assigned_by: string | null;
          start_date: string;
          end_date: string | null;
          is_active: boolean;
          notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          pet_id: string;
          vitamin_id: string;
          assigned_by?: string | null;
          start_date?: string;
          end_date?: string | null;
          is_active?: boolean;
          notes?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          pet_id?: string;
          vitamin_id?: string;
          assigned_by?: string | null;
          start_date?: string;
          end_date?: string | null;
          is_active?: boolean;
          notes?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "pet_vitamins_pet_id_fkey";
            columns: ["pet_id"];
            isOneToOne: false;
            referencedRelation: "pets";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "pet_vitamins_vitamin_id_fkey";
            columns: ["vitamin_id"];
            isOneToOne: false;
            referencedRelation: "vitamins";
            referencedColumns: ["id"];
          }
        ];
      };

      vitamin_logs: {
        Row: {
          id: string;
          pet_vitamin_id: string;
          pet_id: string;
          logged_by: string | null;
          log_date: string;
          given_at: string;
          notes: string | null;
          skipped: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          pet_vitamin_id: string;
          pet_id: string;
          logged_by?: string | null;
          log_date: string;
          given_at?: string;
          notes?: string | null;
          skipped?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          pet_vitamin_id?: string;
          pet_id?: string;
          logged_by?: string | null;
          log_date?: string;
          given_at?: string;
          notes?: string | null;
          skipped?: boolean;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "vitamin_logs_pet_vitamin_id_fkey";
            columns: ["pet_vitamin_id"];
            isOneToOne: false;
            referencedRelation: "pet_vitamins";
            referencedColumns: ["id"];
          }
        ];
      };

      risk_monitoring_sessions: {
        Row: {
          id: string;
          pet_id: string;
          household_id: string | null;
          created_by: string | null;
          reason: string;
          start_date: string;
          duration_days: number;
          end_date: string;
          is_active: boolean;
          archived_at: string | null;
          archive_summary: string | null;
          behavior_log_count: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          pet_id: string;
          household_id?: string | null;
          created_by?: string | null;
          reason: string;
          start_date?: string;
          duration_days: number;
          is_active?: boolean;
          archived_at?: string | null;
          archive_summary?: string | null;
          behavior_log_count?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          pet_id?: string;
          household_id?: string | null;
          created_by?: string | null;
          reason?: string;
          start_date?: string;
          duration_days?: number;
          is_active?: boolean;
          archived_at?: string | null;
          archive_summary?: string | null;
          behavior_log_count?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "risk_monitoring_sessions_pet_id_fkey";
            columns: ["pet_id"];
            isOneToOne: false;
            referencedRelation: "pets";
            referencedColumns: ["id"];
          }
        ];
      };

      alerts: {
        Row: {
          id: string;
          pet_id: string;
          user_id: string;
          household_id: string | null;
          alert_type: string;
          severity: AlertSeverity;
          title: string;
          message: string;
          is_resolved: boolean;
          resolved_at: string | null;
          resolved_by: string | null;
          metadata: Json | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          pet_id: string;
          user_id: string;
          household_id?: string | null;
          alert_type: string;
          severity: AlertSeverity;
          title: string;
          message: string;
          is_resolved?: boolean;
          resolved_at?: string | null;
          resolved_by?: string | null;
          metadata?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          pet_id?: string;
          user_id?: string;
          household_id?: string | null;
          alert_type?: string;
          severity?: AlertSeverity;
          title?: string;
          message?: string;
          is_resolved?: boolean;
          resolved_at?: string | null;
          resolved_by?: string | null;
          metadata?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "alerts_pet_id_fkey";
            columns: ["pet_id"];
            isOneToOne: false;
            referencedRelation: "pets";
            referencedColumns: ["id"];
          }
        ];
      };

      logs: {
        Row: {
          id: string;
          pet_id: string;
          user_id: string;
          log_date: string;
          food_type: string | null;
          food_amount_grams: number | null;
          water_intake_ml: number | null;
          mood: MoodType | null;
          energy_level: number | null;
          litter_box_urinations: number;
          litter_box_defecations: number;
          litter_box_notes: string | null;
          notes: string | null;
          photo_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          pet_id: string;
          user_id: string;
          log_date: string;
          food_type?: string | null;
          food_amount_grams?: number | null;
          water_intake_ml?: number | null;
          mood?: MoodType | null;
          energy_level?: number | null;
          litter_box_urinations?: number;
          litter_box_defecations?: number;
          litter_box_notes?: string | null;
          notes?: string | null;
          photo_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          pet_id?: string;
          user_id?: string;
          log_date?: string;
          food_type?: string | null;
          food_amount_grams?: number | null;
          water_intake_ml?: number | null;
          mood?: MoodType | null;
          energy_level?: number | null;
          litter_box_urinations?: number;
          litter_box_defecations?: number;
          litter_box_notes?: string | null;
          notes?: string | null;
          photo_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
    };

    Views: {
      active_treatment_plans_view: {
        Row: {
          id: string;
          pet_id: string;
          pet_name: string;
          pet_photo_url: string | null;
          title: string;
          description: string | null;
          start_date: string;
          end_date: string | null;
          is_active: boolean;
          medication_schedule: Json;
          days_logged: number;
          progress_percent: number | null;
          created_by: string | null;
          household_id: string | null;
          created_at: string;
          updated_at: string;
          medical_record_id: string | null;
        };
        Relationships: [];
      };
      todays_vitamins_view: {
        Row: {
          pet_vitamin_id: string;
          pet_id: string;
          pet_name: string;
          vitamin_id: string;
          vitamin_name: string;
          dose: string | null;
          frequency: VitaminFrequency;
          days_of_week: number[];
          assignment_active: boolean;
          log_id: string | null;
          completed_at: string | null;
        };
        Relationships: [];
      };
    };

    Functions: {
      is_household_member: {
        Args: { hid: string };
        Returns: boolean;
      };
      can_write_to_household: {
        Args: { hid: string };
        Returns: boolean;
      };
      user_household_role: {
        Args: { hid: string };
        Returns: HouseholdRole;
      };
      get_user_households: {
        Args: Record<string, never>;
        Returns: string[];
      };
      archive_expired_risk_sessions: {
        Args: Record<string, never>;
        Returns: number;
      };
      create_household: {
        Args: { p_name: string; p_description?: string | null };
        Returns: Json;
      };
    };

    Enums: {
      household_role: HouseholdRole;
      invitation_status: InvitationStatus;
      pet_type: PetType;
      log_event_type: LogEventType;
      behavior_severity: BehaviorSeverity;
      treatment_frequency: TreatmentFrequency;
      vitamin_frequency: VitaminFrequency;
      preferred_lang: PreferredLang;
      alert_severity: AlertSeverity;
      mood_type: MoodType;
    };
  };
}
