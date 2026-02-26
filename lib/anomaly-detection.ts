import type { Log, GeneratedAlert, AlertTypeKey } from "@/types";
import { average, percentChange } from "@/lib/utils";

// ─── Negative moods for sustained mood detection ───────────────────────────
const NEGATIVE_MOODS = new Set(["anxious", "lethargic", "irritable"]);

// ─── Thresholds ────────────────────────────────────────────────────────────
const THRESHOLDS = {
  WATER_HIGH_PCT: 20, // flag if water > 20% above 7d average
  WATER_LOW_PCT: -20, // flag if water < 20% below 7d average
  FOOD_LOW_PCT: -30,  // flag if food < 30% below 7d average
  LOW_ENERGY_VALUE: 2,
  LOW_ENERGY_DAYS: 3, // consecutive days
  NEGATIVE_MOOD_DAYS: 3, // consecutive days
  LITTER_HIGH_MULTIPLIER: 2.5, // flag if urinations > 2.5× average
  LITTER_ZERO_DAYS: 1, // flag if 0 urinations for 1+ day
} as const;

// ─── Individual rule functions ─────────────────────────────────────────────

function checkWaterIntake(
  recent: Log,
  last7: Log[]
): GeneratedAlert | null {
  if (recent.water_intake_ml == null) return null;

  const historical = last7
    .filter((l) => l.id !== recent.id)
    .map((l) => l.water_intake_ml);

  const avg = average(historical);
  if (avg == null || avg === 0) return null;

  const pct = percentChange(recent.water_intake_ml, avg);

  if (pct >= THRESHOLDS.WATER_HIGH_PCT) {
    return {
      type: "water_intake_high" satisfies AlertTypeKey,
      severity: pct >= 50 ? "high" : "medium",
      title: "Elevated Water Intake",
      message: `Water intake is ${Math.round(pct)}% above the 7-day average (${Math.round(avg)}ml → ${recent.water_intake_ml}ml). Increased thirst can be an early indicator of kidney disease, diabetes, or hyperthyroidism in cats.`,
      metadata: {
        current: recent.water_intake_ml,
        average: Math.round(avg),
        percentChange: Math.round(pct),
        log_date: recent.log_date,
      },
    };
  }

  if (pct <= THRESHOLDS.WATER_LOW_PCT) {
    return {
      type: "water_intake_low" satisfies AlertTypeKey,
      severity: pct <= -50 ? "high" : "medium",
      title: "Reduced Water Intake",
      message: `Water intake is ${Math.abs(Math.round(pct))}% below the 7-day average (${Math.round(avg)}ml → ${recent.water_intake_ml}ml). Dehydration can indicate illness or dental pain.`,
      metadata: {
        current: recent.water_intake_ml,
        average: Math.round(avg),
        percentChange: Math.round(pct),
        log_date: recent.log_date,
      },
    };
  }

  return null;
}

function checkFoodIntake(
  recent: Log,
  last7: Log[]
): GeneratedAlert | null {
  if (recent.food_amount_grams == null) return null;

  const historical = last7
    .filter((l) => l.id !== recent.id)
    .map((l) => l.food_amount_grams);

  const avg = average(historical);
  if (avg == null || avg === 0) return null;

  const pct = percentChange(recent.food_amount_grams, avg);

  if (pct <= THRESHOLDS.FOOD_LOW_PCT) {
    return {
      type: "food_intake_low" satisfies AlertTypeKey,
      severity: pct <= -50 ? "high" : "medium",
      title: "Low Food Intake",
      message: `Food intake is ${Math.abs(Math.round(pct))}% below the 7-day average (${Math.round(avg)}g → ${recent.food_amount_grams}g). Prolonged appetite loss warrants veterinary attention.`,
      metadata: {
        current: recent.food_amount_grams,
        average: Math.round(avg),
        percentChange: Math.round(pct),
        log_date: recent.log_date,
      },
    };
  }

  return null;
}

function checkLowEnergy(consecutiveLogs: Log[]): GeneratedAlert | null {
  if (consecutiveLogs.length < THRESHOLDS.LOW_ENERGY_DAYS) return null;

  const last3 = consecutiveLogs.slice(0, THRESHOLDS.LOW_ENERGY_DAYS);
  const allLow = last3.every(
    (l) =>
      l.energy_level != null && l.energy_level <= THRESHOLDS.LOW_ENERGY_VALUE
  );

  if (!allLow) return null;

  const avgEnergy = average(last3.map((l) => l.energy_level));

  return {
    type: "low_energy_sustained" satisfies AlertTypeKey,
    severity: "medium",
    title: "Sustained Low Energy",
    message: `Energy level has been ${THRESHOLDS.LOW_ENERGY_VALUE} or below for ${THRESHOLDS.LOW_ENERGY_DAYS} consecutive days (avg: ${avgEnergy?.toFixed(1)}). Persistent lethargy may signal pain, illness, or depression.`,
    metadata: {
      days: THRESHOLDS.LOW_ENERGY_DAYS,
      averageEnergy: avgEnergy,
      dates: last3.map((l) => l.log_date),
    },
  };
}

function checkNegativeMood(consecutiveLogs: Log[]): GeneratedAlert | null {
  if (consecutiveLogs.length < THRESHOLDS.NEGATIVE_MOOD_DAYS) return null;

  const last3 = consecutiveLogs.slice(0, THRESHOLDS.NEGATIVE_MOOD_DAYS);
  const allNegative = last3.every(
    (l) => l.mood != null && NEGATIVE_MOODS.has(l.mood)
  );

  if (!allNegative) return null;

  const moods = last3.map((l) => l.mood).filter(Boolean);

  return {
    type: "negative_mood_sustained" satisfies AlertTypeKey,
    severity: "medium",
    title: "Persistent Negative Mood",
    message: `Mood has been consistently negative (${moods.join(", ")}) for ${THRESHOLDS.NEGATIVE_MOOD_DAYS} consecutive days. Chronic stress or discomfort may require a vet evaluation.`,
    metadata: {
      days: THRESHOLDS.NEGATIVE_MOOD_DAYS,
      moods,
      dates: last3.map((l) => l.log_date),
    },
  };
}

function checkLitterActivity(
  recent: Log,
  last7: Log[]
): GeneratedAlert | null {
  const historical = last7.filter((l) => l.id !== recent.id);

  // Zero urinations alert
  if (recent.litter_box_urinations === 0 && historical.length >= 3) {
    const avgUrinations = average(
      historical.map((l) => l.litter_box_urinations)
    );
    if (avgUrinations != null && avgUrinations > 0) {
      return {
        type: "litter_box_inactivity" satisfies AlertTypeKey,
        severity: "high",
        title: "No Litter Box Urination",
        message: `No litter box urinations recorded today (7-day avg: ${avgUrinations.toFixed(1)}). Urinary blockages are a medical emergency in cats — consult a vet immediately.`,
        metadata: {
          currentUrinations: 0,
          averageUrinations: avgUrinations,
          log_date: recent.log_date,
        },
      };
    }
  }

  // Over-urination alert
  const avgUrinations = average(
    historical.map((l) => l.litter_box_urinations)
  );
  if (
    avgUrinations != null &&
    avgUrinations > 0 &&
    recent.litter_box_urinations > avgUrinations * THRESHOLDS.LITTER_HIGH_MULTIPLIER
  ) {
    return {
      type: "litter_box_overactivity" satisfies AlertTypeKey,
      severity: "medium",
      title: "Unusually High Litter Box Frequency",
      message: `Litter box urinations (${recent.litter_box_urinations}×) are ${THRESHOLDS.LITTER_HIGH_MULTIPLIER}× above the 7-day average (${avgUrinations.toFixed(1)}×). This could indicate a urinary tract infection or kidney issue.`,
      metadata: {
        current: recent.litter_box_urinations,
        average: avgUrinations,
        multiplier: THRESHOLDS.LITTER_HIGH_MULTIPLIER,
        log_date: recent.log_date,
      },
    };
  }

  return null;
}

// ─── Main detector ─────────────────────────────────────────────────────────

/**
 * Runs all anomaly-detection rules against the provided log data.
 *
 * @param recentLogs  - Most recent logs sorted DESC by log_date (up to 7).
 * @param last7Logs   - Last 7 days of logs (may overlap with recentLogs).
 * @returns Array of generated alerts to be persisted.
 */
export function detectAnomalies(
  recentLogs: Log[],
  last7Logs: Log[]
): GeneratedAlert[] {
  if (recentLogs.length === 0) return [];

  const mostRecent = recentLogs[0];
  const alerts: GeneratedAlert[] = [];

  // Rule 1 & 2: Water intake (high / low)
  const waterAlert = checkWaterIntake(mostRecent, last7Logs);
  if (waterAlert) alerts.push(waterAlert);

  // Rule 3: Food intake low
  const foodAlert = checkFoodIntake(mostRecent, last7Logs);
  if (foodAlert) alerts.push(foodAlert);

  // Rule 4: Low energy sustained
  const energyAlert = checkLowEnergy(recentLogs);
  if (energyAlert) alerts.push(energyAlert);

  // Rule 5: Negative mood sustained
  const moodAlert = checkNegativeMood(recentLogs);
  if (moodAlert) alerts.push(moodAlert);

  // Rule 6: Litter box anomaly
  const litterAlert = checkLitterActivity(mostRecent, last7Logs);
  if (litterAlert) alerts.push(litterAlert);

  return alerts;
}

/**
 * Deduplicates generated alerts against existing unresolved alerts
 * to prevent repeated notifications for the same condition.
 */
export function deduplicateAlerts(
  generated: GeneratedAlert[],
  existing: { alert_type: string; is_resolved: boolean }[]
): GeneratedAlert[] {
  const unresolvedTypes = new Set(
    existing.filter((a) => !a.is_resolved).map((a) => a.alert_type)
  );
  return generated.filter((a) => !unresolvedTypes.has(a.type));
}
