import Link from "next/link";
import Image from "next/image";
import { PawPrint, Weight, CalendarDays, Pencil, MapPin } from "lucide-react";
import type { Pet } from "@/types";
import { formatAge, formatWeight } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface PetCardProps {
  pet: Pet;
}

export function PetCard({ pet }: PetCardProps) {
  return (
    <Card className="group overflow-hidden transition-all hover:border-stone-300">
      {/* Photo banner */}
      <div className="relative h-36 w-full overflow-hidden bg-stone-100">
        {pet.photo_url ? (
          <Image
            src={pet.photo_url}
            alt={`${pet.name}'s photo`}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            sizes="(max-width: 768px) 100vw, 33vw"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <PawPrint size={40} className="text-zinc-700" />
          </div>
        )}
        {!pet.is_active && (
          <div className="absolute inset-0 flex items-center justify-center bg-cream-100/70">
            <Badge variant="zinc">Archived</Badge>
          </div>
        )}
        {(pet as any).is_stray && (
          <div className="absolute top-2 start-2">
            <Badge className="bg-amber-600 text-white text-[10px] px-1.5 py-0.5">ضال</Badge>
          </div>
        )}
      </div>

      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="font-semibold text-stone-900">{pet.name}</h3>
            {pet.breed && (
              <p className="text-xs text-stone-400">{pet.breed}</p>
            )}
          </div>
          <Button asChild variant="ghost" size="icon" className="h-7 w-7">
            <Link href={`/pets/${pet.id}/edit`} aria-label={`Edit ${pet.name}`}>
              <Pencil size={13} className="text-stone-400" />
            </Link>
          </Button>
        </div>

        <div className="mt-3 flex flex-wrap gap-3">
          {pet.age_years != null && (
            <div className="flex items-center gap-1.5 text-xs text-stone-500">
              <CalendarDays size={12} className="text-stone-300" />
              {formatAge(pet.age_years)}
            </div>
          )}
          {pet.weight_kg != null && (
            <div className="flex items-center gap-1.5 text-xs text-stone-500">
              <Weight size={12} className="text-stone-300" />
              {formatWeight(pet.weight_kg)}
            </div>
          )}
          {(pet as any).location && (
            <div className="flex items-center gap-1.5 text-xs text-stone-500">
              <MapPin size={12} className="text-stone-300" />
              {(pet as any).location}
            </div>
          )}
        </div>

        <div className="mt-4 flex gap-2">
          <Button asChild variant="teal-outline" size="sm" className="flex-1">
            <Link href={`/pets/${pet.id}`}>View Profile</Link>
          </Button>
          <Button asChild variant="outline" size="sm" className="flex-1">
            <Link href={`/logs/new?pet_id=${pet.id}`}>Add Log</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
