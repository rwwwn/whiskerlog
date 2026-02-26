import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { format, subDays } from "date-fns";
import {
  CalendarDays,
  Weight,
  PawPrint,
  Pencil,
  ClipboardList,
  PlusCircle,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { formatAge, formatWeight } from "@/lib/utils";
import { PageHeader } from "@/components/shared/PageHeader";
import { LogEntryCard } from "@/components/logs/LogEntryCard";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { EmptyState } from "@/components/shared/EmptyState";

export const metadata: Metadata = { title: "Pet Profile" };

export default async function PetDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: pet }, { data: recentLogs }] = await Promise.all([
    supabase
      .from("pets")
      .select("*")
      .eq("id", id)
      .eq("user_id", user.id)
      .single(),
    supabase
      .from("log_entries")
      .select("*")
      .eq("pet_id", id)
      .gte("occurred_at", subDays(new Date(), 6).toISOString())
      .order("occurred_at", { ascending: false }),
  ]);

  if (!pet) notFound();
  const p = pet as any;
  const logs = (recentLogs as any[]) ?? [];

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader title={p.name} description="Pet profile & recent activity">
        <Button asChild variant="outline" size="sm">
          <Link href={`/pets/${p.id}/edit`}>
            <Pencil size={14} />
            Edit
          </Link>
        </Button>
        <Button asChild variant="teal" size="sm">
          <Link href={`/logs/new?pet_id=${p.id}`}>
            <PlusCircle size={14} />
            Add Log
          </Link>
        </Button>
      </PageHeader>

      {/* Profile card */}
      <div className="flex gap-5 rounded-xl border border-stone-200 bg-white p-5">
        <div className="h-24 w-24 shrink-0 overflow-hidden rounded-lg bg-stone-100">
          {p.photo_url ? (
            <Image
              src={p.photo_url}
              alt={p.name}
              width={96}
              height={96}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full items-center justify-center">
              <PawPrint size={32} className="text-zinc-700" />
            </div>
          )}
        </div>

        <div className="space-y-2">
          <h2 className="text-xl font-semibold text-stone-900">{p.name}</h2>
          {p.breed && <p className="text-sm text-stone-400">{p.breed}</p>}

          <div className="flex flex-wrap gap-4 pt-1">
            {p.age_years != null && (
              <div className="flex items-center gap-1.5 text-sm text-stone-500">
                <CalendarDays size={14} className="text-stone-300" />
                {formatAge(p.age_years)}
              </div>
            )}
            {p.weight_kg != null && (
              <div className="flex items-center gap-1.5 text-sm text-stone-500">
                <Weight size={14} className="text-stone-300" />
                {formatWeight(p.weight_kg)}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Medical notes */}
      {p.medical_notes && (
        <div className="rounded-lg border border-stone-200 bg-white/50 p-4">
          <p className="mb-1 text-xs font-medium uppercase tracking-widest text-stone-400">
            Medical Notes
          </p>
          <p className="whitespace-pre-wrap text-sm text-stone-700">
            {p.medical_notes}
          </p>
        </div>
      )}

      <Separator />

      {/* Recent logs */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-stone-900">
            Last 7 Days
          </h3>
          <Button asChild variant="ghost" size="sm">
            <Link href={`/logs?pet_id=${p.id}`}>
              <ClipboardList size={13} />
              All Logs
            </Link>
          </Button>
        </div>

        {logs.length === 0 ? (
          <EmptyState
            icon={ClipboardList}
            title="No logs yet"
            description="Log today's activity to start seeing trends."
            action={
              <Button asChild variant="teal" size="sm">
                <Link href={`/logs/new?pet_id=${p.id}`}>Add Log</Link>
              </Button>
            }
          />
        ) : (
          <div className="space-y-3">
            {logs.map((log: any) => (
              <LogEntryCard key={log.id} entry={log} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
