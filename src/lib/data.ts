
import { getLevelFromXP } from './game-logic';
import type { GameState, Task, Rival, Achievement } from './types';
import { PlaceHolderImages } from './placeholder-images';
import { Archive, Award, Calendar, CheckCircle, Zap } from 'lucide-react';

const rivalImages = {
  jessie: PlaceHolderImages.find(img => img.id === 'jessie')!,
  james: PlaceHolderImages.find(img => img.id === 'james')!,
  meowth: PlaceHolderImages.find(img => img.id === 'meowth')!,
  giovanni: PlaceHolderImages.find(img => img.id === 'giovanni')!,
};

export const initialRivals: Rival[] = [
  {
    id: 'jessie',
    name: "Jessie",
    xp: 25,
    level: 1,
    behavior: 'Focused',
    imageUrl: rivalImages.jessie.imageUrl,
    imageHint: rivalImages.jessie.imageHint,
  },
  {
    id: 'james',
    name: "James",
    xp: 5,
    level: 1,
    behavior: 'Lazy',
    imageUrl: rivalImages.james.imageUrl,
    imageHint: rivalImages.james.imageHint,
  },
  {
    id: 'meowth',
    name: "Meowth",
    xp: 15,
    level: 1,
    behavior: 'Chaotic',
    imageUrl: rivalImages.meowth.imageUrl,
    imageHint: rivalImages.meowth.imageHint,
  },
  {
    id: 'giovanni',
    name: "Giovanni",
    xp: 75,
    level: 1,
    behavior: 'Hardcore',
    imageUrl: rivalImages.giovanni.imageUrl,
    imageHint: rivalImages.giovanni.imageHint,
  },
];

export const initialTasks: Task[] = [
  { id: 'task-1', name: 'Catch a Pidgey', difficulty: 'Easy', duration: 10, isTimeLocked: true, completed: false },
  { id: 'task-2', name: 'Walk 1km', difficulty: 'Easy', duration: 0, isTimeLocked: false, completed: false },
  { id: 'task-3', name: 'Win a Trainer Battle', difficulty: 'Medium', duration: 60, isTimeLocked: true, completed: false },
  { id: 'task-4', name: 'Evolve a Pokemon', difficulty: 'Medium', duration: 0, isTimeLocked: false, completed: false },
  { id: 'task-5', name: 'Defeat a Gym Leader', difficulty: 'Hard', duration: 300, isTimeLocked: true, completed: false },
  { id: 'task-6', name: 'Hatch an Egg', difficulty: 'Hard', duration: 0, isTimeLocked: false, completed: false },
];

export const initialAchievements: Achievement[] = [
    { id: 'ach-1', name: 'First Step', description: 'Complete your first task.', icon: CheckCircle, unlocked: false, check: (gs) => gs.tasks.some(t => t.completed) },
    { id: 'ach-2', name: 'Getting Stronger', description: 'Reach Level 5.', icon: Zap, unlocked: false, check: (gs) => getLevelFromXP(gs.user.xp) >= 5 },
    { id: 'ach-3', name: 'Dedicated Trainer', description: 'Achieve a 7-day streak.', icon: Calendar, unlocked: false, check: (gs) => gs.streak >= 7 },
    { id: 'ach-4', name: 'Taskmaster', description: 'Complete all daily tasks.', icon: Archive, unlocked: false, check: (gs) => gs.tasks.every(t => t.completed) },
    { id: 'ach-5', name: 'Champion in the Making', description: 'Reach Level 10.', icon: Award, unlocked: false, check: (gs) => getLevelFromXP(gs.user.xp) >= 10 },
];


export const getInitialGameState = (): GameState => {
  const userXP = 0;
  const userLevel = getLevelFromXP(userXP);

  const today = new Date().toISOString().split('T')[0];

  return {
    user: {
      name: 'Ash',
      xp: userXP,
      level: userLevel,
    },
    rivals: initialRivals.map(r => ({...r, level: getLevelFromXP(r.xp)})),
    tasks: initialTasks,
    achievements: initialAchievements,
    streak: 0,
    lastPlayed: today,
    lastSummaryDate: today,
    notifications: [{
        id: 'welcome-1',
        message: 'Welcome to PokeQuest! Complete tasks to level up.',
        timestamp: Date.now(),
        read: false,
    }],
  };
};
