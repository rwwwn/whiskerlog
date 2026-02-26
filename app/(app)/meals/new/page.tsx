import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/shared/PageHeader";
import { MealPlanForm } from "@/components/meals/MealPlanForm";

export const metadata = { title: "خطة وجبات جديدة" };

export default async function NewMealPlanPage({
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
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-6">
      <PageHeader title="خطة وجبات جديدة" backHref="/meals" />
      <MealPlanForm pets={pets} defaultPetId={pet_id} />
    </div>
  );
}
