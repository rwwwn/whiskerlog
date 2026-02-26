"use client";

import { useState, useEffect, useCallback } from "react";
import type { Alert } from "@/types";

interface UseAlertsOptions {
  petId?: string;
  resolved?: boolean;
}

interface UseAlertsReturn {
  alerts: Alert[];
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
  resolveAlert: (id: string) => Promise<void>;
  deleteAlert: (id: string) => Promise<void>;
}

export function useAlerts(options: UseAlertsOptions = {}): UseAlertsReturn {
  const { petId, resolved } = options;
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAlerts = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (petId) params.set("pet_id", petId);
      if (typeof resolved === "boolean") params.set("resolved", String(resolved));
      const res = await fetch(`/api/alerts?${params}`);
      if (!res.ok) throw new Error("Failed to fetch alerts");
      const json = await res.json();
      setAlerts(json.data ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setIsLoading(false);
    }
  }, [petId, resolved]);

  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  const resolveAlert = useCallback(async (id: string): Promise<void> => {
    const res = await fetch(`/api/alerts/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_resolved: true }),
    });
    if (!res.ok) {
      const json = await res.json();
      throw new Error(json.error ?? "Failed to resolve alert");
    }
    setAlerts((prev) =>
      prev.map((a) =>
        a.id === id
          ? { ...a, is_resolved: true, resolved_at: new Date().toISOString() }
          : a
      )
    );
  }, []);

  const deleteAlert = useCallback(async (id: string): Promise<void> => {
    const res = await fetch(`/api/alerts/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const json = await res.json();
      throw new Error(json.error ?? "Failed to delete alert");
    }
    setAlerts((prev) => prev.filter((a) => a.id !== id));
  }, []);

  return {
    alerts,
    isLoading,
    error,
    refetch: fetchAlerts,
    resolveAlert,
    deleteAlert,
  };
}
