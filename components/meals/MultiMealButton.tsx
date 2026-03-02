"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "../ui/button";
import { MultiPetMealSelectionModal } from "./MultiPetMealSelectionModal";

interface MultiMealButtonProps {
  pets: Array<{ id: string; name: string; photo_url: string | null }>;
}

export function MultiMealButton({ pets }: MultiMealButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  if (pets.length === 0) return null;

  return (
    <>
      <Button
        onClick={() => setIsOpen(true)}
        className="w-full bg-sage-600 hover:bg-sage-700 text-white"
      >
        <Plus size={16} className="mr-2" />
        تسجيل وجبة جماعية
      </Button>

      <MultiPetMealSelectionModal
        open={isOpen}
        onOpenChange={setIsOpen}
        pets={pets}
        initialSelected={[]}
      />
    </>
  );
}
