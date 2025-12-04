import type { Player } from "@/lib/types";
import { useLevelSystem } from "@/hooks/use-level-system";
import { getStreakMultiplier } from "@/lib/game-logic";
import { PixelatedCard } from "./PixelatedCard";
import { LevelProgressBar } from "./LevelProgressBar";
import { Flame, Star } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

interface PlayerStatusProps {
  player: Player;
  streak: number;
}

export function PlayerStatus({ player, streak }: PlayerStatusProps) {
  const { level, progress, xpIntoLevel, totalXPForLevel } = useLevelSystem(player.xp);
  const multiplier = getStreakMultiplier(streak);
  const [isLevelingUp, setIsLevelingUp] = useState(false);
  const prevLevelRef = useRef<number>();

  useEffect(() => {
    if (prevLevelRef.current !== undefined && level > prevLevelRef.current) {
      setIsLevelingUp(true);
      const timer = setTimeout(() => setIsLevelingUp(false), 1000); // Corresponds to 1s animation
      return () => clearTimeout(timer);
    }
    prevLevelRef.current = level;
  }, [level]);

  return (
    <PixelatedCard className={cn("p-4 transition-shadow", isLevelingUp && "flash-on-level-up")}>
      <div className="flex justify-between items-start">
        <h2 className="text-2xl font-bold font-headline">{player.name}</h2>
        <div className="text-right">
          <div className="flex items-center gap-2 font-bold">
            <Flame className="w-5 h-5 text-destructive" />
            <span>{streak} Day Streak</span>
          </div>
          <div className="flex items-center gap-2 text-primary font-bold">
             <Star className="w-5 h-5 " />
            <span>{multiplier.toFixed(2)}x XP</span>
          </div>
        </div>
      </div>
      <div className="mt-4">
        <LevelProgressBar
          progress={progress}
          currentXp={xpIntoLevel}
          xpForNextLevel={totalXPForLevel}
          level={level}
        />
      </div>
    </PixelatedCard>
  );
}
