import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { PlusCircle, ClipboardList } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { LogEntryCard } from "@/components/logs/LogEntryCard";
import { EmptyState } from "@/components/shared/EmptyState";
import { format } from "date-fns";
import { arSA } from "date-fns/locale";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "النشاط" };
export const dynamic = "force-dynamic";

const EVENT_OPTIONS = [
  { value: "fed_food",          label: "🍽 طعام" },
  { value: "gave_medication",   label: "💊 دواء" },
  { value: "gave_vitamins",     label: "🍃 فيتامين" },
  { value: "grooming",          label: "✂️ عناية" },
  { value: "litter_cleaned",    label: "🧹 صندوق" },
  { value: "behavior_observed", label: "👁 سلوك" },
  { value: "vet_visit",         label: "🏥 بيطري" },
  { value: "weight_recorded",   label: "⚖️ وزن" },
  { value: "other",             label: "📝 أخرى" },
];

export default async function LogsPage({
  searchParams,
}: {
  searchParams: Promise<{ pet_id?: string; event_type?: string; page?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const params = await searchParams;
  const petId = params?.pet_id;
  const eventType = params?.event_type;
  const page = Math.max(1, parseInt(params?.page ?? "1"));
  const pageSize = 30;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const { data: pets } = await supabase
    .from("pets")
    .select("id, name")
    .eq("user_id", user.id)
    .order("name");

  let query = supabase
    .from("log_entries")
    .select("*, pets!inner(name, user_id), profiles(display_name)", {
      count: "exact",
    })
    .eq("pets.user_id", user.id)
    .order("occurred_at", { ascending: false })
    .range(from, to);

  if (petId) query = query.eq("pet_id", petId);
  if (eventType) query = query.eq("event_type", eventType as any);

  const { data: entries, count } = await query;
  const totalPages = Math.ceil((count ?? 0) / pageSize);

  // ── URL helper ──
  function filterHref(overrides: Record<string, string | undefined>) {
    const p: Record<string, string> = {};
    if (petId) p.pet_id = petId;
    if (eventType) p.event_type = eventType;
    Object.assign(p, overrides);
    Object.keys(p).forEach((k) => { if (!p[k]) delete p[k]; });
    const qs = new URLSearchParams(p as any).toString();
    return `/logs${qs ? `?${qs}` : ""}`;
  }

  // ── Group entries by date ──
  const groups: { label: string; entries: any[] }[] = [];
  const today = format(new Date(), "yyyy-MM-dd");
  const yesterday = format(new Date(Date.now() - 86_400_000), "yyyy-MM-dd");

  for (const entry of (entries as any[]) ?? []) {
    const d = entry.occurred_at?.slice(0, 10) ?? "";
    const label =
      d === today
        ? "اليوم"
        : d === yesterday
        ? "أمس"
        : format(new Date(entry.occurred_at), "EEEE d MMMM", { locale: arSA });
    const last = groups[groups.length - 1];
    if (last?.label === label) {
      last.entries.push(entry);
    } else {
      groups.push({ label, entries: [entry] });
    }
  }

  const petMap = Object.fromEntries(
    ((pets as any[]) ?? []).map((p: any) => [p.id, p.name])
  );
  const petList = (pets as any[]) ?? [];

  return (
    <div className="min-h-screen bg-cream-100 pb-nav">
      {/* ── Sticky header ── */}
      <div className="sticky top-0 z-10 bg-cream-100/90 backdrop-blur-sm">
        <div className="flex items-center justify-between px-4 py-4">
          <h1 className="text-xl font-bold text-stone-900">النشاط</h1>
          <Link href="/logs/new">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-sage-600 text-white shadow-sm transition-transform active:scale-95">
              <PlusCircle size={18} />
            </div>
          </Link>
        </div>

        {/* Pet chips — only shown with 2+ pets */}
        {petList.length > 1 && (
          <div className="flex gap-2 overflow-x-auto px-4 pb-2 scrollbar-none">
            <Link href={filterHref({ pet_id: undefined, page: undefined })}>
              <span
                className={`inline-flex shrink-0 items-center rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                  !petId
                    ? "border-stone-800 bg-stone-800 text-white"
                    : "border-stone-200 bg-white text-stone-600"
                }`}
              >
                الكل
              </span>
            </Link>
            {petList.map((pet: any) => (
              <Link
                key={pet.id}
                href={filterHref({ pet_id: pet.id, page: undefined })}
              >
                <span
                  className={`inline-flex shrink-0 items-center rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                    petId === pet.id
                      ? "border-stone-800 bg-stone-800 text-white"
                      : "border-stone-200 bg-white text-stone-600"
                  }`}
                >
                  {pet.name}
                </span>
              </Link>
            ))}
          </div>
        )}

        {/* Event-type chips */}
        <div className="flex gap-2 overflow-x-auto px-4 pb-3 scrollbar-none">
          <Link href={filterHref({ event_type: undefined, page: undefined })}>
            <span
              className={`inline-flex shrink-0 items-center rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                !eventType
                  ? "border-sage-600 bg-sage-600 text-white"
                  : "border-stone-200 bg-white text-stone-600"
              }`}
            >
              الكل
            </span>
          </Link>
          {EVENT_OPTIONS.map((opt) => (
            <Link
              key={opt.value}
              href={filterHref({ event_type: opt.value, page: undefined })}
            >
              <span
                className={`inline-flex shrink-0 items-center rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                  eventType === opt.value
                    ? "border-sage-600 bg-sage-600 text-white"
                    : "border-stone-200 bg-white text-stone-600"
                }`}
              >
                {opt.label}
              </span>
            </Link>
          ))}
        </div>
      </div>

      {/* ── Body ── */}
      <div className="space-y-5 px-4 pt-2">
        {groups.length === 0 ? (
          <div className="mt-12">
            <EmptyState
              icon={ClipboardList}
              title="لا توجد سجلات"
              description="سجّل أول حدث يومي لقطتك"
              action={
                <Button
                  asChild
                  className="bg-sage-600 hover:bg-sage-700 text-white"
                >
                  <Link href="/logs/new">تسجيل حدث</Link>
                </Button>
              }
            />
          </div>
        ) : (
          <>
            {groups.map((group) => (
              <div key={group.label}>
                {/* Date section label */}
                <p className="mb-2 text-[11px] font-bold uppercase tracking-widest text-stone-400">
                  {group.label}
                </p>
                {/* All cards for this date inside one rounded container */}
                <div className="divide-y divide-stone-100 overflow-hidden rounded-3xl border border-stone-200 bg-white shadow-sm">
                  {group.entries.map((entry: any) => (
                    <LogEntryCard
                      key={entry.id}
                      entry={entry}
                      petName={petMap[entry.pet_id]}
                      authorName={
                        entry.profiles?.display_name ?? undefined
                      }
                      showPetName={!petId}
                    />
                  ))}
                </div>
              </div>
            ))}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between py-2">
                <p className="text-xs text-stone-400">
                  {count} سجل &middot; صفحة {page}/{totalPages}
                </p>
                <div className="flex gap-2">
                  {page > 1 && (
                    <Link href={filterHref({ page: String(page - 1) })}>
                      <span className="inline-flex items-center rounded-xl border border-stone-200 bg-white px-4 py-2 text-sm font-semibold text-stone-700 active:bg-stone-50">
                        السابق
                      </span>
                    </Link>
                  )}
                  {page < totalPages && (
                    <Link href={filterHref({ page: String(page + 1) })}>
                      <span className="inline-flex items-center rounded-xl border border-stone-200 bg-white px-4 py-2 text-sm font-semibold text-stone-700 active:bg-stone-50">
                        التالي
                      </span>
                    </Link>
                  )}
                </div>
              </div>
            )}
          </>
        )}
        <div className="h-2" />
      </div>
    </div>
  );
}

