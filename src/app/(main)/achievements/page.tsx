"use client";

import { useGameState } from "@/hooks/use-game-state";
import { AchievementBadge } from "@/components/game/AchievementBadge";
import { Skeleton } from "@/components/ui/skeleton";
import { NotificationBell } from "@/components/game/NotificationBell";

export default function AchievementsPage() {
  const { gameState, loading } = useGameState();

  const sortedAchievements = gameState?.achievements.slice().sort((a,b) => a.unlocked === b.unlocked ? 0 : a.unlocked ? -1 : 1);

  return (
    <div className="container mx-auto max-w-2xl">
      <header className="flex justify-between items-center mb-6">
        <h1 className="text-4xl font-bold font-headline">Achievements</h1>
        <NotificationBell />
      </header>

      {loading || !gameState ? (
         <div className="grid grid-cols-1 gap-4">
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {sortedAchievements?.map(achievement => (
            <AchievementBadge key={achievement.id} achievement={achievement} />
          ))}
        </div>
      )}
    </div>
  );
}
