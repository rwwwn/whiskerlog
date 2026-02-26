import Link from "next/link";
import {
  UtensilsCrossed,
  Pill,
  Apple,
  Scissors,
  Trash2,
  Eye,
  Stethoscope,
  Weight,
  MoreHorizontal,
} from "lucide-react";
import type { LogEntry } from "@/types";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { arSA } from "date-fns/locale";

const EVENT_ICONS: Record<string, React.ElementType> = {
  fed_food: UtensilsCrossed,
  gave_medication: Pill,
  gave_vitamins: Apple,
  grooming: Scissors,
  litter_cleaned: Trash2,
  behavior_observed: Eye,
  vet_visit: Stethoscope,
  weight_recorded: Weight,
  other: MoreHorizontal,
};

const EVENT_ICON_COLOR: Record<string, string> = {
  fed_food: "text-amber-500",
  gave_medication: "text-blue-500",
  gave_vitamins: "text-green-500",
  grooming: "text-purple-500",
  litter_cleaned: "text-stone-500",
  behavior_observed: "text-orange-500",
  vet_visit: "text-sage-600",
  weight_recorded: "text-indigo-500",
  other: "text-stone-400",
};

const EVENT_ICON_BG: Record<string, string> = {
  fed_food: "bg-amber-50",
  gave_medication: "bg-blue-50",
  gave_vitamins: "bg-green-50",
  grooming: "bg-purple-50",
  litter_cleaned: "bg-stone-100",
  behavior_observed: "bg-orange-50",
  vet_visit: "bg-sage-50",
  weight_recorded: "bg-indigo-50",
  other: "bg-stone-100",
};

const EVENT_LABELS_AR: Record<string, string> = {
  fed_food: "تغذية",
  gave_medication: "دواء",
  gave_vitamins: "فيتامينات",
  grooming: "عناية",
  litter_cleaned: "تنظيف صندوق",
  behavior_observed: "ملاحظة سلوكية",
  vet_visit: "زيارة بيطري",
  weight_recorded: "تسجيل وزن",
  other: "أخرى",
};

interface LogEntryCardProps {
  entry: LogEntry;
  petName?: string;
  authorName?: string;
  /** Show the pet name chip — pass false when the list is already filtered to one pet */
  showPetName?: boolean;
}

export function LogEntryCard({
  entry,
  petName,
  authorName,
  showPetName = true,
}: LogEntryCardProps) {
  const Icon = EVENT_ICONS[entry.event_type] ?? MoreHorizontal;
  const iconColor = EVENT_ICON_COLOR[entry.event_type] ?? "text-stone-500";
  const iconBg = EVENT_ICON_BG[entry.event_type] ?? "bg-stone-100";
  const label = EVENT_LABELS_AR[entry.event_type] ?? entry.event_type;

  const eventDate = new Date(
    (entry as any).occurred_at ?? (entry as any).event_date ?? Date.now()
  );
  const formattedTime = format(eventDate, "HH:mm");

  return (
    <Link href={`/logs/${entry.id}`}>
      <div className="flex items-center gap-3 px-4 py-3 transition-colors active:bg-stone-50">
        {/* Coloured icon box */}
        <div
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
            iconBg,
            iconColor
          )}
        >
          <Icon size={17} />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Top row: label + time */}
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-semibold text-stone-900 truncate">
              {label}
            </span>
            <span className="shrink-0 text-[11px] text-stone-400">{formattedTime}</span>
          </div>

          {/* Second row: pet name + quantity/weight */}
          <div className="mt-0.5 flex items-center gap-2">
            {showPetName && petName && (
              <span className="text-xs text-stone-500">{petName}</span>
            )}
            {(entry as any).quantity != null && (
              <span className="text-xs text-stone-400">
                {showPetName && petName && "·"}{" "}
                {(entry as any).quantity} {(entry as any).unit ?? ""}
              </span>
            )}
            {(entry as any).weight_kg != null && (
              <span className="text-xs text-stone-400">
                {showPetName && petName && "·"} {(entry as any).weight_kg} كغ
              </span>
            )}
          </div>

          {/* Notes */}
          {entry.notes && (
            <p className="mt-0.5 truncate text-xs text-stone-400 italic">
              {entry.notes}
            </p>
          )}

          {/* Author */}
          {authorName && (
            <p className="mt-0.5 text-[11px] text-stone-300">{authorName}</p>
          )}
        </div>
      </div>
    </Link>
  );
}
