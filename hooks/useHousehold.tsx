"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  ReactNode,
} from "react";
import { createClient } from "@/lib/supabase/client";
import type { Household, HouseholdMember, HouseholdRole } from "@/types";

interface HouseholdContextValue {
  /** All households the current user belongs to */
  households: Household[];
  /** The actively selected household (null = personal / no household) */
  activeHousehold: Household | null;
  /** Current user's role in the active household */
  role: HouseholdRole | null;
  /** True while fetching */
  loading: boolean;
  /** Members of the active household */
  members: HouseholdMember[];
  /** Switch the active household */
  setActiveHousehold: (household: Household | null) => void;
  /** Refetch households list */
  refresh: () => Promise<void>;
  /** Convenience guards */
  canWrite: boolean;
  isOwner: boolean;
}

const HouseholdContext = createContext<HouseholdContextValue>({
  households: [],
  activeHousehold: null,
  role: null,
  loading: true,
  members: [],
  setActiveHousehold: () => {},
  refresh: async () => {},
  canWrite: false,
  isOwner: false,
});

export function HouseholdProvider({ children }: { children: ReactNode }) {
  const supabase = createClient();
  const [households, setHouseholds] = useState<Household[]>([]);
  const [activeHousehold, setActiveHouseholdState] =
    useState<Household | null>(null);
  const [role, setRole] = useState<HouseholdRole | null>(null);
  const [loading, setLoading] = useState(true);
  const [members, setMembers] = useState<HouseholdMember[]>([]);

  const fetchHouseholds = useCallback(async () => {
    setLoading(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setHouseholds([]);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("household_members")
        .select("role, households(*)")
        .eq("user_id", user.id)
        .eq("is_active", true);

      if (error) throw error;

      const fetched: Household[] = [];
      for (const row of data ?? []) {
        const h = (row as any).households as Household;
        if (h) fetched.push(h);
      }

      setHouseholds(fetched);

      // Restore last active household from localStorage
      const savedId =
        typeof window !== "undefined"
          ? localStorage.getItem("whiskerlog_household")
          : null;
      const saved = savedId
        ? fetched.find((h) => h.id === savedId) ?? null
        : null;

      const active = saved ?? fetched[0] ?? null;
      setActiveHouseholdState(active);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  // Fetch role + members when active household changes
  useEffect(() => {
    if (!activeHousehold) {
      setRole(null);
      setMembers([]);
      return;
    }

    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const [roleRes, membersRes] = await Promise.all([
        supabase
          .from("household_members")
          .select("role")
          .eq("household_id", activeHousehold.id)
          .eq("user_id", user.id)
          .single(),
        supabase
          .from("household_members")
          .select("*")
          .eq("household_id", activeHousehold.id)
          .eq("is_active", true),
      ]);

      setRole((roleRes.data?.role as HouseholdRole) ?? null);
      setMembers(membersRes.data ?? []);
    })();
  }, [activeHousehold, supabase]);

  const setActiveHousehold = useCallback((h: Household | null) => {
    setActiveHouseholdState(h);
    if (typeof window !== "undefined") {
      if (h) {
        localStorage.setItem("whiskerlog_household", h.id);
      } else {
        localStorage.removeItem("whiskerlog_household");
      }
    }
  }, []);

  useEffect(() => {
    fetchHouseholds();
  }, [fetchHouseholds]);

  const canWrite = role === "owner" || role === "member";
  const isOwner = role === "owner";

  return (
    <HouseholdContext.Provider
      value={{
        households,
        activeHousehold,
        role,
        loading,
        members,
        setActiveHousehold,
        refresh: fetchHouseholds,
        canWrite,
        isOwner,
      }}
    >
      {children}
    </HouseholdContext.Provider>
  );
}

export function useHousehold() {
  return useContext(HouseholdContext);
}
