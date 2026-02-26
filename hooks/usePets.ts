"use client";

import { useState, useEffect, useCallback } from "react";
import type { Pet } from "@/types";

interface UsePetsOptions {
  includeArchived?: boolean;
}

interface UsePetsReturn {
  pets: Pet[];
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
  createPet: (data: Partial<Pet>) => Promise<Pet>;
  updatePet: (id: string, data: Partial<Pet>) => Promise<Pet>;
  deletePet: (id: string) => Promise<void>;
}

export function usePets(options: UsePetsOptions = {}): UsePetsReturn {
  const { includeArchived = false } = options;
  const [pets, setPets] = useState<Pet[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPets = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (includeArchived) params.set("include_archived", "true");
      const res = await fetch(`/api/pets?${params}`);
      if (!res.ok) throw new Error("Failed to fetch pets");
      const json = await res.json();
      setPets(json.data ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setIsLoading(false);
    }
  }, [includeArchived]);

  useEffect(() => {
    fetchPets();
  }, [fetchPets]);

  const createPet = useCallback(async (data: Partial<Pet>): Promise<Pet> => {
    const res = await fetch("/api/pets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const json = await res.json();
      throw new Error(json.error ?? "Failed to create pet");
    }
    const json = await res.json();
    const pet = json.data as Pet;
    setPets((prev) => [pet, ...prev]);
    return pet;
  }, []);

  const updatePet = useCallback(async (id: string, data: Partial<Pet>): Promise<Pet> => {
    const res = await fetch(`/api/pets/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const json = await res.json();
      throw new Error(json.error ?? "Failed to update pet");
    }
    const json = await res.json();
    const updated = json.data as Pet;
    setPets((prev) => prev.map((p) => (p.id === id ? updated : p)));
    return updated;
  }, []);

  const deletePet = useCallback(async (id: string): Promise<void> => {
    const res = await fetch(`/api/pets/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const json = await res.json();
      throw new Error(json.error ?? "Failed to delete pet");
    }
    setPets((prev) => prev.filter((p) => p.id !== id));
  }, []);

  return {
    pets,
    isLoading,
    error,
    refetch: fetchPets,
    createPet,
    updatePet,
    deletePet,
  };
}
