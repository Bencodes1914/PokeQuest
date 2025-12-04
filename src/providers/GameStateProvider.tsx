
"use client";

import React, { createContext, useState, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { getInitialGameState } from '@/lib/data';
import { getLevelFromXP, calculateOfflineRivalXP, checkAchievements } from '@/lib/game-logic';
import type { GameState, Rival, DailySummary, RivalBehavior } from '@/lib/types';
import { useIsClient } from '@/hooks/use-is-client';
import { rivalXPReasoning } from '@/ai/flows/rival-xp-reasoning';
import { generateNotificationText } from '@/ai/flows/notification-text-generation';

const LOCAL_STORAGE_KEY = 'pokeQuestGameState';

export interface GameStateContextType {
  gameState: GameState | null;
  setGameState: React.Dispatch<React.SetStateAction<GameState | null>>;
  loading: boolean;
  clearSummary: () => void;
}

export const GameStateContext = createContext<GameStateContextType | undefined>(undefined);

export function GameStateProvider({ children }: { children: ReactNode }) {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const isClient = useIsClient();

  // Load state from localStorage on initial mount
  useEffect(() => {
    if (isClient) {
      try {
        const savedStateJSON = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (savedStateJSON) {
          setGameState(JSON.parse(savedStateJSON));
        } else {
          setGameState(getInitialGameState());
        }
      } catch (error) {
        console.error("Failed to load game state:", error);
        setGameState(getInitialGameState());
      }
    }
  }, [isClient]);

  // Process state changes (leveling, achievements, offline progress, summary)
  useEffect(() => {
    if (!gameState || !isClient) return;

    const processState = async () => {
      let state = { ...gameState };
      let hasChanges = false;
      const today = new Date();
      const todayDateString = today.toISOString().split('T')[0];
      const lastPlayedDate = new Date(state.lastPlayed);

      const isNewDay = today.toDateString() !== lastPlayedDate.toDateString();

      // --- Daily Summary Check ---
      if (today.toDateString() !== new Date(state.lastSummaryDate).toDateString()) {
        const rivalsAtSummaryStart = getInitialGameState().rivals;
        const rivalsXpGainedData = state.rivals.map(rival => {
            const startRival = rivalsAtSummaryStart.find(r => r.id === rival.id)!;
            return {
                rivalId: rival.name,
                rivalBehavior: rival.behavior as RivalBehavior,
                xpGained: rival.xp - startRival.xp
            };
        });

        const rivalsWithReasons = await Promise.all(
            rivalsXpGainedData
                .filter(r => r.xpGained > 0)
                .map(async r => {
                    const reasonResult = await rivalXPReasoning({
                        rivalName: r.rivalId,
                        rivalBehavior: r.rivalBehavior,
                        xpGained: r.xpGained,
                    });
                    return {
                        rivalId: r.rivalId,
                        xpGained: r.xpGained,
                        reason: reasonResult.reason,
                    };
                })
        );
        
        const userXpGained = state.user.xp; // XP is reset daily, so this is the daily gain
        const totalRivalXP = rivalsXpGainedData.reduce((acc, r) => acc + r.xpGained, 0);
        const outcome = userXpGained > totalRivalXP ? 'win' : userXpGained < totalRivalXP ? 'loss' : 'tie';

        const summary: DailySummary = {
          date: state.lastSummaryDate,
          userXpGained: userXpGained,
          rivalsXpGained: rivalsWithReasons,
          outcome: outcome,
          streak: state.streak,
        };

        // Reset for new day after creating summary
        state = {
            ...getInitialGameState(),
            achievements: state.achievements, // Persist achievements
            streak: isNewDay ? state.streak : 0, // Reset streak if a day was missed
            lastSummaryDate: todayDateString,
        };
        hasChanges = true;
        
        router.replace(`/summary?data=${encodeURIComponent(JSON.stringify(summary))}`);
        setGameState(state);
        return; // Stop further processing until summary is cleared
      }


      // --- Offline Rival Progression ---
      const hoursElapsed = (today.getTime() - lastPlayedDate.getTime()) / (1000 * 60 * 60);
      if (hoursElapsed > 1) {
        const rivalUpdates = await Promise.all(state.rivals.map(async (rival: Rival) => {
          const xpGained = calculateOfflineRivalXP(rival, hoursElapsed);
          if (xpGained > 0) {
            const reason = await rivalXPReasoning({ rivalName: rival.name, rivalBehavior: rival.behavior, xpGained });
            return { ...rival, xp: rival.xp + xpGained, reason: reason.reason };
          }
          return { ...rival, reason: "" };
        }));

        const newNotifications = [];
        for (const update of rivalUpdates) {
             const oldRival = state.rivals.find(r => r.id === update.id)!;
             const oldLevel = getLevelFromXP(oldRival.xp);
             const newLevel = getLevelFromXP(update.xp);
             if (newLevel > oldLevel) {
                 const notif = await generateNotificationText({
                     streak: state.streak,
                     rivalName: update.name,
                     rivalXp: update.xp,
                     userXp: state.user.xp
                 });
                 newNotifications.push({ id: `rival-levelup-${update.id}-${Date.now()}`, message: `${update.name} leveled up! ${notif.notificationText}`, timestamp: Date.now(), read: false });
             }
        }

        state = { ...state, rivals: rivalUpdates.map(({reason, ...rest}) => rest), notifications: [...state.notifications, ...newNotifications] };
        hasChanges = true;
      }
      
      // --- Daily Streak Reset ---
       if (isNewDay) {
        const diffDays = Math.round((today.getTime() - lastPlayedDate.getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays > 1) {
          state = { ...state, streak: 0 };
          hasChanges = true;
        }
      }

      // --- Level and Achievement Calculation ---
      const userLevel = getLevelFromXP(state.user.xp);
      if (userLevel !== state.user.level) {
        state = { ...state, user: { ...state.user, level: userLevel } };
        hasChanges = true;
      }

      const rivalsWithNewLevels = state.rivals.map(r => ({ ...r, level: getLevelFromXP(r.xp) }));
      state = { ...state, rivals: rivalsWithNewLevels };

      const checkedState = checkAchievements(state);
      if (JSON.stringify(checkedState) !== JSON.stringify(state)) {
        state = checkedState;
        hasChanges = true;
      }

      if (hasChanges) {
        setGameState(state);
      }
    };

    processState().finally(() => setLoading(false));

  }, [isClient, gameState?.user.xp, gameState?.tasks]);


  // Save state to localStorage whenever it changes
  useEffect(() => {
    if (isClient && gameState && !loading) {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(gameState));
    }
  }, [gameState, isClient, loading]);

  const clearSummary = () => {
    if (isClient) {
        setGameState(prev => {
            if (!prev) return null;
            const today = new Date().toISOString().split('T')[0];
            const newState = {
                ...getInitialGameState(),
                achievements: prev.achievements,
                streak: prev.streak,
                lastPlayed: today,
                lastSummaryDate: today
            };
            return newState;
        });
    }
  };

  return (
    <GameStateContext.Provider value={{ gameState, setGameState, loading, clearSummary }}>
      {children}
    </GameStateContext.Provider>
  );
}
