import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/shared/PageHeader";
import { TreatmentDetail } from "@/components/treatments/TreatmentDetail";

export const metadata = { title: "تفاصيل خطة العلاج" };

export default async function TreatmentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { id } = await params;

  const { data: plan, error } = await supabase
    .from("treatment_plans")
    .select(
      `
      *,
      pets!inner(id, name, user_id),
      treatment_logs(id, log_date, logged_by, completed_items, notes)
    `
    )
    .eq("id", id)
    .eq("pets.user_id", user.id)
    .order("log_date", { referencedTable: "treatment_logs", ascending: false })
    .single();

  if (error || !plan) notFound();

  return (
    <div className="mx-auto max-w-lg space-y-6 px-4 py-6">
      <PageHeader title={plan.title} backHref="/treatments" />
      <TreatmentDetail plan={plan as any} />
    </div>
  );
}
