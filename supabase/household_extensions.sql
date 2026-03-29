-- ============================================================
-- WhiskerLog v2 — Multi-User Household System Extensions
-- ============================================================
-- This migration adds activity audit logging, member management,
-- and complete household attribution tracking.
--
-- Run this AFTER the main migration (run_in_supabase.sql)
-- ============================================================

-- ── ACTIVITY AUDIT LOG TABLE ──────────────────────────────
-- Tracks all user actions for attribution and activity feed

CREATE TABLE IF NOT EXISTS public.activity_audit_logs (
  id              UUID        DEFAULT uuid_generate_v4() PRIMARY KEY,
  household_id    UUID        REFERENCES public.households(id) ON DELETE CASCADE NOT NULL,
  user_id         UUID        REFERENCES public.profiles(id) ON DELETE SET NULL,
  action_type     TEXT        NOT NULL,  -- 'fed_pet', 'logged_medicine', 'logged_behavior', 'added_member', etc.
  resource_type   TEXT        NOT NULL,  -- 'pet', 'log_entry', 'medical_record', 'meal_completion', 'behavior_observation', etc.
  resource_id     UUID,                  -- ID of the affected resource (e.g., meal_completion.id)
  resource_name   TEXT,                  -- Human-readable name (e.g., "Oreo", "Medication: Amoxicillin")
  description     TEXT        NOT NULL,  -- User-facing description: "Rawan fed Oreo - Dry kibble, 100g"
  metadata        JSONB       DEFAULT '{}',  -- Additional context (e.g., dosage, amount, severity)
  created_at      TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_activity_logs_household   ON public.activity_audit_logs(household_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_user       ON public.activity_audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON public.activity_audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_logs_resource   ON public.activity_audit_logs(household_id, resource_type, created_at DESC);

-- ── RLS FOR ACTIVITY AUDIT LOGS ─────────────────────────

ALTER TABLE public.activity_audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "activity_logs_select" ON public.activity_audit_logs;
DROP POLICY IF EXISTS "activity_logs_insert" ON public.activity_audit_logs;

CREATE POLICY "activity_logs_select" ON public.activity_audit_logs
  FOR SELECT USING (public.is_household_member(household_id));

CREATE POLICY "activity_logs_insert" ON public.activity_audit_logs
  FOR INSERT WITH CHECK (public.can_write_to_household(household_id));

-- ── ACTIVITY FEED VIEW (with user details) ─────────────

DROP VIEW IF EXISTS public.activity_feed_view;
CREATE VIEW public.activity_feed_view WITH (security_invoker = on) AS
SELECT
  aal.id,
  aal.household_id,
  aal.user_id,
  COALESCE(p.display_name, p.full_name, 'Unknown User') AS user_name,
  p.avatar_url AS user_avatar,
  aal.action_type,
  aal.resource_type,
  aal.resource_id,
  aal.resource_name,
  aal.description,
  aal.metadata,
  aal.created_at,
  -- Time-relative formatting
  CASE
    WHEN (NOW() - aal.created_at) < INTERVAL '1 minute' THEN 'just now'
    WHEN (NOW() - aal.created_at) < INTERVAL '1 hour' THEN CONCAT(
      FLOOR(EXTRACT(EPOCH FROM (NOW() - aal.created_at)) / 60)::INT, ' min ago'
    )
    WHEN (NOW() - aal.created_at) < INTERVAL '1 day' THEN CONCAT(
      FLOOR(EXTRACT(EPOCH FROM (NOW() - aal.created_at)) / 3600)::INT, ' hrs ago'
    )
    ELSE TO_CHAR(aal.created_at, 'MMM DD, YYYY HH12:MI AM')
  END AS time_ago
FROM public.activity_audit_logs aal
LEFT JOIN public.profiles p ON p.id = aal.user_id
ORDER BY aal.created_at DESC;

-- ── TRIGGER FUNCTIONS FOR AUTOMATIC ACTIVITY LOGGING ────

-- Log when meal completion is recorded
CREATE OR REPLACE FUNCTION public.log_meal_completion_activity()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_pet_name       TEXT;
  v_user_name      TEXT;
  v_food_type      TEXT;
  v_portion        TEXT;
  v_description    TEXT;
BEGIN
  SELECT p.name INTO v_pet_name FROM public.pets p WHERE p.id = NEW.pet_id;
  SELECT COALESCE(pr.display_name, pr.full_name, 'Someone')
    INTO v_user_name FROM public.profiles pr WHERE pr.id = NEW.completed_by;
  
  -- Extract food info from meal plan if available
  SELECT mp.food_type, mp.portion_grams::TEXT
    INTO v_food_type, v_portion
    FROM public.meal_plans mp WHERE mp.id = NEW.meal_plan_id;
  
  v_description := CONCAT(
    COALESCE(v_user_name, 'Someone'),
    ' fed ',
    COALESCE(v_pet_name, 'a pet'),
    CASE WHEN v_food_type IS NOT NULL THEN CONCAT(' - ', v_food_type) ELSE '' END,
    CASE WHEN v_portion IS NOT NULL THEN CONCAT(', ', v_portion, 'g') ELSE '' END
  );
  
  INSERT INTO public.activity_audit_logs (
    household_id, user_id, action_type, resource_type, resource_id,
    resource_name, description, metadata
  ) VALUES (
    NEW.meal_plan_id, NEW.completed_by, 'fed_pet', 'meal_completion',
    NEW.id, COALESCE(v_pet_name, 'Unknown Pet'), v_description,
    jsonb_build_object('meal_plan_id', NEW.meal_plan_id, 'food_type', v_food_type, 'portion_g', v_portion)
  );
  
  RETURN NEW;
END;
$$;

-- Log when treatment is recorded
CREATE OR REPLACE FUNCTION public.log_treatment_activity()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_pet_name       TEXT;
  v_user_name      TEXT;
  v_plan_title     TEXT;
  v_description    TEXT;
BEGIN
  SELECT p.name INTO v_pet_name FROM public.pets p WHERE p.id = NEW.pet_id;
  SELECT COALESCE(pr.display_name, pr.full_name, 'Someone')
    INTO v_user_name FROM public.profiles pr WHERE pr.id = NEW.logged_by;
  SELECT tp.title INTO v_plan_title FROM public.treatment_plans tp
    WHERE tp.id = NEW.treatment_plan_id;
  
  v_description := CONCAT(
    COALESCE(v_user_name, 'Someone'),
    ' logged treatment for ',
    COALESCE(v_pet_name, 'a pet'),
    CASE WHEN v_plan_title IS NOT NULL THEN CONCAT(' - ', v_plan_title) ELSE '' END
  );
  
  INSERT INTO public.activity_audit_logs (
    household_id, user_id, action_type, resource_type, resource_id,
    resource_name, description, metadata
  )
  SELECT
    tp.household_id, NEW.logged_by, 'gave_medication', 'treatment_log',
    NEW.id, COALESCE(v_pet_name, 'Unknown Pet'), v_description,
    jsonb_build_object('treatment_plan_id', NEW.treatment_plan_id, 'completed_items', NEW.completed_items)
  FROM public.treatment_plans tp WHERE tp.id = NEW.treatment_plan_id;
  
  RETURN NEW;
END;
$$;

-- Log when behavior is recorded
CREATE OR REPLACE FUNCTION public.log_behavior_activity()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_pet_name       TEXT;
  v_user_name      TEXT;
  v_behavior_slugs TEXT;
  v_description    TEXT;
BEGIN
  SELECT p.name INTO v_pet_name FROM public.pets p WHERE p.id = NEW.pet_id;
  SELECT COALESCE(pr.display_name, pr.full_name, 'Someone')
    INTO v_user_name FROM public.profiles pr WHERE pr.id = NEW.created_by;
  
  v_behavior_slugs := ARRAY_TO_STRING(NEW.behavior_slugs, ', ');
  v_description := CONCAT(
    COALESCE(v_user_name, 'Someone'),
    ' observed behavior for ',
    COALESCE(v_pet_name, 'a pet'),
    ' (',
    COALESCE(NEW.severity, 'unknown'),
    ') - ',
    COALESCE(v_behavior_slugs, 'undocumented')
  );
  
  INSERT INTO public.activity_audit_logs (
    household_id, user_id, action_type, resource_type, resource_id,
    resource_name, description, metadata
  ) VALUES (
    NEW.household_id, NEW.created_by, 'observed_behavior', 'behavior_observation',
    NEW.id, COALESCE(v_pet_name, 'Unknown Pet'), v_description,
    jsonb_build_object('severity', NEW.severity, 'behaviors', NEW.behavior_slugs)
  );
  
  RETURN NEW;
END;
$$;

-- Log when medical record is created
CREATE OR REPLACE FUNCTION public.log_medical_record_activity()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_pet_name       TEXT;
  v_user_name      TEXT;
  v_reason         TEXT;
  v_description    TEXT;
BEGIN
  SELECT p.name INTO v_pet_name FROM public.pets p WHERE p.id = NEW.pet_id;
  SELECT COALESCE(pr.display_name, pr.full_name, 'Someone')
    INTO v_user_name FROM public.profiles pr WHERE pr.id = NEW.created_by;
  
  v_reason := NEW.visit_reason;
  v_description := CONCAT(
    COALESCE(v_user_name, 'Someone'),
    ' logged medical visit for ',
    COALESCE(v_pet_name, 'a pet'),
    CASE WHEN v_reason IS NOT NULL THEN CONCAT(' - ', v_reason) ELSE '' END
  );
  
  INSERT INTO public.activity_audit_logs (
    household_id, user_id, action_type, resource_type, resource_id,
    resource_name, description, metadata
  ) VALUES (
    NEW.household_id, NEW.created_by, 'medical_visit', 'medical_record',
    NEW.id, COALESCE(v_pet_name, 'Unknown Pet'), v_description,
    jsonb_build_object('clinic', NEW.clinic_name, 'vet', NEW.vet_name, 'reason', v_reason)
  );
  
  RETURN NEW;
END;
$$;

-- Log when member joins/is added
CREATE OR REPLACE FUNCTION public.log_member_added_activity()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_member_name    TEXT;
  v_added_by_name  TEXT;
  v_description    TEXT;
  v_adder_uid      UUID;
BEGIN
  SELECT COALESCE(p.display_name, p.full_name, 'Unknown User')
    INTO v_member_name FROM public.profiles p WHERE p.id = NEW.user_id;
  
  -- Get the user who added this member (from session context or last_modified_by)
  -- For now, we'll log it as system action if we can't determine
  v_added_by_name := 'System';
  
  v_description := CONCAT(
    v_added_by_name,
    ' added ',
    COALESCE(v_member_name, 'Unknown User'),
    ' as ',
    COALESCE(NEW.role, 'member'),
    ' to the household'
  );
  
  INSERT INTO public.activity_audit_logs (
    household_id, user_id, action_type, resource_type, resource_id,
    resource_name, description, metadata
  ) VALUES (
    NEW.household_id, (SELECT auth.uid()), 'added_member', 'household_member',
    NEW.id, COALESCE(v_member_name, 'Unknown User'), v_description,
    jsonb_build_object('role', NEW.role, 'user_id', NEW.user_id)
  );
  
  RETURN NEW;
END;
$$;

-- Log when member is removed
CREATE OR REPLACE FUNCTION public.log_member_removed_activity()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_member_name    TEXT;
  v_description    TEXT;
BEGIN
  IF OLD.is_active = TRUE AND NEW.is_active = FALSE THEN
    SELECT COALESCE(p.display_name, p.full_name, 'Unknown User')
      INTO v_member_name FROM public.profiles p WHERE p.id = NEW.user_id;
    
    v_description := CONCAT(
      'System',
      ' removed ',
      COALESCE(v_member_name, 'Unknown User'),
      ' from the household'
    );
    
    INSERT INTO public.activity_audit_logs (
      household_id, user_id, action_type, resource_type, resource_id,
      resource_name, description, metadata
    ) VALUES (
      NEW.household_id, (SELECT auth.uid()), 'removed_member', 'household_member',
      NEW.id, COALESCE(v_member_name, 'Unknown User'), v_description,
      jsonb_build_object('previous_role', OLD.role, 'user_id', NEW.user_id)
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- ── CREATE TRIGGERS ────────────────────────────────────

DO $$ BEGIN
  DROP TRIGGER IF EXISTS trigger_log_meal_completion ON public.meal_completions;
EXCEPTION WHEN others THEN NULL; END $$;

DO $$ BEGIN
  CREATE TRIGGER trigger_log_meal_completion
    AFTER INSERT ON public.meal_completions
    FOR EACH ROW EXECUTE FUNCTION public.log_meal_completion_activity();
EXCEPTION WHEN others THEN NULL; END $$;

DO $$ BEGIN
  DROP TRIGGER IF EXISTS trigger_log_treatment ON public.treatment_logs;
EXCEPTION WHEN others THEN NULL; END $$;

DO $$ BEGIN
  CREATE TRIGGER trigger_log_treatment
    AFTER INSERT ON public.treatment_logs
    FOR EACH ROW EXECUTE FUNCTION public.log_treatment_activity();
EXCEPTION WHEN others THEN NULL; END $$;

DO $$ BEGIN
  DROP TRIGGER IF EXISTS trigger_log_behavior ON public.behavior_observations;
EXCEPTION WHEN others THEN NULL; END $$;

DO $$ BEGIN
  CREATE TRIGGER trigger_log_behavior
    AFTER INSERT ON public.behavior_observations
    FOR EACH ROW EXECUTE FUNCTION public.log_behavior_activity();
EXCEPTION WHEN others THEN NULL; END $$;

DO $$ BEGIN
  DROP TRIGGER IF EXISTS trigger_log_medical ON public.medical_records;
EXCEPTION WHEN others THEN NULL; END $$;

DO $$ BEGIN
  CREATE TRIGGER trigger_log_medical
    AFTER INSERT ON public.medical_records
    FOR EACH ROW EXECUTE FUNCTION public.log_medical_record_activity();
EXCEPTION WHEN others THEN NULL; END $$;

DO $$ BEGIN
  DROP TRIGGER IF EXISTS trigger_log_member_added ON public.household_members;
EXCEPTION WHEN others THEN NULL; END $$;

DO $$ BEGIN
  CREATE TRIGGER trigger_log_member_added
    AFTER INSERT ON public.household_members
    FOR EACH ROW WHEN (NEW.is_active = TRUE)
    EXECUTE FUNCTION public.log_member_added_activity();
EXCEPTION WHEN others THEN NULL; END $$;

DO $$ BEGIN
  DROP TRIGGER IF EXISTS trigger_log_member_removed ON public.household_members;
EXCEPTION WHEN others THEN NULL; END $$;

DO $$ BEGIN
  CREATE TRIGGER trigger_log_member_removed
    AFTER UPDATE ON public.household_members
    FOR EACH ROW WHEN (OLD.is_active IS DISTINCT FROM NEW.is_active)
    EXECUTE FUNCTION public.log_member_removed_activity();
EXCEPTION WHEN others THEN NULL; END $$;

-- ── MEMBER MANAGEMENT CONSTRAINTS ──────────────────────

-- Prevent self-removal from household
DROP FUNCTION IF EXISTS public.check_cannot_remove_self() CASCADE;
CREATE OR REPLACE FUNCTION public.check_cannot_remove_self()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF (SELECT auth.uid()) = NEW.user_id AND OLD.is_active = TRUE AND NEW.is_active = FALSE THEN
    RAISE EXCEPTION 'Cannot remove yourself from household. Transfer ownership first.';
  END IF;
  RETURN NEW;
END;
$$;

DO $$ BEGIN
  DROP TRIGGER IF EXISTS prevent_self_removal ON public.household_members;
EXCEPTION WHEN others THEN NULL; END $$;

DO $$ BEGIN
  CREATE TRIGGER prevent_self_removal
    BEFORE UPDATE ON public.household_members
    FOR EACH ROW EXECUTE FUNCTION public.check_cannot_remove_self();
EXCEPTION WHEN others THEN NULL; END $$;

-- Ensure at least one owner remains
DROP FUNCTION IF EXISTS public.check_owner_exists() CASCADE;
CREATE OR REPLACE FUNCTION public.check_owner_exists()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  v_owner_count INTEGER;
BEGIN
  SELECT COUNT(*)::INTEGER INTO v_owner_count
    FROM public.household_members
    WHERE household_id = NEW.household_id
      AND role = 'owner'
      AND is_active = TRUE
      AND user_id != NEW.user_id;
  
  IF v_owner_count = 0 THEN
    RAISE EXCEPTION 'Household must have at least one owner';
  END IF;
  
  RETURN NEW;
END;
$$;

DO $$ BEGIN
  DROP TRIGGER IF EXISTS ensure_owner_exists ON public.household_members;
EXCEPTION WHEN others THEN NULL; END $$;

DO $$ BEGIN
  CREATE TRIGGER ensure_owner_exists
    BEFORE UPDATE OF role ON public.household_members
    FOR EACH ROW
    WHEN (OLD.role = 'owner' AND NEW.role != 'owner')
    EXECUTE FUNCTION public.check_owner_exists();
EXCEPTION WHEN others THEN NULL; END $$;

-- ── HELPER FUNCTIONS FOR HOUSEHOLD OPERATIONS ──────────

-- Get household members with profile info
DROP FUNCTION IF EXISTS public.get_household_members_with_profiles(UUID);
CREATE OR REPLACE FUNCTION public.get_household_members_with_profiles(p_household_id UUID)
RETURNS TABLE (
  member_id UUID,
  user_id UUID,
  user_name TEXT,
  display_name TEXT,
  avatar_url TEXT,
  email TEXT,
  role public.household_role,
  joined_at TIMESTAMPTZ,
  is_active BOOLEAN
) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    hm.id,
    hm.user_id,
    COALESCE(p.display_name, p.full_name) AS user_name,
    p.display_name,
    p.avatar_url,
    p.email,
    hm.role,
    hm.joined_at,
    hm.is_active
  FROM public.household_members hm
  JOIN public.profiles p ON p.id = hm.user_id
  WHERE hm.household_id = p_household_id
  ORDER BY hm.is_active DESC, COALESCE(p.display_name, p.full_name);
$$;

-- Add this function to GRANT for authenticated users
GRANT EXECUTE ON FUNCTION public.get_household_members_with_profiles(UUID) TO authenticated;

-- ── REALTIME PUBLICATION ──────────────────────────────

DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.activity_audit_logs;
EXCEPTION WHEN others THEN NULL; END $$;

-- ============================================================
-- END OF HOUSEHOLD SYSTEM EXTENSIONS
-- ============================================================

