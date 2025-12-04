"use client";

import { useState } from "react";
import { useGameState } from "@/hooks/use-game-state";
import { TaskItem } from "@/components/game/TaskItem";
import { Skeleton } from "@/components/ui/skeleton";
import { NotificationBell } from "@/components/game/NotificationBell";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { CreateTaskForm } from "@/components/game/CreateTaskForm";


export default function TasksPage() {
  const { gameState, loading } = useGameState();
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const sortedTasks = gameState?.tasks.slice().sort((a, b) => a.completed === b.completed ? 0 : a.completed ? 1 : -1);

  return (
    <div className="container mx-auto max-w-2xl">
      <header className="flex justify-between items-center mb-6">
        <h1 className="text-4xl font-bold font-headline">Daily Tasks</h1>
        <div className="flex items-center gap-2">
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                    <Button>
                        <PlusCircle className="mr-2 h-4 w-4" /> New Task
                    </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                    <DialogTitle>Create a new task</DialogTitle>
                    </DialogHeader>
                    <CreateTaskForm onTaskCreated={() => setIsDialogOpen(false)} />
                </DialogContent>
            </Dialog>
            <NotificationBell />
        </div>
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
