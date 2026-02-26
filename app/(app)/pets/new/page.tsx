import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/shared/PageHeader";
import { PetForm } from "@/components/pets/PetForm";

export const metadata: Metadata = { title: "Add Pet" };

export default async function NewPetPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Add a Pet"
        description="Create a profile for your cat"
      />
      <div className="max-w-xl rounded-xl border border-stone-200 bg-white p-6">
        <PetForm />
      </div>
    </div>
  );
}
