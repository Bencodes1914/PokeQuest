import Image from 'next/image';
import type { Rival } from '@/lib/types';
import { useLevelSystem } from '@/hooks/use-level-system';
import { LevelProgressBar } from './LevelProgressBar';
import { PixelatedCard } from './PixelatedCard';
import { Badge } from '@/components/ui/badge';

interface RivalCardProps {
  rival: Rival;
}

export function RivalCard({ rival }: RivalCardProps) {
  const { level, progress, xpIntoLevel, totalXPForLevel } = useLevelSystem(rival.xp);

  return (
    <PixelatedCard className="p-4 flex flex-col items-center text-center">
      <Image
        src={rival.imageUrl}
        alt={rival.name}
        width={80}
        height={80}
        data-ai-hint={rival.imageHint}
        className="rounded-full border-4 border-foreground mb-2 object-cover"
      />
      <h3 className="text-xl font-bold font-headline">{rival.name}</h3>
      <Badge variant="secondary" className="mb-4">{rival.behavior}</Badge>
      <div className="w-full">
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
