import Link from "next/link";
import { Droplets, UtensilsCrossed, Zap, Activity } from "lucide-react";
import type { Log } from "@/types";
import {
  formatDate,
  formatGrams,
  formatMl,
  MOOD_LABELS,
  MOOD_COLORS,
  ENERGY_LABELS,
} from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface LogCardProps {
  log: Log;
  petName?: string;
}

export function LogCard({ log, petName }: LogCardProps) {
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-stone-200 bg-white p-4 transition-colors hover:border-stone-300">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-stone-900">
            {formatDate(log.log_date)}
          </p>
          {petName && (
            <p className="text-xs text-stone-400">{petName}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {log.mood && (
            <Badge variant="zinc" className="text-xs">
              <span className={cn("mr-1", MOOD_COLORS[log.mood])}>●</span>
              {MOOD_LABELS[log.mood]}
            </Badge>
          )}
          {log.energy_level && (
            <Badge variant="zinc" className="text-xs">
              <Zap size={10} className="mr-1 text-amber-400" />
              {ENERGY_LABELS[log.energy_level]}
            </Badge>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Stat
          icon={<UtensilsCrossed size={13} className="text-stone-400" />}
          label="Food"
          value={
            log.food_amount_grams != null
              ? `${formatGrams(log.food_amount_grams)}${log.food_type ? ` · ${log.food_type}` : ""}`
              : "—"
          }
        />
        <Stat
          icon={<Droplets size={13} className="text-sage-600" />}
          label="Water"
          value={formatMl(log.water_intake_ml)}
        />
        <Stat
          icon={<Activity size={13} className="text-stone-400" />}
          label="Litter"
          value={`${log.litter_box_urinations}× / ${log.litter_box_defecations}×`}
        />
        <Stat
          icon={<Zap size={13} className="text-stone-400" />}
          label="Energy"
          value={
            log.energy_level ? `${log.energy_level}/5` : "—"
          }
        />
      </div>

      {log.notes && (
        <p className="truncate text-xs text-stone-400 italic">
          &ldquo;{log.notes}&rdquo;
        </p>
      )}
    </div>
  );
}

function Stat({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <div className="flex items-center gap-1 text-[11px] text-stone-400">
        {icon}
        {label}
      </div>
      <p className="text-sm font-medium text-stone-700">{value}</p>
    </div>
  );
}
