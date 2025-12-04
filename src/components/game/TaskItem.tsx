"use client";

import React, { useState, useEffect } from "react";
import { useGameState } from "@/hooks/use-game-state";
import type { Task } from "@/lib/types";
import { getTaskXP, getStreakMultiplier } from "@/lib/game-logic";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PixelatedCard } from "./PixelatedCard";
import { Sparkles } from "./Sparkles";
import { useToast } from "@/hooks/use-toast";
import { antiCheatReasoning } from "@/ai/flows/anti-cheat-reasoning";
import { Clock, Zap } from "lucide-react";

interface TaskItemProps {
  task: Task;
}

export function TaskItem({ task }: TaskItemProps) {
  const { setGameState, gameState } = useGameState();
  const { toast } = useToast();
  const [timer, setTimer] = useState(0);
  const [isCompleting, setIsCompleting] = useState(false);
  const [showSparkles, setShowSparkles] = useState(false);

  useEffect(() => {
    let interval: NodeJS.Timeout | undefined;
    if (task.startTime && !task.completed) {
      const updateTimer = () => {
        const elapsed = (Date.now() - (task.startTime || 0)) / 1000;
        const remaining = Math.max(0, task.duration - elapsed);
        setTimer(remaining);
      };
      updateTimer();
      interval = setInterval(updateTimer, 1000);
    }
    return () => clearInterval(interval);
  }, [task.startTime, task.duration, task.completed]);

  const handleStart = () => {
    setGameState(prev => {
      if (!prev) return null;
      return {
        ...prev,
        tasks: prev.tasks.map(t =>
          t.id === task.id ? { ...t, startTime: Date.now() } : t
        ),
      };
    });
  };

  const handleComplete = async () => {
    if (!gameState) return;
    setIsCompleting(true);

    let securityChecksPassed = true;
    let userActions = `Completed task "${task.name}".`;

    // Anti-cheat: Time-lock check
    if (task.isTimeLocked && task.startTime) {
        const timeTaken = (Date.now() - task.startTime) / 1000;
        if (timeTaken < task.duration - 2) { // Allow 2s leeway
            securityChecksPassed = false;
            userActions += ` Attempted to complete a ${task.duration}s task in ${timeTaken.toFixed(1)}s.`;
        }
    }

    // Anti-cheat: Task spam check
    if (gameState.lastCompletedTaskTimestamp) {
        const timeSinceLast = Date.now() - gameState.lastCompletedTaskTimestamp;
        if (timeSinceLast < 1000) { // Less than 1 second between completions
            securityChecksPassed = false;
            userActions += ` Completed another task just ${timeSinceLast}ms ago.`;
        }
    }

    if (!securityChecksPassed) {
        try {
            const reasoning = await antiCheatReasoning({ userActions, securityChecksPassed });
            toast({
                variant: "destructive",
                title: "Anti-Cheat System",
                description: reasoning.justification,
            });
        } catch (error) {
             toast({
                variant: "destructive",
                title: "Anti-Cheat System",
                description: "Suspicious activity detected. Task completion blocked.",
            });
        }
        setIsCompleting(false);
        return;
    }


    const baseXP = getTaskXP(task.difficulty);
    const multiplier = getStreakMultiplier(gameState.streak);
    const earnedXP = baseXP * multiplier;

    setShowSparkles(true);
    setTimeout(() => setShowSparkles(false), 800);
    
    setGameState(prev => {
      if (!prev) return null;
      const today = new Date().toISOString().split('T')[0];
      const isNewDay = prev.lastPlayed !== today;
      
      return {
        ...prev,
        user: { ...prev.user, xp: prev.user.xp + earnedXP },
        tasks: prev.tasks.map(t =>
          t.id === task.id ? { ...t, completed: true, startTime: undefined } : t
        ),
        streak: isNewDay ? prev.streak + 1 : prev.streak,
        lastPlayed: today,
        lastCompletedTaskTimestamp: Date.now(),
      };
    });

    toast({
        title: "Task Complete!",
        description: `You earned ${earnedXP.toFixed(0)} XP!`,
    });
    setIsCompleting(false);
  };

  const xp = getTaskXP(task.difficulty);
  const totalXp = xp * getStreakMultiplier(gameState?.streak || 0);

  const renderButton = () => {
    if (task.completed) {
      return <Button disabled variant="secondary">Completed</Button>;
    }
    if (task.isTimeLocked) {
      if (!task.startTime) {
        return <Button onClick={handleStart} disabled={isCompleting}>Start</Button>;
      }
      if (timer > 0) {
        const minutes = Math.floor(timer / 60);
        const seconds = Math.floor(timer % 60);
        return <Button disabled>In Progress ({`${minutes}:${seconds.toString().padStart(2, '0')}`})</Button>;
      }
    }
    return <Button onClick={handleComplete} disabled={isCompleting} variant="default" className="bg-accent hover:bg-accent/90 text-accent-foreground">Complete</Button>;
  };

  return (
    <Sparkles isActive={showSparkles}>
      <PixelatedCard className="p-4 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold font-headline">{task.name}</h3>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant={task.difficulty === 'Hard' ? 'destructive' : task.difficulty === 'Medium' ? 'default' : 'secondary'}>
              {task.difficulty}
            </Badge>
            <div className="flex items-center gap-1 text-primary font-bold">
                <Zap className="w-4 h-4" />
                <span>{xp} (x{getStreakMultiplier(gameState?.streak || 0).toFixed(2)} = {totalXp.toFixed(0)})</span>
            </div>
            {task.isTimeLocked && (
                <div className="flex items-center gap-1 text-muted-foreground">
                    <Clock className="w-4 h-4"/>
                    <span>{task.duration}s</span>
                </div>
            )}
          </div>
        </div>
        {renderButton()}
      </PixelatedCard>
    </Sparkles>
  );
}
