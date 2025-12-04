export type Difficulty = 'Easy' | 'Medium' | 'Hard';

export interface Task {
  id: string;
  name: string;
  difficulty: Difficulty;
  duration: number; // in seconds
  isTimeLocked: boolean;
  completed: boolean;
  startTime?: number;
}

export interface Player {
  name:string;
  xp: number;
  level: number;
}

export type RivalBehavior = 'Lazy' | 'Focused' | 'Hardcore' | 'Chaotic';

export interface Rival extends Player {
  id: string;
  behavior: RivalBehavior;
  imageUrl: string;
  imageHint: string;
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: React.ElementType;
  unlocked: boolean;
  check: (gameState: GameState) => boolean;
}

export interface GameNotification {
  id: string;
  message: string;
  timestamp: number;
  read: boolean;
}

export interface DailySummary {
  date: string;
  userXpGained: number;
  rivalsXpGained: { rivalId: string; xpGained: number; reason: string }[];
  outcome: 'win' | 'loss' | 'tie';
  streak: number;
}

export interface GameState {
  id?: string; // Document ID in Firestore
  user: Player;
  rivals: Rival[];
  tasks: Task[];
  achievements: Achievement[];
  streak: number;
  lastPlayed: string; // ISO date string
  lastSummaryDate: string; // ISO date string
  notifications: GameNotification[];
  lastCompletedTaskTimestamp?: number;
}
