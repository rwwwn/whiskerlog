import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/shared/PageHeader";
import { PetForm } from "@/components/pets/PetForm";

export const metadata: Metadata = { title: "Edit Pet" };

export default async function EditPetPage({
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

  const { data: pet } = await supabase
    .from("pets")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (!pet) notFound();
  const petData = pet as any;

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader title="Edit Pet" description={`Updating ${petData.name}'s profile`} />
      <div className="max-w-xl rounded-xl border border-stone-200 bg-white p-6">
        <PetForm initialData={petData} petId={petData.id} />
      </div>
    </div>
  );
}
