
"use client";

import React, { createContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { getInitialGameState, initialAchievements } from '@/lib/data';
import { getLevelFromXP, calculateOfflineRivalXP, checkAchievements } from '@/lib/game-logic';
import type { GameState, Rival, DailySummary, RivalBehavior } from '@/lib/types';
import { useIsClient } from '@/hooks/use-is-client';
import { getRivalXPReasoning, getNotificationText } from '@/lib/actions';

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
                rivalBehavior: rival.behavior as RivalBehavior,
                xpGained: rival.xp - (startRival?.xp ?? 0)
            };
        });
        
        const rivalsWithReasons = await Promise.all(
            rivalsXpGainedData
                .filter(r => r.xpGained > 0)
                .map(async r => {
                    const reasonResult = await getRivalXPReasoning(
                        r.rivalId,
                        r.rivalBehavior,
                        r.xpGained,
                    );
                    return {
                        rivalId: r.rivalId,
                        xpGained: r.xpGained,
                        reason: reasonResult.reason,
                    };
                })
        );
        
        const userXpGained = state.user.xp - userXpAtStartOfDay;
        const totalRivalXP = rivalsXpGainedData.reduce((acc, r) => acc + r.xpGained, 0);
        const outcome = userXpGained > totalRivalXP ? 'win' : userXpGained < totalRivalXP ? 'loss' : 'tie';
        
        const lastPlayedDate = new Date(lastPlayedDateString);
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
        if (!isNaN(lastPlayedDate.getTime())) {
            const hoursElapsed = (today.getTime() - lastPlayedDate.getTime()) / (1000 * 60 * 60);
            
            if (hoursElapsed > 0.1) {
              const diffDays = Math.round(hoursElapsed / 24);

              let rivalUpdates = [...state.rivals];
              let newNotifications = [...state.notifications];

              if (hoursElapsed > 0) {
                  const updatedRivals = await Promise.all(state.rivals.map(async (rival: Rival) => {
                      const xpGained = calculateOfflineRivalXP(rival, hoursElapsed);
                      if (xpGained > 0) {
                          const reason = await getRivalXPReasoning(rival.name, rival.behavior, xpGained);
                          return { ...rival, xp: rival.xp + xpGained, reason: reason.reason };
                      }
                      return { ...rival, reason: "" };
                  }));

                  for (const update of updatedRivals) {
                      if (!update.reason) continue;
                      const oldRival = state.rivals.find(r => r.id === update.id)!;
                      const oldLevel = getLevelFromXP(oldRival.xp);
                      const newLevel = getLevelFromXP(update.xp);
                      if (newLevel > oldLevel) {
                          const notif = await getNotificationText(state.streak, update.name, update.xp, state.user.xp);
                          newNotifications.push({ id: `rival-levelup-${update.id}-${Date.now()}`, message: `${update.name} leveled up! ${notif.notificationText}`, timestamp: Date.now(), read: false });
                      } else {
                          newNotifications.push({ id: `rival-xp-${update.id}-${Date.now()}`, message: `${update.name} gained XP: "${update.reason}"`, timestamp: Date.now(), read: false });
                      }
                  }
                  rivalUpdates = updatedRivals.map(({ reason, ...rest }) => rest);
              }

              state = { 
                  ...state, 
                  rivals: rivalUpdates, 
                  notifications: newNotifications,
                  streak: diffDays > 1 ? 0 : state.streak, 
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
