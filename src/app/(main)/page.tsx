"use client";

import { useGameState } from "@/hooks/use-game-state";
import { PlayerStatus } from "@/components/game/PlayerStatus";
import { RivalsCarousel } from "@/components/game/RivalsCarousel";
import { Skeleton } from "@/components/ui/skeleton";
import { NotificationBell } from "@/components/game/NotificationBell";

export default function HomePage() {
  const { gameState, loading } = useGameState();

  if (loading || !gameState) {
    return (
      <div className="space-y-8">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-2xl">
      <header className="flex justify-between items-center mb-6">
        <h1 className="text-4xl font-bold font-headline">PokeQuest</h1>
        <NotificationBell />
      </header>
      <div className="space-y-8">
        <PlayerStatus player={gameState.user} streak={gameState.streak} />
        <RivalsCarousel rivals={gameState.rivals} />
      </div>
    </div>
  );
}
