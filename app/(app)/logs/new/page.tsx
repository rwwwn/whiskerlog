import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/shared/PageHeader";
import { LogEntryForm } from "@/components/logs/LogEntryForm";

export const metadata: Metadata = { title: "تسجيل حدث جديد" };

export default async function NewLogPage({
  searchParams,
}: {
  searchParams: Promise<{ pet_id?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: pets } = await supabase
    .from("pets")
    .select("id, name")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .order("name");

  if (!pets?.length) {
    redirect("/pets/new");
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="تسجيل حدث جديد"
        description="سجّل حدثًا من أحداث الرعاية اليومية"
      />
      <div className="max-w-2xl rounded-xl border border-stone-200 bg-white p-6">
        <LogEntryForm pets={pets} defaultPetId={params?.pet_id} />
      </div>
    </div>
  );
}

