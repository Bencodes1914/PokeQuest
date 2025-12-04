"use client";

import { useGameState } from "@/hooks/use-game-state";
import { TaskItem } from "@/components/game/TaskItem";
import { Skeleton } from "@/components/ui/skeleton";
import { NotificationBell } from "@/components/game/NotificationBell";

export default function TasksPage() {
  const { gameState, loading } = useGameState();

  const sortedTasks = gameState?.tasks.slice().sort((a, b) => a.completed === b.completed ? 0 : a.completed ? 1 : -1);

  return (
    <div className="container mx-auto max-w-2xl">
      <header className="flex justify-between items-center mb-6">
        <h1 className="text-4xl font-bold font-headline">Daily Tasks</h1>
        <NotificationBell />
      </header>
      
      {loading || !gameState ? (
        <div className="space-y-4">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      ) : (
        <div className="space-y-4">
          {sortedTasks?.map(task => <TaskItem key={task.id} task={task} />)}
        </div>
      )}
    </div>
  );
}
