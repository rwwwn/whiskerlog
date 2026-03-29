# Multi-User Household System - Deployment & Setup

Complete guide to deploy the multi-user household system to WhiskerLog.

---

## 📋 Prerequisites

- ✅ Access to Supabase SQL Editor
- ✅ Database backup (critical!)
- ✅ Understanding of RLS policies
- ✅ Approximately 1 hour of setup time

---

## 🚀 Step 1: Database Migration (15 minutes)

### 1.1 Backup Database
```bash
# Critical: Back up your database FIRST
# In Supabase Dashboard:
# Project → Backups → Create manual backup
```

### 1.2 Run Household Extensions SQL
1. Go to Supabase Dashboard → SQL Editor
2. Create new query
3. Copy entire contents of: **`supabase/household_extensions.sql`**
4. Click "RUN"
5. Wait for "Executed successfully" message
6. ✅ Verify no errors

**This adds:**
- `activity_audit_logs` table
- Activity logging triggers
- Activity feed view
- Member management functions
- Real-time publication

### 1.3 Run Migration Script
1. Create another new query
2. Copy entire contents of: **`supabase/migration_single_to_multi_user.sql`**
3. Click "RUN"
4. Wait for completion (may take 1-5 minutes depending on data volume)
5. ✅ Verify all phases completed

**Verify migration:**
```sql
SELECT migration_name, status, completed_at 
FROM public.migration_log 
ORDER BY started_at DESC;
```

All entries should show `status = 'completed'`.

---

## 📦 Step 2: Deploy Application Files (5 minutes)

All files have been created by this implementation. Verify they exist:

### Database Files ✅
- [ ] `supabase/household_extensions.sql` - Extensions (executed above)
- [ ] `supabase/migration_single_to_multi_user.sql` - Migration (executed above)

### API Endpoints ✅
- [ ] `app/api/households/[id]/route.ts` - GET/PATCH/DELETE household
- [ ] `app/api/households/[id]/activity/route.ts` - GET activity feed
- [ ] `app/api/households/[id]/invitations/route.ts` - GET/DELETE invitations
- [ ] `app/api/households/[id]/members/[userId]/route.ts` - PATCH/DELETE member
- [ ] `app/api/households/invite/route.ts` - Already exists
- [ ] `app/api/households/accept-invite/route.ts` - Already exists

### React Hooks ✅
- [ ] `hooks/useHouseholdActivity.ts` - Activity feed hook (NEW)
- [ ] `hooks/useHouseholdMembers.ts` - Members management hook (NEW)
- [ ] `hooks/useHousehold.tsx` - Context hook (already exists)

### Components ✅
- [ ] `components/household/InviteMemberModal.tsx` - Invite UI
- [ ] `components/household/HouseholdMembers.tsx` - Members list & management
- [ ] `components/household/ActivityFeed.tsx` - Activity timeline

### Pages ✅
- [ ] `app/(auth)/invite/[token]/page.tsx` - Invite acceptance page
- [ ] `app/(app)/household/[id]/page.tsx` - Household management page

### Documentation ✅
- [ ] `HOUSEHOLD_SYSTEM_IMPLEMENTATION.md` - Architecture overview
- [ ] `FORM_ATTRIBUTION_GUIDE.md` - Form updates guide
- [ ] This file

---

## 🔧 Step 3: Update Application Code (30 minutes)

### 3.1 Update All Data Entry Forms

**CRITICAL**: Every form that inserts data must include `household_id`.

#### Example: Meal Logging Form
```typescript
// Before (single-user)
const handleMealLog = async () => {
  const { data } = await supabase
    .from('meal_completions')
    .insert({
      meal_plan_id,
      pet_id,
      completed_by: user.id,
      // ...
    });
};

// After (multi-user)
import { useHousehold } from '@/hooks/useHousehold';

const handleMealLog = async () => {
  const { activeHousehold } = useHousehold();
  
  if (!activeHousehold) {
    toast.error('Please select a household first');
    return;
  }

  const { data } = await supabase
    .from('meal_completions')
    .insert({
      household_id: activeHousehold.id,  // ✅ ADD THIS
      meal_plan_id,
      pet_id,
      completed_by: user.id,
      // ...
    });
};
```

### 3.2 Forms to Update

**See FORM_ATTRIBUTION_GUIDE.md for detailed examples of each:**

1. **Meal logging** (`components/meals/`)
   - `MealChecklist.tsx`
   - `MultiMealButton.tsx`
   - Any meal completion forms

2. **Medication logging** (`components/treatments/`)
   - `TreatmentForm.tsx`
   - Treatment completion handlers

3. **Behavior logging** (`components/behavior/`)
   - `BehaviorForm.tsx`
   - Behavior observation forms

4. **Medical records** (`components/medical/`)
   - `MedicalForm.tsx`
   - Vet visit recording

5. **Pet management** (`components/pets/`)
   - `PetForm.tsx` - Add `household_id` when creating

6. **Risk monitoring** - Risk session forms
7. **Vitamin logging** - Vitamin administration
8. **Medicine reminders** - Reminder creation

**Quick update script pattern:**
```typescript
const { activeHousehold, loading } = useHousehold();

// Add to form JSX
if (loading) return <LoadingSpinner />;
if (!activeHousehold) return <NeedHouseholdError />;

// Add to submission
const insertion = {
  ...formData,
  household_id: activeHousehold.id,
  created_by: user.id,
};
```

---

## 🧪 Step 4: Testing (30 minutes)

### Test 1: Household Creation
```bash
1. Log in as User A
2. Create household "Test Family"
3. Verify in useHousehold context shows the household
4. Verify activeHousehold.id is set
```

### Test 2: Member Invitation & Acceptance
```bash
1. As User A, go to /app/household/[id]
2. Click "Invite Member"
3. Enter User B's real email, role="member"
4. Note the invite URL from response
5. Log out, open invite URL in incognito window
6. Log in as User B
7. Click "Accept Invitation"
8. Verify redirected to household page
9. Verify User B sees User A in members list
```

### Test 3: Shared Data Access
```bash
1. As User A, create a pet in shared household
2. Log a meal for the pet
3. Switch to User B
4. Verify pet appears in pet list
5. Verify meal log shows "User A fed [pet]"
```

### Test 4: Activity Feed
```bash
1. As User A, log a meal
2. As User B, log medication
3. Both go to Household → Activity tab
4. Verify both actions appear
5. Verify correct user attribution (name + avatar)
6. Verify timestamps show "just now", "5 min ago", etc.
```

### Test 5: Member Management
```bash
1. As owner (User A), go to Members
2. Try "Remove yourself" → should error
3. Invite User C as "viewer"
4. As User C, verify can view but can't create logs
5. Promote User C to "member"
6. Verify User C can now create logs
7. Remove User C
8. Verify User C loses access
9. Verify /app/household/[id] returns "Not found" for User C
```

### Test 6: RLS Security
```bash
1. Logged in as User A with Household 1
2. Try to:
   - View Household 2 pets (should be blocked)
   - Query another household's logs (should be empty)
   - Manually construct request to other household (should 403)
3. Verify all returns "Not found" or "Forbidden"
```

---

## 🚀 Step 5: Deployment to Production

### Pre-Flight Checklist
- [ ] All tests passing
- [ ] No console errors
- [ ] Forms submitting with household_id
- [ ] Activity logs appearing correctly
- [ ] Member invitations working
- [ ] RLS blocking unauthorized access

### Deployment Steps
```bash
# 1. Commit all changes
git add .
git commit -m "feat: implement multi-user household system"

# 2. Deploy to staging first (if you have it)
npm run build

# 3. Test in staging environment
# ... run test suite again ...

# 4. Deploy to production
git push  # or use your deployment tool
```

### Post-Deployment Monitoring
```sql
-- Monitor in first 24 hours
SELECT 
  COUNT(*) as total_activities,
  MAX(created_at) as latest,
  COUNT(DISTINCT household_id) as households_active
FROM public.activity_audit_logs
WHERE created_at > NOW() - INTERVAL '24 hours';
```

---

## 📊 Data Migration Verification

After running migration script, verify completeness:

```sql
-- All pets should have household_id
SELECT COUNT(*) as total, 
       SUM(CASE WHEN household_id IS NOT NULL THEN 1 ELSE 0 END) as with_household
FROM public.pets;
-- Should show: total = with_household

-- All users should have at least one household
SELECT COUNT(DISTINCT user_id) as users,
       COUNT(DISTINCT household_id) as unique_households
FROM public.household_members
WHERE is_active = TRUE;

-- Activity logs should exist for historical actions
SELECT COUNT(*) as total_logs,
       MAX(created_at) as latest
FROM public.activity_audit_logs;
```

---

## 🔍 Troubleshooting

### Database Errors

**Error: violates foreign key constraint**
- [ ] Migration script didn't fully complete
- [ ] Run migration again or check migration_log for errors

**Error: permission denied**
- [ ] RLS policies not applied correctly
- [ ] Re-run household_extensions.sql to ensure policies created

### Application Errors

**Error: "activeHousehold is undefined"**
- [ ] useHousehold hook not imported
- [ ] User has no households (check household_members)
- [ ] HouseholdProvider not wrapping the app

**Error: "Not a member of this household"**
- [ ] User needs to accept invite first
- [ ] Check household_members table: `is_active = true`

**Error: "household_id is NULL" in logs**
- [ ] Form wasn't updated with household_id
- [ ] Check form submission code

### Performance Issues

**Slow household queries**
- [ ] Run ANALYZE on main tables:
  ```sql
  ANALYZE public.household_members;
  ANALYZE public.activity_audit_logs;
  ```

**Activity feed loading slowly**
- [ ] Check if indexes exist:
  ```sql
  SELECT * FROM pg_indexes 
  WHERE tablename = 'activity_audit_logs';
  ```

---

## 🎉 Completion

Once all tests pass:

1. ✅ Database extended with household system
2. ✅ All existing data migrated
3. ✅ API endpoints deployed
4. ✅ React components integrated
5. ✅ Forms updated with attribution
6. ✅ RLS policies enforced
7. ✅ Activity tracking working
8. ✅ Multi-user access verified

Your app now supports real family households! 🏠👨‍👩‍👧‍👦

---

## 📚 Additional Resources

- **Architecture**: See `HOUSEHOLD_SYSTEM_IMPLEMENTATION.md`
- **Form Updates**: See `FORM_ATTRIBUTION_GUIDE.md`
- **Database Design**: See `supabase/household_extensions.sql` comments
- **Migration Details**: See `supabase/migration_single_to_multi_user.sql` comments

