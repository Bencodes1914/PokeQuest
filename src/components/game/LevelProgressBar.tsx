import { Progress } from "@/components/ui/progress";

interface LevelProgressBarProps {
  progress: number;
  currentXp: number;
  xpForNextLevel: number;
  level: number;
}

export function LevelProgressBar({
  progress,
  currentXp,
  xpForNextLevel,
  level,
}: LevelProgressBarProps) {
  return (
    <div>
      <div className="flex justify-between items-center mb-1 text-sm font-bold">
        <span className="text-primary">LVL {level}</span>
        <span className="text-muted-foreground">{currentXp.toFixed(0)} / {xpForNextLevel.toFixed(0)} XP</span>
      </div>
      <div className="w-full bg-muted rounded-full h-4 border-2 border-foreground">
        <div 
          className="bg-primary h-full rounded-full transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}
