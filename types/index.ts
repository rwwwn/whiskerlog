import type {
  Database,
  MoodType,
  AlertSeverity,
  Json,
  HouseholdRole,
  InvitationStatus,
  PetType,
  LogEventType,
  BehaviorSeverity,
  BehaviorSlug,
  TreatmentFrequency,
  VitaminFrequency,
  PreferredLang,
  PrescribedMedication,
  MedicationScheduleItem,
  TreatmentCompletedItem,
  MealCompletedSlot,
} from "./database";

// ─── Re-exports of enums ──────────────────────────────────────────────────────
export type {
  MoodType,
  AlertSeverity,
  Json,
  HouseholdRole,
  InvitationStatus,
  PetType,
  LogEventType,
  BehaviorSeverity,
  BehaviorSlug,
  TreatmentFrequency,
  VitaminFrequency,
  PreferredLang,
  PrescribedMedication,
  MedicationScheduleItem,
  TreatmentCompletedItem,
  MealCompletedSlot,
};

// ─── Row aliases ──────────────────────────────────────────────────────────────
export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type Household = Database["public"]["Tables"]["households"]["Row"];
export type HouseholdMember = Database["public"]["Tables"]["household_members"]["Row"];
export type HouseholdInvitation = Database["public"]["Tables"]["household_invitations"]["Row"];
export type Pet = Database["public"]["Tables"]["pets"]["Row"];
export type LogEntry = Database["public"]["Tables"]["log_entries"]["Row"];
export type BehaviorType = Database["public"]["Tables"]["behavior_types"]["Row"];
export type BehaviorObservation = Database["public"]["Tables"]["behavior_observations"]["Row"];
export type MedicalRecord = Database["public"]["Tables"]["medical_records"]["Row"];
export type TreatmentPlan = Database["public"]["Tables"]["treatment_plans"]["Row"];
export type TreatmentLog = Database["public"]["Tables"]["treatment_logs"]["Row"];
export type MealPlan = Database["public"]["Tables"]["meal_plans"]["Row"];
export type MealCompletion = Database["public"]["Tables"]["meal_completions"]["Row"];
export type Vitamin = Database["public"]["Tables"]["vitamins"]["Row"];
export type PetVitamin = Database["public"]["Tables"]["pet_vitamins"]["Row"];
export type VitaminLog = Database["public"]["Tables"]["vitamin_logs"]["Row"];
export type RiskMonitoringSession = Database["public"]["Tables"]["risk_monitoring_sessions"]["Row"];
export type Alert = Database["public"]["Tables"]["alerts"]["Row"];
// v1 legacy
export type Log = Database["public"]["Tables"]["logs"]["Row"];

// ─── Insert / Update helpers ──────────────────────────────────────────────────
export type ProfileUpdate = Database["public"]["Tables"]["profiles"]["Update"];
export type HouseholdInsert = Database["public"]["Tables"]["households"]["Insert"];
export type HouseholdUpdate = Database["public"]["Tables"]["households"]["Update"];
export type PetInsert = Database["public"]["Tables"]["pets"]["Insert"];
export type PetUpdate = Database["public"]["Tables"]["pets"]["Update"];
export type LogEntryInsert = Database["public"]["Tables"]["log_entries"]["Insert"];
export type LogEntryUpdate = Database["public"]["Tables"]["log_entries"]["Update"];
export type BehaviorObservationInsert = Database["public"]["Tables"]["behavior_observations"]["Insert"];
export type MedicalRecordInsert = Database["public"]["Tables"]["medical_records"]["Insert"];
export type MedicalRecordUpdate = Database["public"]["Tables"]["medical_records"]["Update"];
export type TreatmentPlanInsert = Database["public"]["Tables"]["treatment_plans"]["Insert"];
export type TreatmentPlanUpdate = Database["public"]["Tables"]["treatment_plans"]["Update"];
export type TreatmentLogInsert = Database["public"]["Tables"]["treatment_logs"]["Insert"];
export type MealPlanInsert = Database["public"]["Tables"]["meal_plans"]["Insert"];
export type MealPlanUpdate = Database["public"]["Tables"]["meal_plans"]["Update"];
export type MealCompletionInsert = Database["public"]["Tables"]["meal_completions"]["Insert"];
export type VitaminInsert = Database["public"]["Tables"]["vitamins"]["Insert"];
export type VitaminUpdate = Database["public"]["Tables"]["vitamins"]["Update"];
export type PetVitaminInsert = Database["public"]["Tables"]["pet_vitamins"]["Insert"];
export type VitaminLogInsert = Database["public"]["Tables"]["vitamin_logs"]["Insert"];
export type RiskMonitoringSessionInsert = Database["public"]["Tables"]["risk_monitoring_sessions"]["Insert"];
export type AlertInsert = Database["public"]["Tables"]["alerts"]["Insert"];
export type AlertUpdate = Database["public"]["Tables"]["alerts"]["Update"];
// v1 legacy
export type LogInsert = Database["public"]["Tables"]["logs"]["Insert"];
export type LogUpdate = Database["public"]["Tables"]["logs"]["Update"];

// ─── View row types ───────────────────────────────────────────────────────────
export type ActiveTreatmentPlanView = Database["public"]["Views"]["active_treatment_plans_view"]["Row"];
export type TodaysVitaminView = Database["public"]["Views"]["todays_vitamins_view"]["Row"];

// ─── Enriched / joined types ──────────────────────────────────────────────────
export type LogEntryWithAuthor = LogEntry & {
  profiles: Pick<Profile, "id" | "display_name" | "full_name" | "avatar_url"> | null;
};

export type BehaviorObservationWithAuthor = BehaviorObservation & {
  profiles: Pick<Profile, "id" | "display_name" | "full_name"> | null;
};

export type MedicalRecordWithCreator = MedicalRecord & {
  profiles: Pick<Profile, "id" | "display_name" | "full_name"> | null;
};

export type HouseholdMemberWithProfile = HouseholdMember & {
  profiles: Pick<Profile, "id" | "email" | "display_name" | "full_name" | "avatar_url">;
};

export type PetWithHousehold = Pet & {
  households: Pick<Household, "id" | "name"> | null;
};

export type AlertWithPet = Alert & {
  pets: Pick<Pet, "id" | "name">;
};

// Legacy
export type LogWithPet = Log & { pets: Pick<Pet, "id" | "name"> };

// ─── API response wrappers ────────────────────────────────────────────────────
export interface ApiResponse<T> {
  data: T | null;
  error: string | null;
}

export interface PaginatedResponse<T> {
  data: T[];
  count: number;
  page: number;
  pageSize: number;
}

// ─── Dashboard stats ──────────────────────────────────────────────────────────
export interface DashboardSummary {
  petsCount: number;
  activeTreatmentPlans: ActiveTreatmentPlanView[];
  todaysVitamins: TodaysVitaminView[];
  activeRiskSessions: (RiskMonitoringSession & { pets: Pick<Pet, "id" | "name" | "photo_url"> })[];
  unresolvedAlerts: number;
  recentLogEntries: LogEntryWithAuthor[];
}

// ─── Anomaly detection (v1 compat) ───────────────────────────────────────────
export type AlertTypeKey =
  | "water_intake_high"
  | "water_intake_low"
  | "food_intake_low"
  | "low_energy_sustained"
  | "negative_mood_sustained"
  | "litter_box_overactivity"
  | "litter_box_inactivity";

export interface GeneratedAlert {
  type: AlertTypeKey;
  severity: AlertSeverity;
  title: string;
  message: string;
  metadata: Record<string, unknown>;
}

// ─── Chart data (v1 compat) ───────────────────────────────────────────────────
export interface ChartDataPoint {
  date: string;
  food?: number | null;
  water?: number | null;
  energy?: number | null;
  litterUrinations?: number;
  litterDefecations?: number;
}

// ─── Household context ────────────────────────────────────────────────────────
export interface HouseholdContext {
  household: Household | null;
  members: HouseholdMemberWithProfile[];
  myRole: HouseholdRole | null;
  canWrite: boolean;
  isOwner: boolean;
}
