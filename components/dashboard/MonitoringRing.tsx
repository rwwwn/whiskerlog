"use client";

import Link from "next/link";
import Image from "next/image";

interface MonitoringRingProps {
  pet: {
    id: string;
    name: string;
    photo_url?: string | null;
  };
  risk: {
    id: string;
    reason: string;
    severity: string;
  };
}

const SEVERITY_LABEL: Record<string, string> = {
  low: "منخفضة",
  medium: "متوسطة",
  high: "عالية",
  critical: "حرجة",
};

export default function MonitoringRing({ pet, risk }: MonitoringRingProps) {
  const initials = pet.name.slice(0, 2).toUpperCase();

  return (
    <Link href="/risk" className="block no-tap-highlight">
      <div className="flex flex-col items-center gap-2 py-3">
        {/* Avatar with animated red ring */}
        <div className="relative">
          <div
            className="monitoring-ring w-20 h-20 rounded-full border-2 border-red-500 overflow-hidden bg-red-50 flex items-center justify-center"
          >
            {pet.photo_url ? (
              <Image
                src={pet.photo_url}
                alt={pet.name}
                width={80}
                height={80}
                className="object-cover w-full h-full"
              />
            ) : (
              <span className="text-red-600 font-bold text-xl">{initials}</span>
            )}
          </div>
          {/* Red dot indicator */}
          <span className="absolute top-0 right-0 w-4 h-4 bg-red-500 rounded-full border-2 border-white flex items-center justify-center">
            <span className="w-1.5 h-1.5 bg-white rounded-full" />
          </span>
        </div>

        {/* Name */}
        <p className="font-semibold text-stone-800 text-sm">{pet.name}</p>

        {/* Risk badge */}
        <div className="flex flex-col items-center gap-0.5 text-center">
          <span className="text-xs font-semibold text-red-600 bg-red-50 px-2 py-0.5 rounded-full border border-red-200">
            🔴 وضع المراقبة · {SEVERITY_LABEL[risk.severity] ?? risk.severity}
          </span>
          <p className="text-xs text-stone-500 max-w-[140px] leading-tight mt-0.5 line-clamp-2">
            {risk.reason}
          </p>
        </div>
      </div>
    </Link>
  );
}
