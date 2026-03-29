-- ============================================================
-- WhiskerLog v2 Migration: Single-User → Multi-User Households
-- ============================================================
-- This script safely migrates existing data without breaking anything.
-- Run AFTER household_extensions.sql
--
-- ⚠️ BACKUP YOUR DATABASE FIRST ⚠️
-- ============================================================

-- ── LOG MIGRATION STATUS ───────────────────────────────────
-- This will help you track the migration

CREATE TABLE IF NOT EXISTS public.migration_log (
  id          SERIAL PRIMARY KEY,
  migration_name TEXT NOT NULL,
  status      TEXT NOT NULL, -- 'in_progress', 'completed', 'failed'
  details     JSONB,
  started_at  TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- ── PHASE 1: CREATE DEFAULT HOUSEHOLDS ────────────────────
-- For each user, create a personal household if they don't have one

DO $$ 
DECLARE
  v_user_record RECORD;
  v_household_id UUID;
  v_count INTEGER := 0;
BEGIN
  INSERT INTO public.migration_log (migration_name, status, details)
  VALUES ('phase_1_create_households', 'in_progress', '{}')
  ON CONFLICT DO NOTHING;

  FOR v_user_record IN
    SELECT p.id, p.display_name, p.full_name, p.email
    FROM public.profiles p
    WHERE p.id NOT IN (
      SELECT DISTINCT user_id FROM public.household_members WHERE is_active = TRUE
    )
  LOOP
    INSERT INTO public.households (name, description, owner_id)
    VALUES (
      COALESCE(v_user_record.display_name, v_user_record.full_name, 'My Household'),
      CONCAT('Default household for ', v_user_record.email),
      v_user_record.id
    )
    RETURNING id INTO v_household_id;

    INSERT INTO public.household_members (household_id, user_id, role, is_active)
    VALUES (v_household_id, v_user_record.id, 'owner', TRUE);

    v_count := v_count + 1;
  END LOOP;

  RAISE NOTICE 'Created % default households', v_count;

  UPDATE public.migration_log
  SET status = 'completed', completed_at = NOW()
  WHERE migration_name = 'phase_1_create_households';
EXCEPTION WHEN others THEN
  UPDATE public.migration_log
  SET status = 'failed', details = jsonb_build_object('error', SQLERRM)
  WHERE migration_name = 'phase_1_create_households';
  RAISE EXCEPTION 'Phase 1 failed: %', SQLERRM;
END $$;

-- ── PHASE 2: MIGRATE PETS TO HOUSEHOLDS ────────────────────
-- Assign each pet to its owner's default household

DO $$ 
DECLARE
  v_pet_record RECORD;
  v_household_id UUID;
  v_count INTEGER := 0;
BEGIN
  INSERT INTO public.migration_log (migration_name, status, details)
  VALUES ('phase_2_migrate_pets', 'in_progress', '{}')
  ON CONFLICT DO NOTHING;

  FOR v_pet_record IN
    SELECT DISTINCT p.id, p.user_id
    FROM public.pets p
    WHERE p.household_id IS NULL
  LOOP
    -- Get the user's default household (usually the only one they have)
    SELECT h.id INTO v_household_id
    FROM public.households h
    WHERE h.owner_id = v_pet_record.user_id
    LIMIT 1;

    UPDATE public.pets
    SET household_id = v_household_id
    WHERE id = v_pet_record.id;

    v_count := v_count + 1;
  END LOOP;

  RAISE NOTICE 'Migrated % pets to households', v_count;

  UPDATE public.migration_log
  SET status = 'completed', completed_at = NOW()
  WHERE migration_name = 'phase_2_migrate_pets';
EXCEPTION WHEN others THEN
  UPDATE public.migration_log
  SET status = 'failed', details = jsonb_build_object('error', SQLERRM)
  WHERE migration_name = 'phase_2_migrate_pets';
  RAISE EXCEPTION 'Phase 2 failed: %', SQLERRM;
END $$;

-- ── PHASE 3: MIGRATE LOG ENTRIES ──────────────────────────
-- Assign household_id to all log_entries based on their pet's household

DO $$ 
DECLARE
  v_entry_record RECORD;
  v_household_id UUID;
  v_count INTEGER := 0;
BEGIN
  INSERT INTO public.migration_log (migration_name, status, details)
  VALUES ('phase_3_migrate_log_entries', 'in_progress', '{}')
  ON CONFLICT DO NOTHING;

  FOR v_entry_record IN
    SELECT DISTINCT le.id, le.pet_id
    FROM public.log_entries le
    WHERE le.household_id IS NULL
  LOOP
    SELECT p.household_id INTO v_household_id
    FROM public.pets p
    WHERE p.id = v_entry_record.pet_id;

    UPDATE public.log_entries
    SET household_id = v_household_id
    WHERE id = v_entry_record.id;

    v_count := v_count + 1;
  END LOOP;

  RAISE NOTICE 'Migrated % log entries', v_count;

  UPDATE public.migration_log
  SET status = 'completed', completed_at = NOW()
  WHERE migration_name = 'phase_3_migrate_log_entries';
EXCEPTION WHEN others THEN
  UPDATE public.migration_log
  SET status = 'failed', details = jsonb_build_object('error', SQLERRM)
  WHERE migration_name = 'phase_3_migrate_log_entries';
  RAISE EXCEPTION 'Phase 3 failed: %', SQLERRM;
END $$;

-- ── PHASE 4: MIGRATE BEHAVIOR OBSERVATIONS ────────────────

DO $$ 
DECLARE
  v_record RECORD;
  v_household_id UUID;
  v_count INTEGER := 0;
BEGIN
  INSERT INTO public.migration_log (migration_name, status, details)
  VALUES ('phase_4_migrate_behavior', 'in_progress', '{}')
  ON CONFLICT DO NOTHING;

  FOR v_record IN
    SELECT DISTINCT bo.id, bo.pet_id
    FROM public.behavior_observations bo
    WHERE bo.household_id IS NULL
  LOOP
    SELECT p.household_id INTO v_household_id
    FROM public.pets p WHERE p.id = v_record.pet_id;

    UPDATE public.behavior_observations
    SET household_id = v_household_id
    WHERE id = v_record.id;

    v_count := v_count + 1;
  END LOOP;

  RAISE NOTICE 'Migrated % behavior observations', v_count;

  UPDATE public.migration_log
  SET status = 'completed', completed_at = NOW()
  WHERE migration_name = 'phase_4_migrate_behavior';
EXCEPTION WHEN others THEN
  UPDATE public.migration_log
  SET status = 'failed', details = jsonb_build_object('error', SQLERRM)
  WHERE migration_name = 'phase_4_migrate_behavior';
  RAISE EXCEPTION 'Phase 4 failed: %', SQLERRM;
END $$;

-- ── PHASE 5: MIGRATE MEDICAL RECORDS ───────────────────────

DO $$ 
DECLARE
  v_record RECORD;
  v_household_id UUID;
  v_count INTEGER := 0;
BEGIN
  INSERT INTO public.migration_log (migration_name, status, details)
  VALUES ('phase_5_migrate_medical', 'in_progress', '{}')
  ON CONFLICT DO NOTHING;

  FOR v_record IN
    SELECT DISTINCT mr.id, mr.pet_id
    FROM public.medical_records mr
    WHERE mr.household_id IS NULL
  LOOP
    SELECT p.household_id INTO v_household_id
    FROM public.pets p WHERE p.id = v_record.pet_id;

    UPDATE public.medical_records
    SET household_id = v_household_id
    WHERE id = v_record.id;

    v_count := v_count + 1;
  END LOOP;

  RAISE NOTICE 'Migrated % medical records', v_count;

  UPDATE public.migration_log
  SET status = 'completed', completed_at = NOW()
  WHERE migration_name = 'phase_5_migrate_medical';
EXCEPTION WHEN others THEN
  UPDATE public.migration_log
  SET status = 'failed', details = jsonb_build_object('error', SQLERRM)
  WHERE migration_name = 'phase_5_migrate_medical';
  RAISE EXCEPTION 'Phase 5 failed: %', SQLERRM;
END $$;

-- ── PHASE 6: MIGRATE TREATMENT PLANS ────────────────────────

DO $$ 
DECLARE
  v_record RECORD;
  v_household_id UUID;
  v_count INTEGER := 0;
BEGIN
  INSERT INTO public.migration_log (migration_name, status, details)
  VALUES ('phase_6_migrate_treatment_plans', 'in_progress', '{}')
  ON CONFLICT DO NOTHING;

  FOR v_record IN
    SELECT DISTINCT tp.id, tp.pet_id
    FROM public.treatment_plans tp
    WHERE tp.household_id IS NULL
  LOOP
    SELECT p.household_id INTO v_household_id
    FROM public.pets p WHERE p.id = v_record.pet_id;

    UPDATE public.treatment_plans
    SET household_id = v_household_id
    WHERE id = v_record.id;

    v_count := v_count + 1;
  END LOOP;

  RAISE NOTICE 'Migrated % treatment plans', v_count;

  UPDATE public.migration_log
  SET status = 'completed', completed_at = NOW()
  WHERE migration_name = 'phase_6_migrate_treatment_plans';
EXCEPTION WHEN others THEN
  UPDATE public.migration_log
  SET status = 'failed', details = jsonb_build_object('error', SQLERRM)
  WHERE migration_name = 'phase_6_migrate_treatment_plans';
  RAISE EXCEPTION 'Phase 6 failed: %', SQLERRM;
END $$;

-- ── PHASE 7: MIGRATE MEAL PLANS ─────────────────────────────

DO $$ 
DECLARE
  v_record RECORD;
  v_household_id UUID;
  v_count INTEGER := 0;
BEGIN
  INSERT INTO public.migration_log (migration_name, status, details)
  VALUES ('phase_7_migrate_meal_plans', 'in_progress', '{}')
  ON CONFLICT DO NOTHING;

  FOR v_record IN
    SELECT DISTINCT mp.id, mp.pet_id
    FROM public.meal_plans mp
    WHERE mp.household_id IS NULL
  LOOP
    SELECT p.household_id INTO v_household_id
    FROM public.pets p WHERE p.id = v_record.pet_id;

    UPDATE public.meal_plans
    SET household_id = v_household_id
    WHERE id = v_record.id;

    v_count := v_count + 1;
  END LOOP;

  RAISE NOTICE 'Migrated % meal plans', v_count;

  UPDATE public.migration_log
  SET status = 'completed', completed_at = NOW()
  WHERE migration_name = 'phase_7_migrate_meal_plans';
EXCEPTION WHEN others THEN
  UPDATE public.migration_log
  SET status = 'failed', details = jsonb_build_object('error', SQLERRM)
  WHERE migration_name = 'phase_7_migrate_meal_plans';
  RAISE EXCEPTION 'Phase 7 failed: %', SQLERRM;
END $$;

-- ── PHASE 8: MIGRATE RISK MONITORING SESSIONS ───────────────

DO $$ 
DECLARE
  v_record RECORD;
  v_household_id UUID;
  v_count INTEGER := 0;
BEGIN
  INSERT INTO public.migration_log (migration_name, status, details)
  VALUES ('phase_8_migrate_risk_sessions', 'in_progress', '{}')
  ON CONFLICT DO NOTHING;

  FOR v_record IN
    SELECT DISTINCT rms.id, rms.pet_id
    FROM public.risk_monitoring_sessions rms
    WHERE rms.household_id IS NULL
  LOOP
    SELECT p.household_id INTO v_household_id
    FROM public.pets p WHERE p.id = v_record.pet_id;

    UPDATE public.risk_monitoring_sessions
    SET household_id = v_household_id
    WHERE id = v_record.id;

    v_count := v_count + 1;
  END LOOP;

  RAISE NOTICE 'Migrated % risk sessions', v_count;

  UPDATE public.migration_log
  SET status = 'completed', completed_at = NOW()
  WHERE migration_name = 'phase_8_migrate_risk_sessions';
EXCEPTION WHEN others THEN
  UPDATE public.migration_log
  SET status = 'failed', details = jsonb_build_object('error', SQLERRM)
  WHERE migration_name = 'phase_8_migrate_risk_sessions';
  RAISE EXCEPTION 'Phase 8 failed: %', SQLERRM;
END $$;

-- ── PHASE 9: MIGRATE MEDICINE REMINDERS ────────────────────

DO $$ 
DECLARE
  v_record RECORD;
  v_household_id UUID;
  v_count INTEGER := 0;
BEGIN
  INSERT INTO public.migration_log (migration_name, status, details)
  VALUES ('phase_9_migrate_medicine_reminders', 'in_progress', '{}')
  ON CONFLICT DO NOTHING;

  FOR v_record IN
    SELECT DISTINCT mr.id, mr.pet_id
    FROM public.medicine_reminders mr
    WHERE mr.household_id IS NULL
  LOOP
    SELECT p.household_id INTO v_household_id
    FROM public.pets p WHERE p.id = v_record.pet_id;

    UPDATE public.medicine_reminders
    SET household_id = v_household_id
    WHERE id = v_record.id;

    v_count := v_count + 1;
  END LOOP;

  RAISE NOTICE 'Migrated % medicine reminders', v_count;

  UPDATE public.migration_log
  SET status = 'completed', completed_at = NOW()
  WHERE migration_name = 'phase_9_migrate_medicine_reminders';
EXCEPTION WHEN others THEN
  UPDATE public.migration_log
  SET status = 'failed', details = jsonb_build_object('error', SQLERRM)
  WHERE migration_name = 'phase_9_migrate_medicine_reminders';
  RAISE EXCEPTION 'Phase 9 failed: %', SQLERRM;
END $$;

-- ── PHASE 10: VERIFY MIGRATION ──────────────────────────────

DO $$ 
DECLARE
  v_stats JSONB;
BEGIN
  INSERT INTO public.migration_log (migration_name, status, details)
  VALUES ('phase_10_verify', 'in_progress', '{}')
  ON CONFLICT DO NOTHING;

  -- Collect statistics
  v_stats := jsonb_build_object(
    'total_households', (SELECT COUNT(*) FROM public.households),
    'total_members', (SELECT COUNT(*) FROM public.household_members WHERE is_active = TRUE),
    'pets_with_household', (SELECT COUNT(*) FROM public.pets WHERE household_id IS NOT NULL),
    'pets_without_household', (SELECT COUNT(*) FROM public.pets WHERE household_id IS NULL),
    'log_entries_with_household', (SELECT COUNT(*) FROM public.log_entries WHERE household_id IS NOT NULL),
    'log_entries_without_household', (SELECT COUNT(*) FROM public.log_entries WHERE household_id IS NULL)
  );

  UPDATE public.migration_log
  SET status = 'completed', details = v_stats, completed_at = NOW()
  WHERE migration_name = 'phase_10_verify';

  RAISE NOTICE 'Migration complete. Stats: %', v_stats::TEXT;
EXCEPTION WHEN others THEN
  UPDATE public.migration_log
  SET status = 'failed', details = jsonb_build_object('error', SQLERRM)
  WHERE migration_name = 'phase_10_verify';
  RAISE EXCEPTION 'Verification failed: %', SQLERRM;
END $$;

-- ── FINAL STATUS CHECK ──────────────────────────────────────

SELECT 
  migration_name, 
  status, 
  started_at, 
  completed_at,
  details
FROM public.migration_log
ORDER BY started_at DESC;

-- ============================================================
-- MIGRATION COMPLETE
-- ============================================================
-- All users have their own default households.
-- All pets are assigned to their creator's household.
-- All logs and records now include household_id for RLS.
-- 
-- Next steps:
-- 1. Update all forms to include household_id (see FORM_ATTRIBUTION_GUIDE.md)
-- 2. Deploy the new components (HouseholdMembers, ActivityFeed, etc.)
-- 3. Test with multiple users in same household
-- ============================================================

