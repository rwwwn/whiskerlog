"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  Home,
  PawPrint,
  Plus,
  ClipboardList,
  MoreHorizontal,
  Bell,
  Users,
  Stethoscope,
  Pill,
  Apple,
  Dna,
  Activity,
  UtensilsCrossed,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

const MORE_NAV = [
  { href: "/alerts",    icon: Bell,            label: "التنبيهات",      bg: "bg-amber-50",   color: "text-amber-600"  },
  { href: "/household", icon: Users,           label: "المنزل",         bg: "bg-blue-50",    color: "text-blue-600"   },
  { href: "/medical",   icon: Stethoscope,     label: "السجلات الطبية", bg: "bg-teal-50",    color: "text-teal-700"   },
  { href: "/treatments",icon: Pill,            label: "خطط العلاج",     bg: "bg-violet-50",  color: "text-violet-600" },
  { href: "/vitamins",  icon: Apple,           label: "الفيتامينات",    bg: "bg-green-50",   color: "text-green-600"  },
  { href: "/meals",     icon: UtensilsCrossed, label: "الوجبات",        bg: "bg-orange-50",  color: "text-orange-600" },
  { href: "/behavior",  icon: Dna,             label: "السلوك",         bg: "bg-pink-50",    color: "text-pink-600"   },
  { href: "/risk",      icon: Activity,        label: "المراقبة",       bg: "bg-red-50",     color: "text-red-600"    },
];

export function BottomNav() {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);

  function isActive(href: string) {
    if (href === "/dashboard") return pathname === "/dashboard" || pathname === "/";
    return pathname.startsWith(href) && href !== "/";
  }

  return (
    <>
      {/* Backdrop overlay */}
      <div
        className={cn(
          "fixed inset-0 z-40 bg-black/25 backdrop-blur-[2px] transition-opacity duration-300",
          moreOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        onClick={() => setMoreOpen(false)}
      />

      {/* More panel — slides up from bottom */}
      <div
        className={cn(
          "fixed inset-x-0 bottom-0 z-50 bg-white rounded-t-3xl shadow-2xl transition-transform duration-300 ease-out",
          moreOpen ? "translate-y-0" : "translate-y-full pointer-events-none"
        )}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="h-1 w-10 rounded-full bg-stone-200" />
        </div>

        <div className="px-5 pb-2">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-base font-bold text-stone-900">الأقسام</h3>
            <button
              onClick={() => setMoreOpen(false)}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-stone-100 text-stone-500 hover:bg-stone-200 transition-colors"
            >
              <X size={16} />
            </button>
          </div>

          <div className="grid grid-cols-4 gap-3">
            {MORE_NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMoreOpen(false)}
                className="flex flex-col items-center gap-2 rounded-2xl p-3 active:scale-95 transition-transform no-tap-highlight"
              >
                <div
                  className={cn(
                    "flex h-12 w-12 items-center justify-center rounded-2xl",
                    item.bg
                  )}
                >
                  <item.icon size={22} className={item.color} />
                </div>
                <span className="text-[11px] font-medium text-stone-600 text-center leading-tight">
                  {item.label}
                </span>
              </Link>
            ))}
          </div>

          {/* Safe area spacer */}
          <div className="pb-nav" />
        </div>
      </div>

      {/* ── Bottom navigation bar ── */}
      <nav className="fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur-md border-t border-stone-200">
        <div className="flex h-16 items-center justify-around px-2 max-w-xl mx-auto">
          <NavItem
            href="/dashboard"
            icon={Home}
            label="البيت"
            active={isActive("/dashboard")}
          />
          <NavItem
            href="/pets"
            icon={PawPrint}
            label="قططي"
            active={isActive("/pets")}
          />

          {/* FAB — floating action button */}
          <Link
            href="/logs/new"
            className="relative -top-4 flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-sage-600 text-white shadow-lg shadow-sage-600/30 active:scale-95 transition-transform no-tap-highlight"
            aria-label="تسجيل حدث جديد"
          >
            <Plus size={26} strokeWidth={2.5} />
          </Link>

          <NavItem
            href="/logs"
            icon={ClipboardList}
            label="النشاط"
            active={isActive("/logs")}
          />

          <button
            onClick={() => setMoreOpen(true)}
            className="flex flex-1 flex-col items-center justify-center gap-0.5 py-2 min-w-0 no-tap-highlight"
          >
            <MoreHorizontal
              size={22}
              strokeWidth={1.8}
              className={moreOpen ? "text-sage-600" : "text-stone-400"}
            />
            <span
              className={cn(
                "text-[10px] font-medium",
                moreOpen ? "text-sage-600" : "text-stone-400"
              )}
            >
              المزيد
            </span>
          </button>
        </div>

        {/* Safe area spacer */}
        <div className="pb-safe bg-white/95" />
      </nav>
    </>
  );
}

function NavItem({
  href,
  icon: Icon,
  label,
  active,
}: {
  href: string;
  icon: React.ElementType;
  label: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className="flex flex-1 flex-col items-center justify-center gap-0.5 py-2 min-w-0 no-tap-highlight"
    >
      <Icon
        size={22}
        strokeWidth={active ? 2.5 : 1.8}
        className={active ? "text-sage-600" : "text-stone-400"}
      />
      <span
        className={cn(
          "text-[10px] font-medium",
          active ? "text-sage-600" : "text-stone-400"
        )}
      >
        {label}
      </span>
    </Link>
  );
}
