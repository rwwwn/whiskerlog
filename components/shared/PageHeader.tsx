import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: string;
  description?: string;
  className?: string;
  children?: React.ReactNode;
  action?: React.ReactNode;
  backHref?: string;
}

export function PageHeader({
  title,
  description,
  className,
  children,
  action,
  backHref,
}: PageHeaderProps) {
  const trailing = children ?? action;
  return (
    <div className={cn("flex items-start justify-between gap-4", className)}>
      <div className="flex items-center gap-3">
        {backHref && (
          <Link
            href={backHref}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-stone-300 bg-stone-100/50 text-stone-500 transition-colors hover:border-stone-300 hover:text-stone-800"
          >
            <ArrowRight size={16} />
          </Link>
        )}
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-stone-900">
            {title}
          </h1>
          {description && (
            <p className="mt-1 text-sm text-stone-500">{description}</p>
          )}
        </div>
      </div>
      {trailing && (
        <div className="flex shrink-0 items-center gap-2">{trailing}</div>
      )}
    </div>
  );
}
