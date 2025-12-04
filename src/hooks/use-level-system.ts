import { useMemo } from 'react';
import { getXPForLevel, getLevelFromXP, BASE_XP_REQ, XP_GROWTH_FACTOR } from '@/lib/game-logic';

export const useLevelSystem = (xp: number) => {
  const level = useMemo(() => getLevelFromXP(xp), [xp]);

  const xpForCurrentLevel = useMemo(() => getXPForLevel(level), [level]);
  const xpForNextLevel = useMemo(() => getXPForLevel(level + 1), [level]);

  const progress = useMemo(() => {
    const totalXPForLevel = xpForNextLevel - xpForCurrentLevel;
    if (totalXPForLevel === 0) return 0;
    const xpIntoLevel = xp - xpForCurrentLevel;
    return (xpIntoLevel / totalXPForLevel) * 100;
  }, [xp, xpForCurrentLevel, xpForNextLevel]);

  return {
    level,
    xpForCurrentLevel,
    xpForNextLevel,
    progress,
    xpIntoLevel: xp - xpForCurrentLevel,
    totalXPForLevel: xpForNextLevel - xpForCurrentLevel,
  };
};
