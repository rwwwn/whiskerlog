# Form Updates & Attribution Guide

## Overview

When migrating WhiskerLog to multi-user households, **ALL data entry forms** must include:

1. **Automatic household detection** - Use `useHousehold()` to get the active household
2. **Automatic user attribution** - Capture `created_by` (current user)
3. **Household assignment** - Ensure `household_id` is set on all records

---

## Pattern for Data Entry Forms

### Before (Single-User)
```typescript
const { data, error } = await supabase
  .from('meal_completions')
  .insert({
    meal_plan_id,
    pet_id,
    completed_by: user.id,  // Only tracked user
    // ...
  });
```

### After (Multi-User Household)
```typescript
const { activeHousehold } = useHousehold();

const { data, error } = await supabase
  .from('meal_completions')
  .insert({
    meal_plan_id,
    pet_id,
    household_id: activeHousehold?.id,  // ✅ Include household
    completed_by: user.id,               // ✅ Already correct
    // ...
  });
```

---

## Forms to Update

### 1. **Meal Logging** (`components/meals/MealChecklist.tsx`, etc.)

**Add to form submission:**
```typescript
const { activeHousehold } = useHousehold();

// When inserting meal completion
const insertion = {
  meal_plan_id: selectedPlan.id,
  pet_id: pet.id,
  household_id: activeHousehold?.id,  // ✅ NEW
  completed_by: user.id,
  completed_slots: checkedSlots,
  vitamins_given: vitaminsTaken,
  created_at: new Date().toISOString(),
};
```

---

### 2. **Medication/Treatment Logging** (`components/treatments/TreatmentForm.tsx`, etc.)

**Add to form submission:**
```typescript
const { activeHousehold } = useHousehold();
const { data: { user } } = await supabase.auth.getUser();

const insertion = {
  treatment_plan_id: planId,
  pet_id: pet.id,
  household_id: activeHousehold?.id,  // ✅ NEW
  logged_by: user.id,
  log_date: new Date(),
  completed_items: medicationsCompleted,
  notes: additionalNotes,
};
```

---

### 3. **Behavior Logging** (`components/behavior/BehaviorForm.tsx`, etc.)

**Add to form submission:**
```typescript
const { activeHousehold } = useHousehold();

const insertion = {
  pet_id: pet.id,
  household_id: activeHousehold?.id,  // ✅ NEW
  created_by: user.id,
  observed_at: observationTime,
  severity: selectedSeverity,
  behavior_slugs: selectedBehaviors,
  notes: userNotes,
};
```

---

### 4. **Medical Records** (`components/medical/MedicalForm.tsx`, etc.)

**Add to form submission:**
```typescript
const { activeHousehold } = useHousehold();

const insertion = {
  pet_id: pet.id,
  household_id: activeHousehold?.id,  // ✅ NEW
  created_by: user.id,
  record_date: medicalDate,
  clinic_name: clinicName,
  vet_name: vetName,
  visit_reason: visitReason,
  // ... other fields
};
```

---

### 5. **Vitamin Logging** (`components/vitamins/VitaminLog.tsx`, etc.)

**Add to form submission:**
```typescript
const { activeHousehold } = useHousehold();

const insertion = {
  pet_vitamin_id: vitaminAssignment.id,
  pet_id: pet.id,
  logged_by: user.id,
  log_date: today,
  given_at: new Date(),
  notes: adminNotes,
  skipped: wasSkipped,
};

// Note: vitamin_logs don't have household_id directly,
// but they're linked through pet_vitamins → pets → household_id
```

---

### 6. **Pet Creation/Update** (`components/pets/PetForm.tsx`, etc.)

**Update pet form to include household:**
```typescript
const { activeHousehold } = useHousehold();

const petData = {
  name: petName,
  user_id: user.id,
  household_id: activeHousehold?.id,  // ✅ NEW - auto-assign to household
  pet_type: selectedType,
  birth_date: birthDate,
  // ... other pet fields
};
```

---

## Implementation Checklist

- [ ] `MealChecklist.tsx` - Add household_id to meal_completions
- [ ] `MealPlans.tsx` - Add household_id when creating meal_plans
- [ ] `TreatmentForm.tsx` - Add household_id to treatment_plans & treatment_logs
- [ ] `BehaviorForm.tsx` - Add household_id to behavior_observations
- [ ] `MedicalForm.tsx` - Add household_id to medical_records
- [ ] `MedicineReminderForm.tsx` - Add household_id to medicine_reminders
- [ ] `LogEntryForm.tsx` - Add household_id to log_entries (if exists)
- [ ] `PetForm.tsx` - Add household_id to pets
- [ ] `RiskForm.tsx` - Add household_id to risk_monitoring_sessions
- [ ] All API endpoints - Verify they accept and validate household_id

---

## Best Practices

### 1. **Always Use `useHousehold()` Hook**
```typescript
const { activeHousehold, loading } = useHousehold();

if (loading) return <LoadingSpinner />;
if (!activeHousehold) {
  return <EmptyState title="Select a household first" />;
}
```

### 2. **Validate Household Access**
```typescript
// Only show form if user is member of the household
if (!activeHousehold) {
  return <NeedHouseholdError />;
}
```

### 3. **Show Attribution in UI**
Update view components to display who logged what:

```typescript
// Example: Meal view showing attribution
<div className="space-y-2">
  <p className="text-sm text-slate-600">
    Logged by {completion.profiles.display_name} •{' '}
    {formatDistanceToNow(new Date(completion.created_at), { addSuffix: true })}
  </p>
</div>
```

### 4. **Use RLS for Security**
Never trust `created_by` or `household_id` from client — let RLS enforce it:

```typescript
// RLS policies prevent users from inserting logs 
// for other users or households they're not in
const { error } = await supabase
  .from('meal_completions')
  .insert(data);  // RLS validates this
```

---

## Database-Level Triggers

The `household_extensions.sql` includes automatic triggers that create activity logs:

✅ **Automatically logged:**
- Meal completions → `activity_audit_logs`
- Treatment logs → `activity_audit_logs`
- Behavior observations → `activity_audit_logs`
- Medical records → `activity_audit_logs`

You don't need to manually insert into `activity_audit_logs` — triggers handle it.

---

## Migration for Existing Data

See `MIGRATION_SCRIPT.sql` for:
1. Auto-creating default household for each user
2. Migrating existing pets to their creator's household
3. Migrating existing logs to household
4. Setting `created_by` from user_id where needed

---

## Testing Checklist

- [ ] Create meal log → appears in household activity feed
- [ ] Invite member → they can see shared pets and logs
- [ ] Remove member → they lose access immediately
- [ ] Log medication → shows user avatar + name + timestamp
- [ ] View household → only shows data from that household
- [ ] RLS test → try accessing another household's data (should be blocked)

---

