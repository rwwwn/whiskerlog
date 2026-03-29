# WhiskerLog Multi-User Household System
## Complete Implementation Guide

---

## 📋 Audit of Current State

### ✅ What's Already Implemented
- **Core Tables**: `households`, `household_members`, `household_invitations`
- **Extended Tables**: Pets, logs, medical records, meal plans, etc. all have `household_id` and `created_by`
- **RLS Policies**: Basic policies for household access control
- **Helper Functions**: `is_household_member()`, `can_write_to_household()`, `user_household_role()`
- **API Endpoints**: 
  - `POST /api/households` - Create household
  - `POST /api/households/invite` - Send invitations
  - `POST /api/households/accept-invite` - Accept invitation
- **React Hook**: `useHousehold()` - Context for managing active household

### ❌ What Needs to Be Added (This Implementation)

1. **Activity Audit Log Table** - Track all user actions with attribution
2. **Complete API Endpoints**:
   - `GET /api/households/[id]` - Get household details with members
   - `DELETE /api/households/[id]/members/[userId]` - Remove member
   - `PATCH /api/households/[id]/members/[userId]/role` - Update member role
   - `GET /api/households/[id]/activity` - Activity feed
   - `GET /api/households/[id]/invitations` - List pending invitations
   - `DELETE /api/households/invitations/[id]` - Cancel invitation (owner only)
3. **View for Activity Feed** - Enhanced query for activity with user info
4. **UI Components**:
   - Invite modal with email input
   - Household members list/grid
   - Activity feed component
   - Member management (remove/promote)
5. **Enhanced Hooks**:
   - `useHouseholdActivity()` - Real-time activity feed
   - `useHouseholdMembers()` - Members list with refetch
6. **Form Updates**: Ensure all data entry forms include household_id and created_by
7. **Invite Flow**: Link from invite email to `/invite/[token]` page

---

## 🗄️ Database Schema Additions

### 1. Activity Audit Log Table

```sql
CREATE TABLE public.activity_audit_logs (
  id              UUID        DEFAULT uuid_generate_v4() PRIMARY KEY,
  household_id    UUID        REFERENCES public.households(id) ON DELETE CASCADE NOT NULL,
  user_id         UUID        REFERENCES public.profiles(id) ON DELETE SET NULL,
  action_type     TEXT        NOT NULL, -- 'fed_pet', 'logged_medicine', 'logged_behavior', etc.
  resource_type   TEXT        NOT NULL, -- 'pet', 'log_entry', 'medical_record', etc.
  resource_id     UUID,                  -- ID of the affected resource
  resource_name   TEXT,                  -- Human-readable name (e.g., "Oreo")
  description     TEXT        NOT NULL, -- "Rawan fed Oreo - Dry kibble, 100g"
  metadata        JSONB       DEFAULT '{}', -- Additional context
  created_at      TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_activity_logs_household ON public.activity_audit_logs(household_id);
CREATE INDEX idx_activity_logs_user ON public.activity_audit_logs(user_id);
CREATE INDEX idx_activity_logs_created_at ON public.activity_audit_logs(created_at DESC);
```

### 2. RLS Policy for Activity Logs

```sql
ALTER TABLE public.activity_audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "activity_logs_select" ON public.activity_audit_logs
  FOR SELECT USING (public.is_household_member(household_id));

CREATE POLICY "activity_logs_insert" ON public.activity_audit_logs
  FOR INSERT WITH CHECK (public.can_write_to_household(household_id));
```

### 3. Helper Functions for Activity Logging

```sql
-- Log activity when a meal is logged
CREATE OR REPLACE FUNCTION log_meal_event_activity()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.activity_audit_logs (
    household_id, user_id, action_type, resource_type, 
    resource_id, resource_name, description
  )
  SELECT
    mp.household_id,
    NEW.logged_by,
    'fed_pet',
    'meal_completion',
    NEW.id,
    COALESCE(p.name, 'Unknown Pet'),
    CONCAT(
      COALESCE(pr.display_name, pr.full_name, 'Someone'),
      ' fed ',
      COALESCE(p.name, 'Unknown Pet'),
      ' at ',
      TO_CHAR(NOW(), 'HH12:MI AM')
    )
  FROM public.meal_plans mp
  JOIN public.pets p ON p.id = mp.pet_id
  JOIN public.profiles pr ON pr.id = NEW.logged_by
  WHERE mp.id = NEW.meal_plan_id;
  RETURN NEW;
END;
$$;

-- Log activity when medication is logged
CREATE OR REPLACE FUNCTION log_treatment_activity()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.activity_audit_logs (
    household_id, user_id, action_type, resource_type,
    resource_id, resource_name, description
  )
  SELECT
    tp.household_id,
    NEW.logged_by,
    'gave_medication',
    'treatment_log',
    NEW.id,
    COALESCE(p.name, 'Unknown Pet'),
    CONCAT(
      COALESCE(pr.display_name, pr.full_name, 'Someone'),
      ' gave medication to ',
      COALESCE(p.name, 'Unknown Pet'),
      ' at ',
      TO_CHAR(NOW(), 'HH12:MI AM')
    )
  FROM public.treatment_plans tp
  JOIN public.pets p ON p.id = tp.pet_id
  JOIN public.profiles pr ON pr.id = NEW.logged_by
  WHERE tp.id = NEW.treatment_plan_id;
  RETURN NEW;
END;
$$;

-- Log activity when behavior is observed
CREATE OR REPLACE FUNCTION log_behavior_activity()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.activity_audit_logs (
    household_id, user_id, action_type, resource_type,
    resource_id, resource_name, description
  )
  SELECT
    NEW.household_id,
    NEW.created_by,
    'observed_behavior',
    'behavior_observation',
    NEW.id,
    COALESCE(p.name, 'Unknown Pet'),
    CONCAT(
      COALESCE(pr.display_name, pr.full_name, 'Someone'),
      ' logged behavior for ',
      COALESCE(p.name, 'Unknown Pet'),
      ' (',
      NEW.severity,
      ')'
    )
  FROM public.pets p
  JOIN public.profiles pr ON pr.id = NEW.created_by
  WHERE p.id = NEW.pet_id;
  RETURN NEW;
END;
$$;
```

### 4. Create Triggers for Automatic Activity Logging

```sql
DROP TRIGGER IF EXISTS trigger_log_meal_events ON meal_completions;
CREATE TRIGGER trigger_log_meal_events
  AFTER INSERT ON public.meal_completions
  FOR EACH ROW EXECUTE FUNCTION log_meal_event_activity();

DROP TRIGGER IF EXISTS trigger_log_treatment ON treatment_logs;
CREATE TRIGGER trigger_log_treatment
  AFTER INSERT ON public.treatment_logs
  FOR EACH ROW EXECUTE FUNCTION log_treatment_activity();

DROP TRIGGER IF EXISTS trigger_log_behavior ON behavior_observations;
CREATE TRIGGER trigger_log_behavior
  AFTER INSERT ON public.behavior_observations
  FOR EACH ROW EXECUTE FUNCTION log_behavior_activity();
```

### 5. View for Activity Feed with User Details

```sql
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
  -- Time-relative formatting (for UI)
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
```

---

## 🔐 RLS Policy Enhancements

### Remove Member Policy
Owners can remove members (soft delete via `is_active = FALSE`):

```sql
-- Add constraint to prevent removing yourself
CREATE OR REPLACE FUNCTION check_cannot_remove_self()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF (SELECT auth.uid()) = NEW.user_id AND NEW.is_active = FALSE THEN
    RAISE EXCEPTION 'Cannot remove yourself from household';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_self_removal ON household_members;
CREATE TRIGGER prevent_self_removal
  BEFORE UPDATE ON public.household_members
  FOR EACH ROW EXECUTE FUNCTION check_cannot_remove_self();
```

---

## 📱 Implementation Steps

### Phase 1: Database Setup (5 min)
1. Run the SQL additions above
2. Verify in Supabase dashboard

### Phase 2: API Endpoints (15 min)
1. Create `app/api/households/[id]/route.ts`
2. Create `app/api/households/[id]/members/route.ts`
3. Create `app/api/households/[id]/activity/route.ts`
4. Create `app/api/households/[id]/invitations/route.ts`

### Phase 3: React Hooks (10 min)
1. Enhance `useHousehold.tsx` with member management
2. Create `useHouseholdActivity.tsx` for activity feed
3. Create `useHouseholdMembers.tsx` for members list

### Phase 4: UI Components (20 min)
1. Create `InviteModal.tsx`
2. Create `HouseholdMembers.tsx`
3. Create `ActivityFeed.tsx`
4. Create `HouseholdPage.tsx`

### Phase 5: Integration (15 min)
1. Update all data entry forms to include household context
2. Add member attribution to existing components
3. Link invite email to `/invite/[token]`

---

## 🚀 Key Features

✅ **Multi-user access**: Family members share household  
✅ **Role-based permissions**: Owner, Member, Viewer roles  
✅ **Attribution**: Every action shows who did what + avatar + timestamp  
✅ **Activity feed**: Real-time activity in household  
✅ **Invitations**: Email-based 7-day token expiry  
✅ **Member management**: Add/remove/promote members  
✅ **RLS security**: Airtight row-level policies  
✅ **Real-time updates**: Supabase realtime on activity tables  

---

## 📝 Migration from Single-User

For existing users:
1. Run setup SQL above
2. Auto-create default household for each user
3. Transfer existing pets/logs to default household
4. Make user the owner

See MIGRATION_SCRIPT section below.

---

