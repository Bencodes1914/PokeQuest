
"use client";

import React, { createContext, useState, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { getInitialGameState, initialAchievements } from '@/lib/data';
import { getLevelFromXP, calculateOfflineRivalXP, checkAchievements } from '@/lib/game-logic';
import type { GameState, Rival, DailySummary, RivalBehavior, Achievement } from '@/lib/types';
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

  // Load state from localStorage on initial mount
  useEffect(() => {
    if (isClient) {
      try {
        const savedStateJSON = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (savedStateJSON) {
          const savedState = JSON.parse(savedStateJSON);
          // Re-hydrate achievement check functions
          const rehydratedAchievements = initialAchievements.map(initialAch => {
            const savedAch = savedState.achievements.find((a: Achievement) => a.id === initialAch.id);
            return { ...initialAch, unlocked: savedAch ? savedAch.unlocked : initialAch.unlocked };
          });
          savedState.achievements = rehydratedAchievements;
          setGameState(savedState);
        } else {
          setGameState(getInitialGameState());
        }
      } catch (error) {
        console.error("Failed to load game state:", error);
        setGameState(getInitialGameState());
      }
      setLoading(false); // End loading after initial state is set
    }
  }, [isClient]);

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
        const previousDayStateJSON = localStorage.getItem(LOCAL_STORAGE_KEY);
        // Only run summary if there's a previous state to compare to
        if (previousDayStateJSON) {
            const previousDayState = JSON.parse(previousDayStateJSON);
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
             // Check if the date is valid
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
            return; // Stop further processing to allow summary page to show
        }
      }


      // --- Offline Rival Progression & Daily Reset ---
      if (lastPlayedDateString) {
        const lastPlayedDate = new Date(lastPlayedDateString);
        if (!isNaN(lastPlayedDate.getTime())) {
            const hoursElapsed = (today.getTime() - lastPlayedDate.getTime()) / (1000 * 60 * 60);
            
            // Only run if significant time has passed to avoid rapid firing
            if (hoursElapsed > 0.1) {
              const isNewDay = todayDateString !== lastPlayedDateString;
              const diffDays = Math.round(hoursElapsed / 24);

              let rivalUpdates = [...state.rivals];
              let newNotifications = [...state.notifications];

              // Apply offline XP gain for rivals
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
                  // Reset streak if more than a day has passed
                  streak: diffDays > 1 ? 0 : state.streak, 
                   // Set last played to now to mark the "catch up"
                  lastPlayed: today.toISOString().split('T')[0]
              };
              hasChanges = true;
            }
        }
      }
      
      // --- Level and Achievement Calculation ---
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

    processState();
  }, [loading]); // Rerunning on loading change after initial load.


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
