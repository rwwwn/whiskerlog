import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { PlusCircle, PawPrint } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/shared/PageHeader";
import { PetCard } from "@/components/pets/PetCard";
import { EmptyState } from "@/components/shared/EmptyState";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "الحيوانات" };

export default async function PetsPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { type } = await searchParams;

  let query = supabase.from("pets").select("*").eq("user_id", user.id).order("name");

  if (type === "stray") {
    query = query.eq("is_stray", true);
  }

  const { data: pets } = await query;

  const activePets = ((pets as any[]) ?? []).filter((p: any) => p.is_active);
  const archivedPets = ((pets as any[]) ?? []).filter((p: any) => !p.is_active);

  return (
    <div className="space-y-6 px-4 py-6 animate-fade-in">
      <PageHeader title={type === "stray" ? "القطط الضالة المحمية" : "الحيوانات"}>
        <div className="flex items-center gap-2">
          <Link href="/pets">
            <span className={`rounded-full border px-3 py-1 text-xs cursor-pointer transition-colors ${
              !type ? "border-teal-500 bg-sage-600/20 text-sage-500" : "border-stone-300 text-stone-500"
            }`}>
              الكل
            </span>
          </Link>
          <Link href="/pets?type=stray">
            <span className={`rounded-full border px-3 py-1 text-xs cursor-pointer transition-colors ${
              type === "stray" ? "border-amber-500 bg-amber-600/20 text-amber-400" : "border-stone-300 text-stone-500"
            }`}>
              الضوال
            </span>
          </Link>
          <Button asChild size="sm" className="bg-sage-600 hover:bg-sage-700 text-white gap-2">
            <Link href="/pets/new">
              <PlusCircle size={14} />
              إضافة
            </Link>
          </Button>
        </div>
      </PageHeader>

      {activePets.length === 0 ? (
        <EmptyState
          icon={PawPrint}
          title={type === "stray" ? "لا توجد قطط ضالة مسجلة" : "لا توجد حيوانات بعد"}
          description="أضف حيوانك الأول لبدء تتبع صحته."
          action={
            <Button asChild size="sm" className="bg-sage-600 hover:bg-sage-700 text-white gap-2">
              <Link href="/pets/new">
                <PlusCircle size={14} />
                إضافة حيوان
              </Link>
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {activePets.map((pet) => (
            <PetCard key={pet.id} pet={pet} />
          ))}
        </div>
      )}

      {archivedPets.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-xs font-medium uppercase tracking-widest text-stone-400">
            مؤرشف
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {archivedPets.map((pet) => (
              <PetCard key={pet.id} pet={pet} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
