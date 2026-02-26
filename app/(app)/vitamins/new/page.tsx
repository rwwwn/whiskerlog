import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/shared/PageHeader";
import { VitaminAssignForm } from "@/components/vitamins/VitaminAssignForm";

export const metadata = { title: "إضافة فيتامين" };

export default async function NewVitaminPage({
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
      <PageHeader title="إضافة فيتامين / مكمل" backHref="/vitamins" />
      <VitaminAssignForm pets={pets} defaultPetId={pet_id} />
    </div>
  );
}
