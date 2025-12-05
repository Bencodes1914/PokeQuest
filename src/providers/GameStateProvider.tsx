
"use client";

import React, { createContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { getInitialGameState, initialAchievements } from '@/lib/data';
import { getLevelFromXP, calculateOfflineRivalXP, checkAchievements } from '@/lib/game-logic';
import type { GameState, Rival, DailySummary } from '@/lib/types';
import { useIsClient } from '@/hooks/use-is-client';

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

  const getSavedState = useCallback(() => {
    try {
      const savedState = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (savedState) {
        const parsedState = JSON.parse(savedState);
        // Re-hydrate achievement functions
        const rehydratedAchievements = initialAchievements.map(initialAch => {
            const savedAch = parsedState.achievements.find((a: any) => a.id === initialAch.id);
            return { ...initialAch, unlocked: savedAch ? savedAch.unlocked : initialAch.unlocked };
        });
        parsedState.achievements = rehydratedAchievements;
        return parsedState;
      }
    } catch (error) {
      console.error("Failed to load game state from localStorage:", error);
    }
    return getInitialGameState();
  }, []);

  // Load state from localStorage on initial mount
  useEffect(() => {
    if (isClient) {
      setGameState(getSavedState());
      setLoading(false);
    }
  }, [isClient, getSavedState]);

  // Process state changes (leveling, achievements, offline progress, summary)
  useEffect(() => {
    if (loading || !gameState || !isClient) return;

    const processState = async () => {
      let state = { ...gameState };
      let hasChanges = false;
      const today = new Date();
      today.setHours(0, 0, 0, 0); // Normalize to start of day
      
      const todayDateString = today.toISOString().split('T')[0];
      
      const lastPlayedDateString = state.lastPlayed;
      const lastSummaryDateString = state.lastSummaryDate;

      // --- Daily Summary Check ---
      if (todayDateString !== lastSummaryDateString) {
        const previousDayStateJSON = localStorage.getItem(`${LOCAL_STORAGE_KEY}_${lastSummaryDateString}`);
        const previousDayState = previousDayStateJSON ? JSON.parse(previousDayStateJSON) : getInitialGameState();
        
        const userXpAtStartOfDay = previousDayState.user?.xp ?? 0;

        const rivalsAtSummaryStart = previousDayState.rivals ?? getInitialGameState().rivals;
        const rivalsXpGainedData = state.rivals.map(rival => {
            const startRival = rivalsAtSummaryStart.find((r: Rival) => r.id === rival.id);
            return {
                rivalId: rival.name,
                xpGained: rival.xp - (startRival?.xp ?? 0)
            };
        });
        
        const rivalsWithReasons = rivalsXpGainedData
                .filter(r => r.xpGained > 0)
                .map(r => {
                    return {
                        rivalId: r.rivalId,
                        xpGained: r.xpGained,
                        reason: `Your rival was busy!`, // Placeholder reason
                    };
                });
        
        const userXpGained = state.user.xp - userXpAtStartOfDay;
        const totalRivalXP = rivalsXpGainedData.reduce((acc, r) => acc + r.xpGained, 0);
        const outcome = userXpGained > totalRivalXP ? 'win' : userXpGained < totalRivalXP ? 'loss' : 'tie';
        
        const lastPlayedDate = new Date(lastPlayedDateString);
        lastPlayedDate.setHours(0,0,0,0);
        const isLastPlayedValid = !isNaN(lastPlayedDate.getTime());
        const diffDays = isLastPlayedValid ? Math.round((today.getTime() - lastPlayedDate.getTime()) / (1000 * 60 * 60 * 24)) : 2;

        const summary: DailySummary = {
          date: lastSummaryDateString,
          userXpGained: userXpGained,
          rivalsXpGained: rivalsWithReasons,
          outcome: outcome,
          streak: diffDays > 1 ? 0 : state.streak,
        };

        const newStreak = diffDays > 1 ? 0 : state.streak;

        state = {
            ...getInitialGameState(),
            achievements: state.achievements, // Persist achievements
            streak: newStreak, 
            lastSummaryDate: todayDateString,
            lastPlayed: todayDateString,
            user: { ...state.user, xp: state.user.xp }, // Persist user XP for a day
        };
        
        setGameState(state);
        router.replace(`/summary?data=${encodeURIComponent(JSON.stringify(summary))}`);
        return; 
      }

      // --- Offline Rival Progression ---
      if (lastPlayedDateString) {
        const lastPlayedDate = new Date(lastPlayedDateString);
        lastPlayedDate.setHours(0, 0, 0, 0);

        if (!isNaN(lastPlayedDate.getTime())) {
            const daysElapsed = Math.round((today.getTime() - lastPlayedDate.getTime()) / (1000 * 60 * 60 * 24));
            
            if (daysElapsed > 0) {
              let rivalUpdates = [...state.rivals];
              let newNotifications = [...state.notifications];

              const updatedRivals = state.rivals.map((rival: Rival) => {
                  const xpGained = calculateOfflineRivalXP(rival, daysElapsed);
                  if (xpGained > 0) {
                      return { ...rival, xp: rival.xp + xpGained };
                  }
                  return rival;
              });

              for (const updatedRival of updatedRivals) {
                  const oldRival = state.rivals.find(r => r.id === updatedRival.id)!;
                  const xpGained = updatedRival.xp - oldRival.xp;

                  if (xpGained > 0) {
                    const oldLevel = getLevelFromXP(oldRival.xp);
                    const newLevel = getLevelFromXP(updatedRival.xp);
                    if (newLevel > oldLevel) {
                        newNotifications.push({ id: `rival-levelup-${updatedRival.id}-${Date.now()}`, message: `${updatedRival.name} leveled up while you were away!`, timestamp: Date.now(), read: false });
                    } else {
                        newNotifications.push({ id: `rival-xp-${updatedRival.id}-${Date.now()}`, message: `${updatedRival.name} gained ${xpGained.toFixed(0)} XP.`, timestamp: Date.now(), read: false });
                    }
                  }
              }
              rivalUpdates = updatedRivals;

              state = { 
                  ...state, 
                  rivals: rivalUpdates, 
                  notifications: newNotifications,
                  streak: daysElapsed > 1 ? 0 : state.streak, 
                  lastPlayed: today.toISOString().split('T')[0]
              };
              hasChanges = true;
            }
        }
      }
      
      const userLevel = getLevelFromXP(state.user.xp);
      if (userLevel !== state.user.level) {
        state = { ...state, user: { ...state.user, level: userLevel } };
        hasChanges = true;
      }

      const rivalsWithNewLevels = state.rivals.map(r => ({ ...r, level: getLevelFromXP(r.xp) }));
      if (JSON.stringify(rivalsWithNewLevels) !== JSON.stringify(state.rivals)) {
        state = { ...state, rivals: rivalsWithNewLevels };
        hasChanges = true;
      }

      const checkedState = checkAchievements(state);
      if (JSON.stringify(checkedState.achievements) !== JSON.stringify(state.achievements) || JSON.stringify(checkedState.notifications) !== JSON.stringify(state.notifications)) {
        state = checkedState;
        hasChanges = true;
      }

      if (hasChanges) {
        setGameState(state);
      }
    };

    const timeoutId = setTimeout(() => {
        processState();
    }, 1000); // Delay processing to batch rapid changes

    return () => clearTimeout(timeoutId);

  }, [gameState, loading, isClient, router]);


  // Save state to localStorage whenever it changes
  useEffect(() => {
    if (!loading && gameState && isClient) {
      const stateToSave = { ...gameState };
      // Functions can't be stored in JSON, so we remove the `check` function before saving.
      stateToSave.achievements = gameState.achievements.map(({ check, ...ach }) => ach);

      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(stateToSave));
      localStorage.setItem(`${LOCAL_STORAGE_KEY}_${gameState.lastSummaryDate}`, JSON.stringify(stateToSave));
    }
  }, [gameState, loading, isClient]);

  const clearSummary = () => {
    if (isClient) {
        setGameState(prev => {
            if (!prev) return null;
            const today = new Date().toISOString().split('T')[0];
            const newState = {
                ...getInitialGameState(),
                achievements: prev.achievements,
                streak: prev.streak,
                user: { ...prev.user }, // Keep user XP and level
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
