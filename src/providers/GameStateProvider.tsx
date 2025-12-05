
"use client";

import React, { createContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { getInitialGameState, initialAchievements, initialTasks } from '@/lib/data';
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

  const getSavedState = useCallback((dateStr?: string) => {
    try {
      const key = dateStr ? `${LOCAL_STORAGE_KEY}_${dateStr}` : LOCAL_STORAGE_KEY;
      const savedState = localStorage.getItem(key);
      if (savedState) {
        const parsedState = JSON.parse(savedState);
        
        const rehydratedAchievements = initialAchievements.map(initialAch => {
            const savedAch = parsedState.achievements.find((a: any) => a.id === initialAch.id);
            return { ...initialAch, unlocked: savedAch ? savedAch.unlocked : initialAch.unlocked };
        });
        parsedState.achievements = rehydratedAchievements;
        
        if (!parsedState.tasks || parsedState.tasks.length === 0) {
          parsedState.tasks = initialTasks;
        }

        return parsedState;
      }
    } catch (error) {
      console.error("Failed to load game state from localStorage:", error);
    }
    
    // Fallback for different scenarios
    if (dateStr) return null; // If we request a specific day and it's not there, return null
    return getInitialGameState(); // Otherwise, return a fresh state
  }, []);

  useEffect(() => {
    if (isClient) {
      setGameState(getSavedState());
      setLoading(false);
    }
  }, [isClient, getSavedState]);

  useEffect(() => {
    if (loading || !gameState || !isClient) return;

    const processState = async () => {
      let state = { ...gameState };
      let hasChanges = false;
      const today = new Date();
      today.setHours(0, 0, 0, 0); 
      
      const todayDateString = today.toISOString().split('T')[0];
      
      const lastSummaryDateString = state.lastSummaryDate;

      if (todayDateString !== lastSummaryDateString) {
        const previousDayState = getSavedState(lastSummaryDateString) || getSavedState();
        
        const userXpAtStartOfDay = previousDayState.user?.xp ?? 0;
        const rivalsAtSummaryStart = previousDayState.rivals ?? getInitialGameState().rivals;

        const rivalsXpGainedData = state.rivals.map(rival => {
            const startRival = rivalsAtSummaryStart.find((r: Rival) => r.id === rival.id);
            return {
                rivalId: rival.name,
                xpGained: rival.xp - (startRival?.xp ?? 0),
                reason: "Your rival was busy training!"
            };
        }).filter(r => r.xpGained > 0);
        
        const userXpGained = state.user.xp - userXpAtStartOfDay;
        const totalRivalXP = rivalsXpGainedData.reduce((acc, r) => acc + r.xpGained, 0);
        const outcome = userXpGained > totalRivalXP ? 'win' : userXpGained < totalRivalXP ? 'loss' : 'tie';
        
        const lastPlayedDate = new Date(state.lastPlayed);
        lastPlayedDate.setHours(0,0,0,0);
        const diffDaysSinceLastPlay = Math.round((today.getTime() - lastPlayedDate.getTime()) / (1000 * 60 * 60 * 24));
        const newStreak = (userXpGained > 0 && diffDaysSinceLastPlay === 1) ? state.streak + 1 : (diffDaysSinceLastPlay > 1 ? 0 : state.streak);

        const summary: DailySummary = {
          date: lastSummaryDateString,
          userXpGained: userXpGained,
          rivalsXpGained: rivalsXpGainedData,
          outcome: outcome,
          streak: newStreak,
        };
        
        state = {
            ...getInitialGameState(),
            achievements: state.achievements,
            streak: newStreak, 
            lastSummaryDate: todayDateString,
            lastPlayed: todayDateString,
            user: { ...state.user, xp: state.user.xp },
            rivals: state.rivals.map(r => ({...r, xp: r.xp})),
        };
        
        setGameState(state);
        router.replace(`/summary?data=${encodeURIComponent(JSON.stringify(summary))}`);
        return; 
      }

      const lastPlayedDate = new Date(state.lastPlayed);
      lastPlayedDate.setHours(0, 0, 0, 0);

      const daysElapsed = Math.floor((today.getTime() - lastPlayedDate.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysElapsed > 0) {
        let newNotifications = [...state.notifications];

        const updatedRivals = state.rivals.map((rival: Rival) => {
            const xpGained = calculateOfflineRivalXP(rival, daysElapsed);
            if (xpGained > 0) {
                const oldLevel = getLevelFromXP(rival.xp);
                const newXp = rival.xp + xpGained;
                const newLevel = getLevelFromXP(newXp);
                
                if (newLevel > oldLevel) {
                    newNotifications.push({ id: `rival-levelup-${rival.id}-${Date.now()}`, message: `${rival.name} leveled up to Lvl ${newLevel} while you were away!`, timestamp: Date.now(), read: false });
                } else {
                    newNotifications.push({ id: `rival-xp-${rival.id}-${Date.now()}`, message: `${rival.name} gained ${xpGained.toFixed(0)} XP.`, timestamp: Date.now(), read: false });
                }
                return { ...rival, xp: newXp };
            }
            return rival;
        });

        state = { 
            ...state, 
            rivals: updatedRivals, 
            notifications: newNotifications,
            streak: daysElapsed > 1 ? 0 : state.streak, 
            lastPlayed: today.toISOString().split('T')[0]
        };
        hasChanges = true;
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
    }, 1000);

    return () => clearTimeout(timeoutId);

  }, [gameState, loading, isClient, router, getSavedState]);


  useEffect(() => {
    if (!loading && gameState && isClient) {
      const stateToSave = { ...gameState };
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
                user: { ...prev.user },
                rivals: prev.rivals.map(r => ({...r})), 
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
