import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

interface TrendCardProps {
  title: string;
  value: string | null;
  unit?: string;
  change7d?: number | null; // percentage change vs prior period
  description?: string;
  icon?: React.ReactNode;
}

export function TrendCard({
  title,
  value,
  unit,
  change7d,
  description,
  icon,
}: TrendCardProps) {
  const hasChange = change7d != null;
  const isPositive = hasChange && change7d > 2;
  const isNegative = hasChange && change7d < -2;
  const isNeutral = !isPositive && !isNegative;

  return (
    <div className="flex flex-col gap-1 rounded-lg border border-stone-200 bg-white p-5">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-widest text-stone-400">
          {title}
        </p>
        {icon && <span className="text-stone-300">{icon}</span>}
      </div>

      <div className="mt-1 flex items-baseline gap-1.5">
        <span className="text-2xl font-semibold tracking-tight text-stone-900">
          {value ?? "—"}
        </span>
        {unit && value != null && (
          <span className="text-sm text-stone-400">{unit}</span>
        )}
      </div>

      {hasChange && (
        <div
          className={cn(
            "flex items-center gap-1 text-xs font-medium",
            isPositive && "text-sage-500",
            isNegative && "text-red-400",
            isNeutral && "text-stone-400"
          )}
        >
          {isPositive && <TrendingUp size={12} />}
          {isNegative && <TrendingDown size={12} />}
          {isNeutral && <Minus size={12} />}
          {change7d != null && (
            <span>
              {isPositive ? "+" : ""}
              {change7d.toFixed(1)}% vs prior 7d
            </span>
          )}
        </div>
      )}

      {description && (
        <p className="mt-1 text-xs text-stone-300">{description}</p>
      )}
    </div>
  );
}
