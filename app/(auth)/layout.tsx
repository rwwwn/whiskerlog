import { Cat } from "lucide-react";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-cream-100 px-4">
      {/* Brand mark */}
      <div className="mb-8 flex flex-col items-center gap-3">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-sage-600 shadow-lg shadow-sage-700/30">
          <Cat size={26} className="text-white" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-stone-900">
          WhiskerLog
        </h1>
        <p className="text-sm text-stone-500">
          تتبع صحة حيوانك الأليف
        </p>
      </div>

      {/* Auth card */}
      <div className="w-full max-w-sm rounded-3xl border border-stone-200 bg-white p-6 shadow-sm">
        {children}
      </div>
    </div>
  );
}
