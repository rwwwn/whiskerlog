-- ============================================================
-- WhiskerLog — Full v2 Migration
-- Run this ONCE in your Supabase SQL Editor.
-- Assumes v1 schema (profiles, pets, logs, alerts) already exists.
-- Safe to run: all statements use IF NOT EXISTS / DO $$ EXCEPTION blocks.
-- ============================================================

-- ── EXTENSIONS ────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ── ENUMS ─────────────────────────────────────────────────
DO $$ BEGIN CREATE TYPE public.household_role AS ENUM ('owner', 'member', 'viewer');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE public.invitation_status AS ENUM ('pending', 'accepted', 'declined', 'expired');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE public.pet_type AS ENUM ('cat', 'dog', 'rabbit', 'bird', 'other', 'stray_cat');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.log_event_type AS ENUM (
    'fed_food', 'gave_medication', 'gave_vitamins', 'grooming',
    'litter_cleaned', 'behavior_observed', 'vet_visit', 'weight_recorded', 'other'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE public.behavior_severity AS ENUM ('mild', 'moderate', 'severe');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE public.treatment_frequency AS ENUM ('once', 'daily', 'twice_daily', 'weekly', 'as_needed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE public.vitamin_frequency AS ENUM ('daily', 'weekly');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE public.preferred_lang AS ENUM ('ar', 'en');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Add missing enum values (safe to add even if already present)
DO $$ BEGIN ALTER TYPE public.treatment_frequency ADD VALUE IF NOT EXISTS 'three_times_daily'; EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER TYPE public.treatment_frequency ADD VALUE IF NOT EXISTS 'biweekly';          EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER TYPE public.treatment_frequency ADD VALUE IF NOT EXISTS 'monthly';           EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER TYPE public.vitamin_frequency   ADD VALUE IF NOT EXISTS 'monthly';           EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER TYPE public.vitamin_frequency   ADD VALUE IF NOT EXISTS 'as_needed';         EXCEPTION WHEN others THEN NULL; END $$;

-- ── PROFILES — extend v1 ──────────────────────────────────
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS display_name    TEXT,
  ADD COLUMN IF NOT EXISTS preferred_lang  public.preferred_lang DEFAULT 'ar',
  ADD COLUMN IF NOT EXISTS phone           TEXT,
  ADD COLUMN IF NOT EXISTS timezone        TEXT DEFAULT 'Asia/Riyadh';

-- ── HOUSEHOLDS ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.households (
  id           UUID        DEFAULT uuid_generate_v4() PRIMARY KEY,
  name         TEXT        NOT NULL,
  description  TEXT,
  owner_id     UUID        REFERENCES public.profiles(id) ON DELETE RESTRICT NOT NULL,
  avatar_url   TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at   TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ── HOUSEHOLD MEMBERS ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.household_members (
  id             UUID                   DEFAULT uuid_generate_v4() PRIMARY KEY,
  household_id   UUID                   REFERENCES public.households(id) ON DELETE CASCADE NOT NULL,
  user_id        UUID                   REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  role           public.household_role  DEFAULT 'member' NOT NULL,
  is_active      BOOLEAN                DEFAULT TRUE NOT NULL,
  joined_at      TIMESTAMPTZ            DEFAULT NOW() NOT NULL,
  UNIQUE (household_id, user_id)
);

-- ── HOUSEHOLD INVITATIONS ─────────────────────────────────
CREATE TABLE IF NOT EXISTS public.household_invitations (
  id              UUID                       DEFAULT uuid_generate_v4() PRIMARY KEY,
  household_id    UUID                       REFERENCES public.households(id) ON DELETE CASCADE NOT NULL,
  invited_by      UUID                       REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  accepted_by     UUID                       REFERENCES public.profiles(id) ON DELETE SET NULL,
  email           TEXT                       NOT NULL,
  role            public.household_role      DEFAULT 'member' NOT NULL,
  token           TEXT                       NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  status          public.invitation_status   DEFAULT 'pending' NOT NULL,
  expires_at      TIMESTAMPTZ                DEFAULT (NOW() + INTERVAL '7 days') NOT NULL,
  accepted_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ                DEFAULT NOW() NOT NULL
);

-- ── PETS — extend v1 ──────────────────────────────────────
ALTER TABLE public.pets
  ADD COLUMN IF NOT EXISTS household_id   UUID    REFERENCES public.households(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS pet_type       public.pet_type DEFAULT 'cat',
  ADD COLUMN IF NOT EXISTS is_stray       BOOLEAN DEFAULT FALSE NOT NULL,
  ADD COLUMN IF NOT EXISTS location       TEXT,
  ADD COLUMN IF NOT EXISTS birth_date     DATE,
  ADD COLUMN IF NOT EXISTS color          TEXT,
  ADD COLUMN IF NOT EXISTS microchip_id   TEXT,
  ADD COLUMN IF NOT EXISTS insurance_id   TEXT,
  ADD COLUMN IF NOT EXISTS neutered       BOOLEAN,
  ADD COLUMN IF NOT EXISTS gender         TEXT CHECK (gender IN ('male', 'female', 'unknown'));

-- ── LOG ENTRIES — new structured event log ────────────────
CREATE TABLE IF NOT EXISTS public.log_entries (
  id               UUID                  DEFAULT uuid_generate_v4() PRIMARY KEY,
  pet_id           UUID                  REFERENCES public.pets(id) ON DELETE CASCADE NOT NULL,
  household_id     UUID                  REFERENCES public.households(id) ON DELETE SET NULL,
  created_by       UUID                  REFERENCES public.profiles(id) ON DELETE SET NULL,
  event_type       public.log_event_type NOT NULL,
  occurred_at      TIMESTAMPTZ           DEFAULT NOW() NOT NULL,
  notes            TEXT,
  food_name        TEXT,
  food_amount_g    NUMERIC(7,2),
  medication_name  TEXT,
  medication_dose  TEXT,
  vitamin_name     TEXT,
  weight_kg        NUMERIC(5,2),
  did_eat          BOOLEAN,
  photo_url        TEXT,
  metadata         JSONB,
  created_at       TIMESTAMPTZ           DEFAULT NOW() NOT NULL
);

-- ── BEHAVIOR TYPES (catalog) ──────────────────────────────
CREATE TABLE IF NOT EXISTS public.behavior_types (
  id          UUID     DEFAULT uuid_generate_v4() PRIMARY KEY,
  slug        TEXT     NOT NULL UNIQUE,
  label_ar    TEXT     NOT NULL,
  label_en    TEXT     NOT NULL,
  is_concern  BOOLEAN  DEFAULT TRUE NOT NULL,
  sort_order  SMALLINT DEFAULT 0
);

INSERT INTO public.behavior_types (slug, label_ar, label_en, is_concern, sort_order) VALUES
  ('lethargy',         'خمول',              'Lethargy',               TRUE,  1),
  ('vomiting',         'قيء',               'Vomiting',               TRUE,  2),
  ('aggression',       'عدوانية',           'Aggression',             TRUE,  3),
  ('loss_of_appetite', 'فقدان الشهية',      'Loss of Appetite',       TRUE,  4),
  ('excess_grooming',  'تنظيف مفرط',        'Excessive Grooming',     TRUE,  5),
  ('hiding',           'الاختباء',          'Hiding',                 TRUE,  6),
  ('vocalization',     'كثرة المواء',       'Excessive Vocalization',  TRUE, 7),
  ('diarrhea',         'إسهال',             'Diarrhea',               TRUE,  8),
  ('sneezing',         'عطاس',              'Sneezing',               TRUE,  9),
  ('limping',          'عرج',               'Limping',                TRUE,  10),
  ('playful',          'مرح ونشاط',         'Playful',                FALSE, 11),
  ('normal_appetite',  'شهية طبيعية',       'Normal Appetite',        FALSE, 12),
  ('affectionate',     'محبة وتعلق',        'Affectionate',           FALSE, 13),
  ('restless',         'توتر وقلق',         'Restless',               TRUE,  14),
  ('drinking_excess',  'شرب مفرط للماء',    'Drinking Excessively',   TRUE,  15)
ON CONFLICT (slug) DO NOTHING;

-- ── BEHAVIOR OBSERVATIONS ─────────────────────────────────
CREATE TABLE IF NOT EXISTS public.behavior_observations (
  id              UUID                      DEFAULT uuid_generate_v4() PRIMARY KEY,
  pet_id          UUID                      REFERENCES public.pets(id) ON DELETE CASCADE NOT NULL,
  log_entry_id    UUID                      REFERENCES public.log_entries(id) ON DELETE SET NULL,
  created_by      UUID                      REFERENCES public.profiles(id) ON DELETE SET NULL,
  household_id    UUID                      REFERENCES public.households(id) ON DELETE SET NULL,
  observed_at     TIMESTAMPTZ               DEFAULT NOW() NOT NULL,
  severity        public.behavior_severity  DEFAULT 'mild' NOT NULL,
  notes           TEXT,
  behavior_slugs  TEXT[]                    NOT NULL DEFAULT '{}',
  created_at      TIMESTAMPTZ               DEFAULT NOW() NOT NULL
);

-- ── BEHAVIOR OBSERVATION TYPES (junction) ────────────────
CREATE TABLE IF NOT EXISTS public.behavior_observation_types (
  observation_id   UUID  REFERENCES public.behavior_observations(id) ON DELETE CASCADE NOT NULL,
  behavior_type_id UUID  REFERENCES public.behavior_types(id)        ON DELETE CASCADE NOT NULL,
  PRIMARY KEY (observation_id, behavior_type_id)
);

-- ── MEDICAL RECORDS ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.medical_records (
  id                     UUID        DEFAULT uuid_generate_v4() PRIMARY KEY,
  pet_id                 UUID        REFERENCES public.pets(id) ON DELETE CASCADE NOT NULL,
  created_by             UUID        REFERENCES public.profiles(id) ON DELETE SET NULL,
  household_id           UUID        REFERENCES public.households(id) ON DELETE SET NULL,
  record_date            DATE        NOT NULL,
  clinic_name            TEXT,
  vet_name               TEXT,
  visit_reason           TEXT,
  symptoms               TEXT[]      DEFAULT '{}',
  diagnosis              TEXT,
  treatment              TEXT,
  prescribed_medications JSONB       DEFAULT '[]',
  follow_up_date         DATE,
  weight_at_visit_kg     NUMERIC(5,2),
  attachments            JSONB       DEFAULT '[]',
  notes                  TEXT,
  created_at             TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at             TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ── TREATMENT PLANS ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.treatment_plans (
  id                  UUID        DEFAULT uuid_generate_v4() PRIMARY KEY,
  pet_id              UUID        REFERENCES public.pets(id) ON DELETE CASCADE NOT NULL,
  medical_record_id   UUID        REFERENCES public.medical_records(id) ON DELETE SET NULL,
  created_by          UUID        REFERENCES public.profiles(id) ON DELETE SET NULL,
  household_id        UUID        REFERENCES public.households(id) ON DELETE SET NULL,
  title               TEXT        NOT NULL,
  description         TEXT,
  start_date          DATE        NOT NULL,
  end_date            DATE,
  is_active           BOOLEAN     DEFAULT TRUE NOT NULL,
  total_doses         INTEGER,
  medication_schedule JSONB       DEFAULT '[]',
  created_at          TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at          TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ── TREATMENT LOGS ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.treatment_logs (
  id                UUID        DEFAULT uuid_generate_v4() PRIMARY KEY,
  treatment_plan_id UUID        REFERENCES public.treatment_plans(id) ON DELETE CASCADE NOT NULL,
  pet_id            UUID        REFERENCES public.pets(id) ON DELETE CASCADE NOT NULL,
  logged_by         UUID        REFERENCES public.profiles(id) ON DELETE SET NULL,
  log_date          DATE        NOT NULL,
  completed_items   JSONB       DEFAULT '[]',
  notes             TEXT,
  created_at        TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE (treatment_plan_id, log_date)
);

-- ── MEAL PLANS ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.meal_plans (
  id             UUID        DEFAULT uuid_generate_v4() PRIMARY KEY,
  pet_id         UUID        REFERENCES public.pets(id) ON DELETE CASCADE NOT NULL,
  household_id   UUID        REFERENCES public.households(id) ON DELETE SET NULL,
  created_by     UUID        REFERENCES public.profiles(id) ON DELETE SET NULL,
  meals_per_day  SMALLINT    DEFAULT 2 NOT NULL CHECK (meals_per_day BETWEEN 1 AND 10),
  meal_times     TEXT[]      DEFAULT '{}',
  food_type      TEXT,
  food_brand     TEXT,
  portion_grams  NUMERIC(7,2),
  notes          TEXT,
  is_active      BOOLEAN     DEFAULT TRUE NOT NULL,
  created_at     TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at     TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ── MEAL COMPLETIONS ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.meal_completions (
  id               UUID        DEFAULT uuid_generate_v4() PRIMARY KEY,
  meal_plan_id     UUID        REFERENCES public.meal_plans(id) ON DELETE CASCADE NOT NULL,
  pet_id           UUID        REFERENCES public.pets(id) ON DELETE CASCADE NOT NULL,
  completed_by     UUID        REFERENCES public.profiles(id) ON DELETE SET NULL,
  completion_date  DATE        NOT NULL,
  completed_slots  JSONB       DEFAULT '[]',
  created_at       TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE (meal_plan_id, completion_date)
);

-- ── VITAMINS CATALOG ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.vitamins (
  id              UUID                     DEFAULT uuid_generate_v4() PRIMARY KEY,
  household_id    UUID                     REFERENCES public.households(id) ON DELETE CASCADE NOT NULL,
  name            TEXT                     NOT NULL,
  description     TEXT,
  frequency       public.vitamin_frequency DEFAULT 'daily' NOT NULL,
  days_of_week    SMALLINT[]               DEFAULT '{}',
  dose            TEXT,
  notes           TEXT,
  is_active       BOOLEAN                  DEFAULT TRUE NOT NULL,
  created_at      TIMESTAMPTZ              DEFAULT NOW() NOT NULL
);

-- ── PET VITAMINS ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.pet_vitamins (
  id           UUID        DEFAULT uuid_generate_v4() PRIMARY KEY,
  pet_id       UUID        REFERENCES public.pets(id) ON DELETE CASCADE NOT NULL,
  vitamin_id   UUID        REFERENCES public.vitamins(id) ON DELETE CASCADE NOT NULL,
  assigned_by  UUID        REFERENCES public.profiles(id) ON DELETE SET NULL,
  start_date   DATE        NOT NULL DEFAULT CURRENT_DATE,
  end_date     DATE,
  is_active    BOOLEAN     DEFAULT TRUE NOT NULL,
  notes        TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE (pet_id, vitamin_id)
);

-- ── VITAMIN LOGS ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.vitamin_logs (
  id              UUID        DEFAULT uuid_generate_v4() PRIMARY KEY,
  pet_vitamin_id  UUID        REFERENCES public.pet_vitamins(id) ON DELETE CASCADE NOT NULL,
  pet_id          UUID        REFERENCES public.pets(id) ON DELETE CASCADE NOT NULL,
  logged_by       UUID        REFERENCES public.profiles(id) ON DELETE SET NULL,
  log_date        DATE        NOT NULL,
  given_at        TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  notes           TEXT,
  skipped         BOOLEAN     DEFAULT FALSE NOT NULL,
  created_at      TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE (pet_vitamin_id, log_date)
);

-- ── RISK MONITORING SESSIONS ──────────────────────────────
CREATE TABLE IF NOT EXISTS public.risk_monitoring_sessions (
  id                 UUID        DEFAULT uuid_generate_v4() PRIMARY KEY,
  pet_id             UUID        REFERENCES public.pets(id) ON DELETE CASCADE NOT NULL,
  household_id       UUID        REFERENCES public.households(id) ON DELETE SET NULL,
  created_by         UUID        REFERENCES public.profiles(id) ON DELETE SET NULL,
  reason             TEXT,
  severity           TEXT        DEFAULT 'low' CHECK (severity IN ('low', 'medium', 'high')),
  symptoms           TEXT[]      DEFAULT '{}',
  notes              TEXT,
  start_date         TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  duration_days      SMALLINT    CHECK (duration_days BETWEEN 1 AND 365),
  end_date           TIMESTAMPTZ,
  is_active          BOOLEAN     DEFAULT TRUE NOT NULL,
  resolved_at        TIMESTAMPTZ,
  resolution_notes   TEXT,
  archived_at        TIMESTAMPTZ,
  archive_summary    TEXT,
  behavior_log_count INTEGER     DEFAULT 0,
  created_at         TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at         TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ── ALERTS — extend v1 ────────────────────────────────────
ALTER TABLE public.alerts
  ADD COLUMN IF NOT EXISTS household_id UUID REFERENCES public.households(id) ON DELETE SET NULL;

-- ── INDEXES ───────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_households_owner_id          ON public.households(owner_id);
CREATE INDEX IF NOT EXISTS idx_household_members_household  ON public.household_members(household_id);
CREATE INDEX IF NOT EXISTS idx_household_members_user       ON public.household_members(user_id);
CREATE INDEX IF NOT EXISTS idx_invitations_email            ON public.household_invitations(email);
CREATE INDEX IF NOT EXISTS idx_invitations_token            ON public.household_invitations(token);
CREATE INDEX IF NOT EXISTS idx_pets_household_id            ON public.pets(household_id);
CREATE INDEX IF NOT EXISTS idx_pets_is_stray                ON public.pets(is_stray) WHERE is_stray = TRUE;
CREATE INDEX IF NOT EXISTS idx_log_entries_pet_id           ON public.log_entries(pet_id);
CREATE INDEX IF NOT EXISTS idx_log_entries_household_id     ON public.log_entries(household_id);
CREATE INDEX IF NOT EXISTS idx_log_entries_created_by       ON public.log_entries(created_by);
CREATE INDEX IF NOT EXISTS idx_log_entries_occurred_at      ON public.log_entries(occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_log_entries_event_type       ON public.log_entries(event_type);
CREATE INDEX IF NOT EXISTS idx_log_entries_pet_occurred     ON public.log_entries(pet_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_behavior_obs_pet_id          ON public.behavior_observations(pet_id);
CREATE INDEX IF NOT EXISTS idx_behavior_obs_observed_at     ON public.behavior_observations(observed_at DESC);
CREATE INDEX IF NOT EXISTS idx_behavior_obs_household_id    ON public.behavior_observations(household_id);
CREATE INDEX IF NOT EXISTS idx_bot_observation_id           ON public.behavior_observation_types(observation_id);
CREATE INDEX IF NOT EXISTS idx_bot_type_id                  ON public.behavior_observation_types(behavior_type_id);
CREATE INDEX IF NOT EXISTS idx_medical_records_pet_id       ON public.medical_records(pet_id);
CREATE INDEX IF NOT EXISTS idx_medical_records_record_date  ON public.medical_records(record_date DESC);
CREATE INDEX IF NOT EXISTS idx_medical_records_household_id ON public.medical_records(household_id);
CREATE INDEX IF NOT EXISTS idx_treatment_plans_pet_id       ON public.treatment_plans(pet_id);
CREATE INDEX IF NOT EXISTS idx_treatment_plans_active       ON public.treatment_plans(is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_treatment_plans_household_id ON public.treatment_plans(household_id);
CREATE INDEX IF NOT EXISTS idx_treatment_logs_plan_id       ON public.treatment_logs(treatment_plan_id);
CREATE INDEX IF NOT EXISTS idx_treatment_logs_date          ON public.treatment_logs(log_date DESC);
CREATE INDEX IF NOT EXISTS idx_meal_plans_pet_id            ON public.meal_plans(pet_id);
CREATE INDEX IF NOT EXISTS idx_meal_plans_is_active         ON public.meal_plans(is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_meal_completions_pet_id      ON public.meal_completions(pet_id);
CREATE INDEX IF NOT EXISTS idx_meal_completions_date        ON public.meal_completions(completion_date DESC);
CREATE INDEX IF NOT EXISTS idx_vitamins_household_id        ON public.vitamins(household_id);
CREATE INDEX IF NOT EXISTS idx_pet_vitamins_pet_id          ON public.pet_vitamins(pet_id);
CREATE INDEX IF NOT EXISTS idx_vitamin_logs_pet_id          ON public.vitamin_logs(pet_id);
CREATE INDEX IF NOT EXISTS idx_vitamin_logs_date            ON public.vitamin_logs(log_date DESC);
CREATE INDEX IF NOT EXISTS idx_risk_sessions_pet_id         ON public.risk_monitoring_sessions(pet_id);
CREATE INDEX IF NOT EXISTS idx_risk_sessions_active         ON public.risk_monitoring_sessions(is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_risk_sessions_household_id   ON public.risk_monitoring_sessions(household_id);

-- ── HELPER FUNCTIONS ──────────────────────────────────────

CREATE OR REPLACE FUNCTION public.is_household_member(hid UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.household_members
    WHERE household_id = hid AND user_id = auth.uid() AND is_active = TRUE
  );
$$;

CREATE OR REPLACE FUNCTION public.can_write_to_household(hid UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.household_members
    WHERE household_id = hid
      AND user_id = auth.uid()
      AND role IN ('owner', 'member')
      AND is_active = TRUE
  );
$$;

CREATE OR REPLACE FUNCTION public.user_household_role(hid UUID)
RETURNS public.household_role LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT role FROM public.household_members
  WHERE household_id = hid AND user_id = auth.uid() AND is_active = TRUE
  LIMIT 1;
$$;

-- ── UPDATED_AT TRIGGER ────────────────────────────────────

CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;

DO $$ BEGIN
  CREATE TRIGGER set_updated_at_households
    BEFORE UPDATE ON public.households FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TRIGGER set_updated_at_medical_records
    BEFORE UPDATE ON public.medical_records FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TRIGGER set_updated_at_treatment_plans
    BEFORE UPDATE ON public.treatment_plans FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TRIGGER set_updated_at_meal_plans
    BEFORE UPDATE ON public.meal_plans FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TRIGGER set_updated_at_risk_sessions
    BEFORE UPDATE ON public.risk_monitoring_sessions FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE OR REPLACE FUNCTION public.compute_risk_session_end_date()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.duration_days IS NOT NULL THEN
    NEW.end_date := NEW.start_date + (NEW.duration_days * INTERVAL '1 day');
  ELSE
    NEW.end_date := NULL;
  END IF;
  RETURN NEW;
END;
$$;

DO $$ BEGIN
  CREATE TRIGGER set_risk_session_end_date
    BEFORE INSERT OR UPDATE OF start_date, duration_days
    ON public.risk_monitoring_sessions
    FOR EACH ROW EXECUTE FUNCTION public.compute_risk_session_end_date();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── AUTO-CREATE PROFILE TRIGGER (replace v1 version) ─────

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name, preferred_lang)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    'ar'
  )
  ON CONFLICT (id) DO UPDATE
    SET email = EXCLUDED.email, updated_at = NOW();
  RETURN NEW;
END;
$$;

-- ── AUTO-ARCHIVE EXPIRED RISK SESSIONS ───────────────────

CREATE OR REPLACE FUNCTION public.archive_expired_risk_sessions()
RETURNS INTEGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE archived_count INTEGER;
BEGIN
  UPDATE public.risk_monitoring_sessions
  SET is_active = FALSE,
      archived_at = NOW(),
      archive_summary = 'Auto-archived: monitoring period ended on ' || end_date::TEXT
  WHERE is_active = TRUE AND end_date IS NOT NULL AND end_date < NOW();
  GET DIAGNOSTICS archived_count = ROW_COUNT;
  RETURN archived_count;
END;
$$;

-- ── RLS — ENABLE ON ALL NEW TABLES ───────────────────────

ALTER TABLE public.households               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.household_members        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.household_invitations    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.log_entries              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.behavior_types           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.behavior_observations    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.behavior_observation_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medical_records          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.treatment_plans          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.treatment_logs           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meal_plans               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meal_completions         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vitamins                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pet_vitamins             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vitamin_logs             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.risk_monitoring_sessions ENABLE ROW LEVEL SECURITY;

-- ── RLS POLICIES ─────────────────────────────────────────

-- profiles
DROP POLICY IF EXISTS "profiles_select_own"              ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_household_members" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own"              ON public.profiles;
DROP POLICY IF EXISTS "profiles: user owns row"          ON public.profiles;

CREATE POLICY "profiles_select_own" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "profiles_select_household_members" ON public.profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.household_members hm1
      JOIN public.household_members hm2 ON hm1.household_id = hm2.household_id
      WHERE hm1.user_id = auth.uid() AND hm2.user_id = profiles.id AND hm1.is_active = TRUE
    )
  );

CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- households
DROP POLICY IF EXISTS "households_select" ON public.households;
DROP POLICY IF EXISTS "households_insert" ON public.households;
DROP POLICY IF EXISTS "households_update" ON public.households;
DROP POLICY IF EXISTS "households_delete" ON public.households;

CREATE POLICY "households_select" ON public.households
  FOR SELECT USING (public.is_household_member(id));
CREATE POLICY "households_insert" ON public.households
  FOR INSERT WITH CHECK (owner_id = auth.uid());
CREATE POLICY "households_update" ON public.households
  FOR UPDATE USING (owner_id = auth.uid());
CREATE POLICY "households_delete" ON public.households
  FOR DELETE USING (owner_id = auth.uid());

-- household_members
DROP POLICY IF EXISTS "hm_select" ON public.household_members;
DROP POLICY IF EXISTS "hm_insert" ON public.household_members;
DROP POLICY IF EXISTS "hm_update" ON public.household_members;
DROP POLICY IF EXISTS "hm_delete" ON public.household_members;

CREATE POLICY "hm_select" ON public.household_members
  FOR SELECT USING (public.is_household_member(household_id) OR user_id = auth.uid());
CREATE POLICY "hm_insert" ON public.household_members
  FOR INSERT WITH CHECK (
    public.user_household_role(household_id) = 'owner' OR user_id = auth.uid()
  );
CREATE POLICY "hm_update" ON public.household_members
  FOR UPDATE USING (public.user_household_role(household_id) = 'owner');
CREATE POLICY "hm_delete" ON public.household_members
  FOR DELETE USING (
    user_id = auth.uid() OR public.user_household_role(household_id) = 'owner'
  );

-- household_invitations
DROP POLICY IF EXISTS "invitations_select" ON public.household_invitations;
DROP POLICY IF EXISTS "invitations_insert" ON public.household_invitations;
DROP POLICY IF EXISTS "invitations_update" ON public.household_invitations;

CREATE POLICY "invitations_select" ON public.household_invitations
  FOR SELECT USING (
    invited_by = auth.uid()
    OR public.is_household_member(household_id)
    OR email = (SELECT email FROM public.profiles WHERE id = auth.uid())
  );
CREATE POLICY "invitations_insert" ON public.household_invitations
  FOR INSERT WITH CHECK (public.can_write_to_household(household_id));
CREATE POLICY "invitations_update" ON public.household_invitations
  FOR UPDATE USING (
    invited_by = auth.uid()
    OR email = (SELECT email FROM public.profiles WHERE id = auth.uid())
  );

-- pets (replace v1 "ALL" policy)
DROP POLICY IF EXISTS "pets: user owns row" ON public.pets;
DROP POLICY IF EXISTS "pets_select"         ON public.pets;
DROP POLICY IF EXISTS "pets_insert"         ON public.pets;
DROP POLICY IF EXISTS "pets_update"         ON public.pets;
DROP POLICY IF EXISTS "pets_delete"         ON public.pets;

CREATE POLICY "pets_select" ON public.pets
  FOR SELECT USING (
    user_id = auth.uid()
    OR (household_id IS NOT NULL AND public.is_household_member(household_id))
  );
CREATE POLICY "pets_insert" ON public.pets
  FOR INSERT WITH CHECK (
    user_id = auth.uid()
    AND (household_id IS NULL OR public.can_write_to_household(household_id))
  );
CREATE POLICY "pets_update" ON public.pets
  FOR UPDATE USING (
    user_id = auth.uid()
    OR (household_id IS NOT NULL AND public.can_write_to_household(household_id))
  );
CREATE POLICY "pets_delete" ON public.pets
  FOR DELETE USING (user_id = auth.uid());

-- logs (v1 table — keep existing policy, just ensure RLS on)
ALTER TABLE public.logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "logs: user owns row" ON public.logs;
DROP POLICY IF EXISTS "logs_select_own" ON public.logs;
CREATE POLICY "logs_select_own" ON public.logs
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- log_entries
DROP POLICY IF EXISTS "log_entries_select" ON public.log_entries;
DROP POLICY IF EXISTS "log_entries_insert" ON public.log_entries;
DROP POLICY IF EXISTS "log_entries_update" ON public.log_entries;
DROP POLICY IF EXISTS "log_entries_delete" ON public.log_entries;

CREATE POLICY "log_entries_select" ON public.log_entries
  FOR SELECT USING (
    created_by = auth.uid()
    OR (household_id IS NOT NULL AND public.is_household_member(household_id))
  );
CREATE POLICY "log_entries_insert" ON public.log_entries
  FOR INSERT WITH CHECK (
    created_by = auth.uid()
    AND (household_id IS NULL OR public.can_write_to_household(household_id))
  );
CREATE POLICY "log_entries_update" ON public.log_entries
  FOR UPDATE USING (created_by = auth.uid());
CREATE POLICY "log_entries_delete" ON public.log_entries
  FOR DELETE USING (created_by = auth.uid());

-- behavior_types (authenticated read-only)
DROP POLICY IF EXISTS "behavior_types_select" ON public.behavior_types;
CREATE POLICY "behavior_types_select" ON public.behavior_types
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- behavior_observations
DROP POLICY IF EXISTS "behavior_obs_select" ON public.behavior_observations;
DROP POLICY IF EXISTS "behavior_obs_insert" ON public.behavior_observations;
DROP POLICY IF EXISTS "behavior_obs_update" ON public.behavior_observations;
DROP POLICY IF EXISTS "behavior_obs_delete" ON public.behavior_observations;

CREATE POLICY "behavior_obs_select" ON public.behavior_observations
  FOR SELECT USING (
    created_by = auth.uid()
    OR (household_id IS NOT NULL AND public.is_household_member(household_id))
  );
CREATE POLICY "behavior_obs_insert" ON public.behavior_observations
  FOR INSERT WITH CHECK (
    created_by = auth.uid()
    AND (household_id IS NULL OR public.can_write_to_household(household_id))
  );
CREATE POLICY "behavior_obs_update" ON public.behavior_observations
  FOR UPDATE USING (created_by = auth.uid());
CREATE POLICY "behavior_obs_delete" ON public.behavior_observations
  FOR DELETE USING (created_by = auth.uid());

-- behavior_observation_types
DROP POLICY IF EXISTS "bot_select" ON public.behavior_observation_types;
DROP POLICY IF EXISTS "bot_insert" ON public.behavior_observation_types;
DROP POLICY IF EXISTS "bot_delete" ON public.behavior_observation_types;

CREATE POLICY "bot_select" ON public.behavior_observation_types
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.behavior_observations bo
      WHERE bo.id = observation_id
        AND (bo.created_by = auth.uid()
          OR (bo.household_id IS NOT NULL AND public.is_household_member(bo.household_id)))
    )
  );
CREATE POLICY "bot_insert" ON public.behavior_observation_types
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.behavior_observations bo
      WHERE bo.id = observation_id AND bo.created_by = auth.uid()
    )
  );
CREATE POLICY "bot_delete" ON public.behavior_observation_types
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.behavior_observations bo
      WHERE bo.id = observation_id AND bo.created_by = auth.uid()
    )
  );

-- medical_records
DROP POLICY IF EXISTS "medical_records_select" ON public.medical_records;
DROP POLICY IF EXISTS "medical_records_insert" ON public.medical_records;
DROP POLICY IF EXISTS "medical_records_update" ON public.medical_records;
DROP POLICY IF EXISTS "medical_records_delete" ON public.medical_records;

CREATE POLICY "medical_records_select" ON public.medical_records
  FOR SELECT USING (
    created_by = auth.uid()
    OR (household_id IS NOT NULL AND public.is_household_member(household_id))
  );
CREATE POLICY "medical_records_insert" ON public.medical_records
  FOR INSERT WITH CHECK (
    created_by = auth.uid()
    AND (household_id IS NULL OR public.can_write_to_household(household_id))
  );
CREATE POLICY "medical_records_update" ON public.medical_records
  FOR UPDATE USING (
    created_by = auth.uid()
    OR (household_id IS NOT NULL AND public.can_write_to_household(household_id))
  );
CREATE POLICY "medical_records_delete" ON public.medical_records
  FOR DELETE USING (created_by = auth.uid());

-- treatment_plans
DROP POLICY IF EXISTS "treatment_plans_select" ON public.treatment_plans;
DROP POLICY IF EXISTS "treatment_plans_insert" ON public.treatment_plans;
DROP POLICY IF EXISTS "treatment_plans_update" ON public.treatment_plans;
DROP POLICY IF EXISTS "treatment_plans_delete" ON public.treatment_plans;

CREATE POLICY "treatment_plans_select" ON public.treatment_plans
  FOR SELECT USING (
    created_by = auth.uid()
    OR (household_id IS NOT NULL AND public.is_household_member(household_id))
  );
CREATE POLICY "treatment_plans_insert" ON public.treatment_plans
  FOR INSERT WITH CHECK (
    created_by = auth.uid()
    AND (household_id IS NULL OR public.can_write_to_household(household_id))
  );
CREATE POLICY "treatment_plans_update" ON public.treatment_plans
  FOR UPDATE USING (
    created_by = auth.uid()
    OR (household_id IS NOT NULL AND public.can_write_to_household(household_id))
  );
CREATE POLICY "treatment_plans_delete" ON public.treatment_plans
  FOR DELETE USING (created_by = auth.uid());

-- treatment_logs
DROP POLICY IF EXISTS "treatment_logs_select" ON public.treatment_logs;
DROP POLICY IF EXISTS "treatment_logs_insert" ON public.treatment_logs;
DROP POLICY IF EXISTS "treatment_logs_update" ON public.treatment_logs;

CREATE POLICY "treatment_logs_select" ON public.treatment_logs
  FOR SELECT USING (
    logged_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.treatment_plans tp WHERE tp.id = treatment_plan_id
        AND (tp.created_by = auth.uid()
          OR (tp.household_id IS NOT NULL AND public.is_household_member(tp.household_id)))
    )
  );
CREATE POLICY "treatment_logs_insert" ON public.treatment_logs
  FOR INSERT WITH CHECK (logged_by = auth.uid());
CREATE POLICY "treatment_logs_update" ON public.treatment_logs
  FOR UPDATE USING (logged_by = auth.uid());

-- meal_plans
DROP POLICY IF EXISTS "meal_plans_select" ON public.meal_plans;
DROP POLICY IF EXISTS "meal_plans_insert" ON public.meal_plans;
DROP POLICY IF EXISTS "meal_plans_update" ON public.meal_plans;
DROP POLICY IF EXISTS "meal_plans_delete" ON public.meal_plans;

CREATE POLICY "meal_plans_select" ON public.meal_plans
  FOR SELECT USING (
    created_by = auth.uid()
    OR (household_id IS NOT NULL AND public.is_household_member(household_id))
  );
CREATE POLICY "meal_plans_insert" ON public.meal_plans
  FOR INSERT WITH CHECK (
    created_by = auth.uid()
    AND (household_id IS NULL OR public.can_write_to_household(household_id))
  );
CREATE POLICY "meal_plans_update" ON public.meal_plans
  FOR UPDATE USING (
    created_by = auth.uid()
    OR (household_id IS NOT NULL AND public.can_write_to_household(household_id))
  );
CREATE POLICY "meal_plans_delete" ON public.meal_plans
  FOR DELETE USING (created_by = auth.uid());

-- meal_completions
DROP POLICY IF EXISTS "meal_completions_select" ON public.meal_completions;
DROP POLICY IF EXISTS "meal_completions_insert" ON public.meal_completions;
DROP POLICY IF EXISTS "meal_completions_update" ON public.meal_completions;

CREATE POLICY "meal_completions_select" ON public.meal_completions
  FOR SELECT USING (
    completed_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.meal_plans mp WHERE mp.id = meal_plan_id
        AND (mp.created_by = auth.uid()
          OR (mp.household_id IS NOT NULL AND public.is_household_member(mp.household_id)))
    )
  );
CREATE POLICY "meal_completions_insert" ON public.meal_completions
  FOR INSERT WITH CHECK (completed_by = auth.uid());
CREATE POLICY "meal_completions_update" ON public.meal_completions
  FOR UPDATE USING (completed_by = auth.uid());

-- vitamins
DROP POLICY IF EXISTS "vitamins_select" ON public.vitamins;
DROP POLICY IF EXISTS "vitamins_insert" ON public.vitamins;
DROP POLICY IF EXISTS "vitamins_update" ON public.vitamins;
DROP POLICY IF EXISTS "vitamins_delete" ON public.vitamins;

CREATE POLICY "vitamins_select" ON public.vitamins
  FOR SELECT USING (public.is_household_member(household_id));
CREATE POLICY "vitamins_insert" ON public.vitamins
  FOR INSERT WITH CHECK (public.can_write_to_household(household_id));
CREATE POLICY "vitamins_update" ON public.vitamins
  FOR UPDATE USING (public.can_write_to_household(household_id));
CREATE POLICY "vitamins_delete" ON public.vitamins
  FOR DELETE USING (public.user_household_role(household_id) = 'owner');

-- pet_vitamins
DROP POLICY IF EXISTS "pet_vitamins_select" ON public.pet_vitamins;
DROP POLICY IF EXISTS "pet_vitamins_insert" ON public.pet_vitamins;
DROP POLICY IF EXISTS "pet_vitamins_update" ON public.pet_vitamins;
DROP POLICY IF EXISTS "pet_vitamins_delete" ON public.pet_vitamins;

CREATE POLICY "pet_vitamins_select" ON public.pet_vitamins
  FOR SELECT USING (
    assigned_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.pets p WHERE p.id = pet_id
        AND (p.user_id = auth.uid()
          OR (p.household_id IS NOT NULL AND public.is_household_member(p.household_id)))
    )
  );
CREATE POLICY "pet_vitamins_insert" ON public.pet_vitamins
  FOR INSERT WITH CHECK (assigned_by = auth.uid());
CREATE POLICY "pet_vitamins_update" ON public.pet_vitamins
  FOR UPDATE USING (assigned_by = auth.uid());
CREATE POLICY "pet_vitamins_delete" ON public.pet_vitamins
  FOR DELETE USING (assigned_by = auth.uid());

-- vitamin_logs
DROP POLICY IF EXISTS "vitamin_logs_select" ON public.vitamin_logs;
DROP POLICY IF EXISTS "vitamin_logs_insert" ON public.vitamin_logs;
DROP POLICY IF EXISTS "vitamin_logs_update" ON public.vitamin_logs;

CREATE POLICY "vitamin_logs_select" ON public.vitamin_logs
  FOR SELECT USING (
    logged_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.pets p WHERE p.id = pet_id
        AND (p.user_id = auth.uid()
          OR (p.household_id IS NOT NULL AND public.is_household_member(p.household_id)))
    )
  );
CREATE POLICY "vitamin_logs_insert" ON public.vitamin_logs
  FOR INSERT WITH CHECK (logged_by = auth.uid());
CREATE POLICY "vitamin_logs_update" ON public.vitamin_logs
  FOR UPDATE USING (logged_by = auth.uid());

-- risk_monitoring_sessions
DROP POLICY IF EXISTS "risk_sessions_select" ON public.risk_monitoring_sessions;
DROP POLICY IF EXISTS "risk_sessions_insert" ON public.risk_monitoring_sessions;
DROP POLICY IF EXISTS "risk_sessions_update" ON public.risk_monitoring_sessions;
DROP POLICY IF EXISTS "risk_sessions_delete" ON public.risk_monitoring_sessions;

CREATE POLICY "risk_sessions_select" ON public.risk_monitoring_sessions
  FOR SELECT USING (
    created_by = auth.uid()
    OR (household_id IS NOT NULL AND public.is_household_member(household_id))
  );
CREATE POLICY "risk_sessions_insert" ON public.risk_monitoring_sessions
  FOR INSERT WITH CHECK (
    created_by = auth.uid()
    AND (household_id IS NULL OR public.can_write_to_household(household_id))
  );
CREATE POLICY "risk_sessions_update" ON public.risk_monitoring_sessions
  FOR UPDATE USING (
    created_by = auth.uid()
    OR (household_id IS NOT NULL AND public.can_write_to_household(household_id))
  );
CREATE POLICY "risk_sessions_delete" ON public.risk_monitoring_sessions
  FOR DELETE USING (created_by = auth.uid());

-- alerts (replace v1 "ALL" policy, add household support)
DROP POLICY IF EXISTS "alerts: user owns row" ON public.alerts;
DROP POLICY IF EXISTS "alerts_select"         ON public.alerts;
DROP POLICY IF EXISTS "alerts_insert"         ON public.alerts;
DROP POLICY IF EXISTS "alerts_update"         ON public.alerts;
DROP POLICY IF EXISTS "alerts_delete"         ON public.alerts;

CREATE POLICY "alerts_select" ON public.alerts
  FOR SELECT USING (
    user_id = auth.uid()
    OR (household_id IS NOT NULL AND public.is_household_member(household_id))
  );
CREATE POLICY "alerts_insert" ON public.alerts
  FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "alerts_update" ON public.alerts
  FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "alerts_delete" ON public.alerts
  FOR DELETE USING (user_id = auth.uid());

-- ── VIEWS ─────────────────────────────────────────────────

CREATE OR REPLACE VIEW public.active_treatment_plans_view AS
SELECT
  tp.*,
  p.name        AS pet_name,
  p.photo_url   AS pet_photo_url,
  (SELECT COUNT(*)::INTEGER FROM public.treatment_logs tl WHERE tl.treatment_plan_id = tp.id) AS days_logged,
  CASE
    WHEN tp.end_date IS NOT NULL AND tp.start_date <= tp.end_date
    THEN GREATEST(0, LEAST(100,
      ROUND((CURRENT_DATE - tp.start_date)::NUMERIC /
        NULLIF((tp.end_date - tp.start_date)::NUMERIC, 0) * 100)
    ))
    ELSE NULL
  END AS progress_percent
FROM public.treatment_plans tp
JOIN public.pets p ON p.id = tp.pet_id
WHERE tp.is_active = TRUE;

CREATE OR REPLACE VIEW public.todays_vitamins_view AS
SELECT
  pv.id           AS pet_vitamin_id,
  pv.pet_id,
  p.name          AS pet_name,
  v.id            AS vitamin_id,
  v.name          AS vitamin_name,
  v.dose,
  v.frequency,
  v.days_of_week,
  pv.is_active    AS assignment_active,
  vl.id           AS log_id,
  vl.given_at     AS completed_at
FROM public.pet_vitamins pv
JOIN public.pets p   ON p.id  = pv.pet_id
JOIN public.vitamins v ON v.id = pv.vitamin_id
LEFT JOIN public.vitamin_logs vl
  ON vl.pet_vitamin_id = pv.id AND vl.log_date = CURRENT_DATE
WHERE pv.is_active = TRUE
  AND v.is_active  = TRUE
  AND (pv.end_date IS NULL OR pv.end_date >= CURRENT_DATE);

-- ── REALTIME ──────────────────────────────────────────────
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.log_entries;
EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.behavior_observations;
EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.household_members;
EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.treatment_logs;
EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.meal_completions;
EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.vitamin_logs;
EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.risk_monitoring_sessions;
EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.alerts;
EXCEPTION WHEN others THEN NULL; END $$;

-- ── STORAGE — bucket already exists, just ensure policies ─
-- The pet-photos bucket was created manually. These policies
-- ensure proper access control (DROP IF EXISTS first to avoid conflicts).
DROP POLICY IF EXISTS "pet-photos: authenticated upload" ON storage.objects;
DROP POLICY IF EXISTS "pet-photos: public read"          ON storage.objects;
DROP POLICY IF EXISTS "pet-photos: owner delete"         ON storage.objects;
DROP POLICY IF EXISTS "pet_photos_upload"                ON storage.objects;
DROP POLICY IF EXISTS "pet_photos_read"                  ON storage.objects;
DROP POLICY IF EXISTS "pet_photos_delete"                ON storage.objects;

CREATE POLICY "pet_photos_upload" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'pet-photos');

CREATE POLICY "pet_photos_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'pet-photos');

CREATE POLICY "pet_photos_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'pet-photos' AND auth.uid() = owner);

-- ============================================================
-- HOUSEHOLD CREATION RPC (SECURITY DEFINER — bypasses RLS)
-- Wraps INSERT into households + household_members atomically
-- so that the JWT propagation issue doesn't block creation.
-- ============================================================

CREATE OR REPLACE FUNCTION public.create_household(
  p_name        TEXT,
  p_description TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid          UUID := auth.uid();
  v_household_id UUID;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Insert the household (owner_id = calling user)
  INSERT INTO public.households (name, description, owner_id)
  VALUES (p_name, p_description, v_uid)
  RETURNING id INTO v_household_id;

  -- Add the creator as owner member
  INSERT INTO public.household_members (household_id, user_id, role, is_active)
  VALUES (v_household_id, v_uid, 'owner', true)
  ON CONFLICT (household_id, user_id) DO NOTHING;

  RETURN json_build_object(
    'id',          v_household_id,
    'name',        p_name,
    'description', p_description,
    'owner_id',    v_uid
  );
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.create_household(TEXT, TEXT) TO authenticated;

-- ============================================================
-- MEAL EVENTS — multi-pet group feeding
-- ============================================================

CREATE TABLE IF NOT EXISTS public.meal_events (
  id           UUID        DEFAULT uuid_generate_v4() PRIMARY KEY,
  household_id UUID        REFERENCES public.households(id) ON DELETE SET NULL,
  logged_by    UUID        REFERENCES public.profiles(id)   ON DELETE SET NULL,
  slot_label   TEXT        NOT NULL,
  food_type    TEXT,
  notes        TEXT,
  vitamins     TEXT[]      DEFAULT '{}',
  occurred_at  TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  created_at   TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.meal_event_pets (
  id            UUID    DEFAULT uuid_generate_v4() PRIMARY KEY,
  meal_event_id UUID    REFERENCES public.meal_events(id) ON DELETE CASCADE NOT NULL,
  pet_id        UUID    REFERENCES public.pets(id)        ON DELETE CASCADE NOT NULL,
  meal_plan_id  UUID    REFERENCES public.meal_plans(id)  ON DELETE SET NULL,
  did_eat       BOOLEAN DEFAULT TRUE NOT NULL,
  notes         TEXT,
  UNIQUE (meal_event_id, pet_id)
);

ALTER TABLE public.meal_completions
  ADD COLUMN IF NOT EXISTS vitamins_given TEXT[] DEFAULT '{}';

CREATE INDEX IF NOT EXISTS idx_meal_events_household   ON public.meal_events(household_id);
CREATE INDEX IF NOT EXISTS idx_meal_events_logged_by   ON public.meal_events(logged_by);
CREATE INDEX IF NOT EXISTS idx_meal_events_occurred_at ON public.meal_events(occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_meal_event_pets_event   ON public.meal_event_pets(meal_event_id);
CREATE INDEX IF NOT EXISTS idx_meal_event_pets_pet     ON public.meal_event_pets(pet_id);

-- RLS for meal_events
ALTER TABLE public.meal_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "household members can read meal_events"
  ON public.meal_events FOR SELECT
  USING (public.is_household_member(household_id));

CREATE POLICY "household members can insert meal_events"
  ON public.meal_events FOR INSERT
  WITH CHECK (public.can_write_to_household(household_id));

CREATE POLICY "logged_by user can update meal_events"
  ON public.meal_events FOR UPDATE
  USING (logged_by = auth.uid());

CREATE POLICY "logged_by user can delete meal_events"
  ON public.meal_events FOR DELETE
  USING (logged_by = auth.uid());

-- RLS for meal_event_pets
ALTER TABLE public.meal_event_pets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "household members can read meal_event_pets"
  ON public.meal_event_pets FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.meal_events me
      JOIN public.household_members hm ON hm.household_id = me.household_id
      WHERE me.id = meal_event_pets.meal_event_id
        AND hm.user_id = auth.uid()
        AND hm.is_active = TRUE
    )
  );

CREATE POLICY "household members can insert meal_event_pets"
  ON public.meal_event_pets FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.meal_events me
      JOIN public.household_members hm ON hm.household_id = me.household_id
      WHERE me.id = meal_event_pets.meal_event_id
        AND hm.user_id = auth.uid()
        AND hm.is_active = TRUE
        AND hm.role IN ('owner', 'member')
    )
  );

-- ============================================================
-- DONE ✓
-- All v2 tables, indexes, RLS policies, and functions created.
-- ============================================================
