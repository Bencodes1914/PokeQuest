import type { Achievement } from "@/lib/types";
import { PixelatedCard } from "./PixelatedCard";
import { cn } from "@/lib/utils";

interface AchievementBadgeProps {
  achievement: Achievement;
}

export function AchievementBadge({ achievement }: AchievementBadgeProps) {
  const Icon = achievement.icon;

  return (
    <PixelatedCard
      className={cn(
        "p-4 flex items-center gap-4 transition-all",
        achievement.unlocked ? "opacity-100" : "opacity-50 bg-muted"
      )}
    >
      <div
        className={cn(
          "w-16 h-16 flex items-center justify-center border-4 border-foreground",
          achievement.unlocked ? "bg-primary" : "bg-secondary"
        )}
      >
        <Icon className={cn("w-8 h-8", achievement.unlocked ? "text-primary-foreground": "text-secondary-foreground")} />
      </div>
      <div>
        <h3 className="text-lg font-bold font-headline">{achievement.name}</h3>
        <p className="text-sm text-muted-foreground">{achievement.description}</p>
      </div>
    </PixelatedCard>
  );
}
