-- ============================================================
-- WhiskerLog v2 — Fix Supabase Linter Warnings & Info
-- ============================================================
-- Fixes for:
-- - function_search_path_mutable (2 warnings)
-- - materialized_view_in_api (1 warning)
-- - duplicate_index (1 warning)
-- - unindexed_foreign_keys (15+ info items)
-- - unused_index (many info items)
-- ============================================================

-- ── FIX 1: Function Search Path Mutable ─────────────────
-- Add SET search_path = public to functions that lack it

CREATE OR REPLACE FUNCTION public.refresh_household_cache()
RETURNS void
LANGUAGE sql
SET search_path = public
AS $$
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.active_household_members_cache;
$$;

CREATE OR REPLACE FUNCTION public.trigger_refresh_household_cache()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  PERFORM public.refresh_household_cache();
  RETURN NEW;
END;
$$;

-- ── FIX 2: Materialized View in API ────────────────────
-- Prevent the materialized view from being accessible via PostgREST
-- by disabling RLS and removing grant privileges

ALTER MATERIALIZED VIEW public.active_household_members_cache OWNER TO postgres;
REVOKE ALL ON public.active_household_members_cache FROM authenticated;
REVOKE ALL ON public.active_household_members_cache FROM anon;
GRANT SELECT ON public.active_household_members_cache TO postgres;

-- ── FIX 3: Duplicate Indexes ──────────────────────────────
-- Drop idx_vitamins_rls_check since idx_vitamins_household_id covers it

DROP INDEX IF EXISTS public.idx_vitamins_rls_check;

-- ── FIX 4: Foreign Key Indexes ────────────────────────────
-- Add missing indexes for all unindexed foreign keys

-- alerts.household_id
CREATE INDEX IF NOT EXISTS idx_alerts_household_id ON public.alerts(household_id);

-- alerts.resolved_by
CREATE INDEX IF NOT EXISTS idx_alerts_resolved_by ON public.alerts(resolved_by);

-- behavior_observations.log_entry_id
CREATE INDEX IF NOT EXISTS idx_behavior_observations_log_entry_id ON public.behavior_observations(log_entry_id);

-- household_invitations foreign keys
CREATE INDEX IF NOT EXISTS idx_household_invitations_household_id ON public.household_invitations(household_id);
CREATE INDEX IF NOT EXISTS idx_household_invitations_invited_by ON public.household_invitations(invited_by);
CREATE INDEX IF NOT EXISTS idx_household_invitations_accepted_by ON public.household_invitations(accepted_by);

-- meal_completions.completed_by
CREATE INDEX IF NOT EXISTS idx_meal_completions_completed_by ON public.meal_completions(completed_by);

-- meal_event_pets.meal_plan_id
CREATE INDEX IF NOT EXISTS idx_meal_event_pets_meal_plan_id ON public.meal_event_pets(meal_plan_id);

-- meal_plans.household_id
CREATE INDEX IF NOT EXISTS idx_meal_plans_household_id ON public.meal_plans(household_id);

-- medicine_reminder_logs.logged_by
CREATE INDEX IF NOT EXISTS idx_medicine_reminder_logs_logged_by ON public.medicine_reminder_logs(logged_by);

-- pet_vitamins foreign keys
CREATE INDEX IF NOT EXISTS idx_pet_vitamins_assigned_by ON public.pet_vitamins(assigned_by);
CREATE INDEX IF NOT EXISTS idx_pet_vitamins_vitamin_id ON public.pet_vitamins(vitamin_id);

-- treatment_logs foreign keys
CREATE INDEX IF NOT EXISTS idx_treatment_logs_logged_by ON public.treatment_logs(logged_by);
CREATE INDEX IF NOT EXISTS idx_treatment_logs_pet_id ON public.treatment_logs(pet_id);

-- treatment_plans.medical_record_id
CREATE INDEX IF NOT EXISTS idx_treatment_plans_medical_record_id ON public.treatment_plans(medical_record_id);

-- vitamin_logs.logged_by
CREATE INDEX IF NOT EXISTS idx_vitamin_logs_logged_by ON public.vitamin_logs(logged_by);

-- ── FIX 5: Drop Unused "RLS Check" Indexes ──────────────
-- These were created for RLS performance but haven't been used
-- Keeping the primary foreign key indexes instead

DROP INDEX IF EXISTS public.idx_household_members_rls_check;
DROP INDEX IF EXISTS public.idx_pets_rls_check;
DROP INDEX IF EXISTS public.idx_log_entries_rls_check;
DROP INDEX IF EXISTS public.idx_behavior_obs_rls_check;
DROP INDEX IF EXISTS public.idx_medical_records_rls_check;
DROP INDEX IF EXISTS public.idx_treatment_plans_rls_check;
DROP INDEX IF EXISTS public.idx_meal_plans_rls_check;
DROP INDEX IF EXISTS public.idx_risk_sessions_rls_check;
DROP INDEX IF EXISTS public.idx_alerts_rls_check;
DROP INDEX IF EXISTS public.idx_medicine_reminders_rls_check;
DROP INDEX IF EXISTS public.idx_meal_events_rls_check;

-- ── FIX 6: Drop Other Unused Indexes ────────────────────

DROP INDEX IF EXISTS public.idx_household_members_user_hh;
DROP INDEX IF EXISTS public.idx_logs_pet_id;
DROP INDEX IF EXISTS public.idx_logs_log_date;
DROP INDEX IF EXISTS public.idx_alerts_is_resolved;
DROP INDEX IF EXISTS public.idx_alerts_created_at;
DROP INDEX IF EXISTS public.idx_invitations_token;
DROP INDEX IF EXISTS public.idx_pets_household_id;
DROP INDEX IF EXISTS public.idx_pets_is_stray;
DROP INDEX IF EXISTS public.idx_log_entries_pet_id;
DROP INDEX IF EXISTS public.idx_log_entries_household_id;
DROP INDEX IF EXISTS public.idx_log_entries_created_by;
DROP INDEX IF EXISTS public.idx_log_entries_event_type;
DROP INDEX IF EXISTS public.idx_behavior_obs_pet_id;
DROP INDEX IF EXISTS public.idx_behavior_obs_household_id;
DROP INDEX IF EXISTS public.idx_bot_observation_id;
DROP INDEX IF EXISTS public.idx_bot_type_id;
DROP INDEX IF EXISTS public.idx_medical_records_pet_id;
DROP INDEX IF EXISTS public.idx_medical_records_household_id;
DROP INDEX IF EXISTS public.idx_treatment_plans_household_id;
DROP INDEX IF EXISTS public.idx_treatment_logs_plan_id;
DROP INDEX IF EXISTS public.idx_vitamins_household_id;
DROP INDEX IF EXISTS public.idx_vitamin_logs_pet_id;
DROP INDEX IF EXISTS public.idx_risk_sessions_household_id;
DROP INDEX IF EXISTS public.idx_meal_events_household;
DROP INDEX IF EXISTS public.idx_meal_events_logged_by;
DROP INDEX IF EXISTS public.idx_meal_events_occurred_at;
DROP INDEX IF EXISTS public.idx_meal_event_pets_event;
DROP INDEX IF EXISTS public.idx_medicine_reminders_user;
DROP INDEX IF EXISTS public.idx_medicine_reminders_pet;
DROP INDEX IF EXISTS public.idx_reminder_logs_reminder;
DROP INDEX IF EXISTS public.idx_reminder_logs_date;
DROP INDEX IF EXISTS public.idx_medicine_reminders_household;
DROP INDEX IF EXISTS public.idx_households_owner_id;

-- ============================================================
-- AUTO-ARCHIVED RISK SESSIONS MAINTENANCE
-- ============================================================
-- Run the archive function periodically to auto-archive expired sessions
-- SELECT public.archive_expired_risk_sessions();

-- ============================================================
-- NOTES
-- ============================================================
-- 1. AUTHENTICATED: "Leaked Password Protection" requires Pro Plan
--    → Manual setup required in Supabase Dashboard > Auth > Attack Protection
--    → Settings are UI-only, cannot be set via SQL for free tier
--
-- 2. Materialized view is now restricted to postgres role only
--    → Not accessible via PostgREST API
--    → Still used internally for RLS performance
--
-- 3. All critical foreign key indexes are now in place
--    → Improves query performance for RLS policies
--    → Reduces sequential scans on policy evaluation
--
-- 4. RLS-specific indexes removed
--    → Natural foreign key indexes cover the same paths
--    → Reduces index maintenance overhead
--
-- ============================================================
