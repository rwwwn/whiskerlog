"use client";

import { useEffect, useState, useTransition } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { PawPrint } from "lucide-react";
import { Button } from "../ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../ui/dialog";
import { Textarea } from "../ui/textarea";

type MultiPetSummary = { id: string; name: string; photo_url: string | null };

interface MultiPetMealSelectionModalProps {
  open: boolean;
  onOpenChange(open: boolean): void;
  pets: MultiPetSummary[];
  initialSelected: string[];
}

interface PetSelection {
  selected: boolean;
  didNotEat: boolean;
}

export function MultiPetMealSelectionModal({
  open,
  onOpenChange,
  pets,
  initialSelected,
}: MultiPetMealSelectionModalProps) {
  const router = useRouter();
  const [petState, setPetState] = useState<Record<string, PetSelection>>({});
  const [slotLabel, setSlotLabel] = useState("وجبة");
  const [foodType, setFoodType] = useState("");
  const [notes, setNotes] = useState("");
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!open) return;
    const nextState: Record<string, PetSelection> = {};
    pets.forEach((pet) => {
      nextState[pet.id] = {
        selected: initialSelected.includes(pet.id),
        didNotEat: false,
      };
    });
    setPetState(nextState);
    setSlotLabel("وجبة");
    setFoodType("");
    setNotes("");
  }, [open, pets, initialSelected]);

  const toggleSelect = (petId: string) => {
    setPetState((prev) => ({
      ...prev,
      [petId]: {
        ...prev[petId],
        selected: !prev[petId]?.selected,
        didNotEat: !prev[petId]?.selected ? prev[petId]?.didNotEat ?? false : false,
      },
    }));
  };

  const toggleDidNotEat = (petId: string) => {
    setPetState((prev) => ({
      ...prev,
      [petId]: {
        ...prev[petId],
        didNotEat: !prev[petId]?.didNotEat,
        selected: true,
      },
    }));
  };

  const handleSubmit = () => {
    const selectedPets = pets.filter((pet) => petState[pet.id]?.selected);
    if (selectedPets.length === 0) return;

    const didNotEatIds = selectedPets
      .filter((pet) => petState[pet.id]?.didNotEat)
      .map((pet) => pet.id);

    startTransition(async () => {
      const res = await fetch("/api/meals/log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pet_ids: selectedPets.map((pet) => pet.id),
          slot_label: slotLabel || "وجبة",
          food_type: foodType || undefined,
          notes: notes || undefined,
          did_not_eat_ids: didNotEatIds,
        }),
      });

      if (!res.ok) return;

      onOpenChange(false);
      router.refresh();
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold">تسجيل وجبة جماعية</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-3 gap-3">
          {pets.map((pet) => {
            const state = petState[pet.id] ?? { selected: false, didNotEat: false };
            return (
              <button
                key={pet.id}
                type="button"
                className={`flex flex-col items-center gap-1 rounded-2xl border px-2 py-2 text-xs ${
                  state.selected ? "border-sage-500 bg-sage-50" : "border-stone-200 bg-white"
                }`}
                onClick={() => toggleSelect(pet.id)}
              >
                <div className="h-10 w-10 rounded-full overflow-hidden bg-stone-100">
                  {pet.photo_url ? (
                    <Image
                      src={pet.photo_url}
                      alt={pet.name}
                      width={40}
                      height={40}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center">
                      <PawPrint size={18} className="text-stone-400" />
                    </div>
                  )}
                </div>
                <span className="truncate max-w-[72px]">{pet.name}</span>
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    toggleDidNotEat(pet.id);
                  }}
                  className={`mt-0.5 rounded-full px-2 py-0.5 text-[10px] border ${
                    state.didNotEat
                      ? "border-coral-500 text-coral-600"
                      : "border-stone-200 text-stone-400"
                  }`}
                >
                  لم يأكل
                </button>
              </button>
            );
          })}
        </div>

        <div className="mt-3 space-y-2">
          <input
            type="text"
            className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs"
            placeholder="اسم الوجبة (مثال: وجبة 1)"
            value={slotLabel}
            onChange={(event) => setSlotLabel(event.target.value)}
          />
          <input
            type="text"
            className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs"
            placeholder="نوع الطعام"
            value={foodType}
            onChange={(event) => setFoodType(event.target.value)}
          />
          <Textarea
            rows={3}
            className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs"
            placeholder="ملاحظات (اختياري)"
            value={notes}
            onChange={(event: React.ChangeEvent<HTMLTextAreaElement>) => setNotes(event.target.value)}
          />
        </div>

        <DialogFooter className="mt-3 flex gap-2">
          <Button
            type="button"
            variant="ghost"
            className="flex-1"
            onClick={() => onOpenChange(false)}
          >
            إلغاء
          </Button>
          <Button type="button" className="flex-1" disabled={isPending} onClick={handleSubmit}>
            حفظ الوجبة
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
