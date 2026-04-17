"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

type TeamMember = {
  id: string;
  name: string;
  avatarUrl: string;
  role: "Support Lead" | "Support Trainer";
};

type TeamShowcaseCarouselProps = {
  members: TeamMember[];
};

export function TeamShowcaseCarousel({ members }: TeamShowcaseCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAutoPlay, setIsAutoPlay] = useState(true);

  useEffect(() => {
    if (!isAutoPlay || members.length === 0) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % members.length);
    }, 4000);

    return () => clearInterval(interval);
  }, [isAutoPlay, members.length]);

  if (members.length === 0) {
    return (
      <div className="rounded-lg border border-white/10 bg-white/5 p-8 text-center">
        <p className="text-sm text-gray-400">No hay miembros de liderazgo disponibles</p>
      </div>
    );
  }

  const currentMember = members[currentIndex];

  return (
    <div className="rounded-lg border border-white/10 bg-linear-to-b from-white/10 to-white/5 p-8">
      <div className="flex flex-col items-center gap-6">
        {/* Avatar */}
        <div className="relative h-32 w-32 overflow-hidden rounded-full border-4 border-amber-500/50 shadow-lg">
          <Image
            src={currentMember.avatarUrl}
            alt={currentMember.name}
            fill
            className="object-cover"
          />
        </div>

        {/* Info */}
        <div className="text-center">
          <p className="text-xs uppercase tracking-widest text-amber-500">{currentMember.role}</p>
          <h3 className="mt-2 text-2xl font-bold text-white">{currentMember.name}</h3>
        </div>

        {/* Progress dots */}
        <div className="flex gap-2">
          {members.map((_, index) => (
            <button
              key={index}
              onClick={() => {
                setCurrentIndex(index);
                setIsAutoPlay(false);
              }}
              className={`h-2 transition-all duration-300 rounded-full ${
                index === currentIndex ? "w-6 bg-amber-500" : "w-2 bg-white/20 hover:bg-white/40"
              }`}
            />
          ))}
        </div>

        {/* Auto-play indicator */}
        <div className="text-xs text-gray-400">
          {currentIndex + 1} de {members.length}
        </div>
      </div>
    </div>
  );
}
