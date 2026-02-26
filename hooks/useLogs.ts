"use client";

import { useState, useEffect, useCallback } from "react";
import type { Log } from "@/types";

interface UseLogsOptions {
  petId?: string;
  limit?: number;
  offset?: number;
}

interface UseLogsReturn {
  logs: Log[];
  total: number;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
  createLog: (data: Partial<Log>) => Promise<Log>;
  updateLog: (id: string, data: Partial<Log>) => Promise<Log>;
  deleteLog: (id: string) => Promise<void>;
}

export function useLogs(options: UseLogsOptions = {}): UseLogsReturn {
  const { petId, limit = 20, offset = 0 } = options;
  const [logs, setLogs] = useState<Log[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLogs = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (petId) params.set("pet_id", petId);
      params.set("limit", String(limit));
      params.set("offset", String(offset));
      const res = await fetch(`/api/logs?${params}`);
      if (!res.ok) throw new Error("Failed to fetch logs");
      const json = await res.json();
      setLogs(json.data ?? []);
      setTotal(json.total ?? 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setIsLoading(false);
    }
  }, [petId, limit, offset]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const createLog = useCallback(async (data: Partial<Log>): Promise<Log> => {
    const res = await fetch("/api/logs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const json = await res.json();
      throw new Error(json.error ?? "Failed to create log");
    }
    const json = await res.json();
    const log = json.data as Log;
    setLogs((prev) => [log, ...prev]);
    setTotal((t) => t + 1);
    return log;
  }, []);

  const updateLog = useCallback(async (id: string, data: Partial<Log>): Promise<Log> => {
    const res = await fetch(`/api/logs/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const json = await res.json();
      throw new Error(json.error ?? "Failed to update log");
    }
    const json = await res.json();
    const updated = json.data as Log;
    setLogs((prev) => prev.map((l) => (l.id === id ? updated : l)));
    return updated;
  }, []);

  const deleteLog = useCallback(async (id: string): Promise<void> => {
    const res = await fetch(`/api/logs/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const json = await res.json();
      throw new Error(json.error ?? "Failed to delete log");
    }
    setLogs((prev) => prev.filter((l) => l.id !== id));
    setTotal((t) => Math.max(0, t - 1));
  }, []);

  return {
    logs,
    total,
    isLoading,
    error,
    refetch: fetchLogs,
    createLog,
    updateLog,
    deleteLog,
  };
}
