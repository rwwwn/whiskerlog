"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  PawPrint,
  ClipboardList,
  Bell,
  LogOut,
  Cat,
  Users,
  Stethoscope,
  Pill,
  Apple,
  Dna,
  Activity,
  MapPin,
  ChevronDown,
  Languages,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import { useHousehold } from "@/hooks/useHousehold";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface NavItem {
  key: string;
  href: string;
  icon: React.ElementType;
}

const mainNav: NavItem[] = [
  { key: "dashboard", href: "/dashboard", icon: LayoutDashboard },
  { key: "pets", href: "/pets", icon: PawPrint },
  { key: "logs", href: "/logs", icon: ClipboardList },
  { key: "alerts", href: "/alerts", icon: Bell },
];

const healthNav: NavItem[] = [
  { key: "medical", href: "/medical", icon: Stethoscope },
  { key: "treatments", href: "/treatments", icon: Pill },
  { key: "vitamins", href: "/vitamins", icon: Apple },
  { key: "behavior", href: "/behavior", icon: Dna },
  { key: "risk", href: "/risk", icon: Activity },
];

const communityNav: NavItem[] = [
  { key: "household", href: "/household", icon: Users },
  { key: "meals", href: "/meals", icon: Apple },
  { key: "strays", href: "/pets?type=stray", icon: MapPin },
];

function NavSection({
  label,
  items,
  pathname,
  t,
}: {
  label: string;
  items: NavItem[];
  pathname: string;
  t: Record<string, any>;
}) {
  return (
    <div className="mb-2">
      <p className="mb-1 px-2 text-[10px] font-semibold uppercase tracking-widest text-stone-300">
        {label}
      </p>
      {items.map((item) => {
        const href = item.href;
        const isActive =
          pathname === href ||
          (href !== "/pets?type=stray" && pathname.startsWith(`${href}/`));
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              isActive
                ? "bg-sage-600/15 text-sage-500"
                : "text-stone-500 hover:bg-stone-100 hover:text-stone-900"
            )}
          >
            <item.icon
              size={15}
              className={cn(isActive ? "text-sage-500" : "text-stone-400")}
            />
            {t?.nav?.[item.key] ?? item.key}
          </Link>
        );
      })}
    </div>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const { t, lang, toggleLang } = useI18n();
  const { households, activeHousehold, setActiveHousehold } = useHousehold();

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <aside className="flex h-screen w-56 flex-col border-e border-stone-200 bg-cream-100">
      {/* Logo */}
      <div className="flex h-14 items-center gap-2.5 border-b border-stone-200 px-4">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-sage-600">
          <Cat size={15} className="text-white" />
        </div>
        <span className="text-sm font-bold tracking-tight text-stone-900">
          WhiskerLog
        </span>
        <button
          onClick={toggleLang}
          className="ms-auto text-stone-400 hover:text-stone-700 transition-colors"
          title={lang === "ar" ? "Switch to English" : "التبديل للعربية"}
        >
          <Languages size={14} />
        </button>
      </div>

      {/* Household selector */}
      {households.length > 0 && (
        <div className="border-b border-stone-200 px-3 py-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs font-medium text-stone-500 hover:bg-stone-100 hover:text-stone-900 transition-colors">
                <Users size={12} className="text-teal-500 shrink-0" />
                <span className="truncate">
                  {activeHousehold?.name ?? t?.nav?.personal ?? "Personal"}
                </span>
                <ChevronDown size={11} className="ms-auto shrink-0 text-stone-300" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-48">
              {households.map((h) => (
                <DropdownMenuItem
                  key={h.id}
                  onClick={() => setActiveHousehold(h)}
                  className={cn(
                    activeHousehold?.id === h.id && "text-sage-500"
                  )}
                >
                  {h.name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex flex-1 flex-col overflow-y-auto p-3 gap-0.5">
        <NavSection
          label={t?.nav?.sectionMain ?? "Main"}
          items={mainNav}
          pathname={pathname}
          t={t}
        />
        <NavSection
          label={t?.nav?.sectionHealth ?? "Health"}
          items={healthNav}
          pathname={pathname}
          t={t}
        />
        <NavSection
          label={t?.nav?.sectionCommunity ?? "Community"}
          items={communityNav}
          pathname={pathname}
          t={t}
        />
      </nav>

      {/* Sign out */}
      <div className="border-t border-stone-200 p-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleSignOut}
          className="w-full justify-start gap-3 text-stone-500 hover:bg-stone-100 hover:text-stone-900"
        >
          <LogOut size={15} className="text-stone-400" />
          {t?.auth?.signOut ?? "Sign Out"}
        </Button>
      </div>
    </aside>
  );
}
