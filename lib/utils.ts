import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, formatDistanceToNow, parseISO } from "date-fns";

// ─── Tailwind class merging ────────────────────────────────────────────────────
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ─── Date formatting ──────────────────────────────────────────────────────────
export function formatDate(date: string | Date): string {
  const d = typeof date === "string" ? parseISO(date) : date;
  return format(d, "MMM d, yyyy");
}

export function formatDateShort(date: string | Date): string {
  const d = typeof date === "string" ? parseISO(date) : date;
  return format(d, "MMM d");
}

export function formatRelative(date: string | Date): string {
  const d = typeof date === "string" ? parseISO(date) : date;
  return formatDistanceToNow(d, { addSuffix: true });
}

export function toISODateString(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

// ─── Number formatting ────────────────────────────────────────────────────────
export function formatGrams(value: number | null | undefined): string {
  if (value == null) return "—";
  return `${value}g`;
}

export function formatMl(value: number | null | undefined): string {
  if (value == null) return "—";
  return `${value}ml`;
}

export function formatWeight(value: number | null | undefined): string {
  if (value == null) return "—";
  return `${value}kg`;
}

export function formatAge(years: number | null | undefined): string {
  if (years == null) return "—";
  if (years < 1) return `${Math.round(years * 12)} months`;
  if (years === 1) return "1 year";
  return `${years} years`;
}

// ─── Percentage change ────────────────────────────────────────────────────────
export function percentChange(current: number, baseline: number): number {
  if (baseline === 0) return 0;
  return ((current - baseline) / baseline) * 100;
}

// ─── Average of numeric array ─────────────────────────────────────────────────
export function average(values: (number | null)[]): number | null {
  const nums = values.filter((v): v is number => v != null);
  if (nums.length === 0) return null;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

// ─── Mood display helpers ─────────────────────────────────────────────────────
export const MOOD_LABELS: Record<string, string> = {
  happy: "Happy",
  calm: "Calm",
  anxious: "Anxious",
  lethargic: "Lethargic",
  playful: "Playful",
  irritable: "Irritable",
};

export const MOOD_COLORS: Record<string, string> = {
  happy: "text-teal-400",
  calm: "text-blue-400",
  anxious: "text-amber-400",
  lethargic: "text-zinc-400",
  playful: "text-purple-400",
  irritable: "text-red-400",
};

// ─── Energy level helpers ─────────────────────────────────────────────────────
export const ENERGY_LABELS: Record<number, string> = {
  1: "Very Low",
  2: "Low",
  3: "Moderate",
  4: "High",
  5: "Very High",
};

// ─── Alert severity helpers ───────────────────────────────────────────────────
export const SEVERITY_COLORS: Record<string, string> = {
  low: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  medium: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  high: "bg-red-500/10 text-red-400 border-red-500/20",
};

export const SEVERITY_DOT: Record<string, string> = {
  low: "bg-blue-400",
  medium: "bg-amber-400",
  high: "bg-red-400",
};

// ─── Misc ─────────────────────────────────────────────────────────────────────
export function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function truncate(str: string, length: number): string {
  if (str.length <= length) return str;
  return str.slice(0, length) + "…";
}
