import type { Difficulty, GameState, Rival, RivalBehavior } from './types';

// --- Leveling System ---
export const BASE_XP_REQ = 100;
export const XP_GROWTH_FACTOR = 75;

export const getXPForLevel = (level: number): number => {
  if (level <= 1) return 0;
  // This is an arithmetic series sum formula
  const previousLevel = level - 1;
  return (previousLevel * (2 * BASE_XP_REQ + (previousLevel - 1) * XP_GROWTH_FACTOR)) / 2;
};

export const getLevelFromXP = (xp: number): number => {
  let level = 1;
  while (xp >= getXPForLevel(level + 1)) {
    level++;
  }
  return level;
};

// --- Task XP ---
export const getTaskXP = (difficulty: Difficulty): number => {
  switch (difficulty) {
    case 'Easy':
      return 10;
    case 'Medium':
      return 25;
    case 'Hard':
      return 50;
    default:
      return 0;
  }
};

// --- Streak Multiplier ---
export const getStreakMultiplier = (streak: number): number => {
  if (streak <= 0) return 1.0;
  const multiplier = 1.0 + streak * 0.15;
  return Math.min(multiplier, 2.0);
};

// --- Rival Offline Progression ---
// Returns a random task difficulty for a rival based on their behavior
const getSimulatedRivalTaskDifficulty = (behavior: RivalBehavior): Difficulty => {
  const rand = Math.random();
  switch (behavior) {
    case 'Lazy':
      return 'Easy'; // Always does easy tasks
    case 'Focused':
      if (rand < 0.6) return 'Medium'; // 60% Medium, 40% Easy
      return 'Easy';
    case 'Hardcore':
      if (rand < 0.5) return 'Hard'; // 50% Hard, 50% Medium
      return 'Medium';
    case 'Chaotic':
      if (rand < 0.33) return 'Easy';
      if (rand < 0.66) return 'Medium';
      return 'Hard';
    default:
      return 'Easy';
  }
}

// Simulates rival XP gain for days passed. Each day, the rival has a chance to complete one task.
export const calculateOfflineRivalXP = (rival: Rival, daysElapsed: number): number => {
    let totalXpGained = 0;
    for (let i = 0; i < daysElapsed; i++) {
        const activityChance = { 'Lazy': 0.3, 'Focused': 0.7, 'Hardcore': 0.9, 'Chaotic': 0.9 }[rival.behavior];
        
        if (Math.random() < activityChance) {
            const taskDifficulty = getSimulatedRivalTaskDifficulty(rival.behavior);
            totalXpGained += getTaskXP(taskDifficulty);
        }
    }
    return totalXpGained;
};


// --- Achievement Checks ---
export const checkAchievements = (gameState: GameState): GameState => {
  const updatedAchievements = gameState.achievements.map(ach => {
    if (!ach.unlocked && ach.check(gameState)) {
      return { ...ach, unlocked: true };
    }
    return ach;
  });

  const newUnlocks = updatedAchievements.filter((ach, index) => ach.unlocked && !gameState.achievements[index].unlocked);

  const newNotifications = newUnlocks.map(ach => ({
    id: `ach-${ach.id}-${Date.now()}`,
    message: `Achievement Unlocked: ${ach.name}!`,
    timestamp: Date.now(),
    read: false,
  }));
  
  return {
    ...gameState,
    achievements: updatedAchievements,
    notifications: [...gameState.notifications, ...newNotifications],
  };
};
