import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/shared/PageHeader";
import { TreatmentForm } from "@/components/treatments/TreatmentForm";

export const metadata = { title: "خطة علاج جديدة" };

export default async function NewTreatmentPage({
  searchParams,
}: {
  searchParams: Promise<{ pet_id?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { pet_id } = await searchParams;

  const { data: pets } = await supabase
    .from("pets")
    .select("id, name")
    .eq("user_id", user.id)
    .order("name");

  if (!pets?.length) redirect("/pets/new");

  return (
    <div className="mx-auto max-w-lg space-y-6 px-4 py-6">
      <PageHeader title="خطة علاج جديدة" backHref="/treatments" />
      <TreatmentForm pets={pets} defaultPetId={pet_id} />
    </div>
  );
}
