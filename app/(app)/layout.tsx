import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { BottomNav } from "@/components/shared/BottomNav";
import { HouseholdProvider } from "@/hooks/useHousehold";
import { SpeedInsights } from "@vercel/speed-insights/next"
export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  return (
    <HouseholdProvider>
      {/* Mobile-first: single column, max readable width centered */}
      <div className="min-h-screen bg-cream-100">
        <main className="mx-auto max-w-xl">
          {children}
        </main>
        <BottomNav />
      </div>
    </HouseholdProvider>
  );
}

