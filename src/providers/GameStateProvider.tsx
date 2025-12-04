
"use client";

import React, { createContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { getInitialGameState, initialAchievements } from '@/lib/data';
import { getLevelFromXP, calculateOfflineRivalXP, checkAchievements } from '@/lib/game-logic';
import type { GameState, Rival, DailySummary, RivalBehavior, Achievement } from '@/lib/types';
import { useIsClient } from '@/hooks/use-is-client';
import { getRivalXPReasoning, getNotificationText } from '@/lib/actions';
import { getFirestore, doc, getDoc, setDoc, onSnapshot } from "firebase/firestore";
import { app } from '../firebase/config';

const db = getFirestore(app);
const GAME_STATE_DOC_ID = "globalGameState";

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
  const [lastSavedState, setLastSavedState] = useState<string | null>(null);


  const saveGameState = useCallback(async (state: GameState | null) => {
    if (!state || !isClient) return;
    try {
        const stateToSave = { ...state };
        // Functions can't be stored in Firestore, so we remove them.
        // They will be rehydrated on load.
        stateToSave.achievements = state.achievements.map(({ check, ...ach }) => ach) as any;

        const currentStateJson = JSON.stringify(stateToSave);

        // Debounce saving to avoid rapid writes
        if(currentStateJson === lastSavedState) return;

        await setDoc(doc(db, "gameState", GAME_STATE_DOC_ID), stateToSave);
        setLastSavedState(currentStateJson);
    } catch (error) {
      console.error("Failed to save game state to Firestore:", error);
    }
  }, [isClient, lastSavedState]);


  // Load state from Firestore on initial mount
  useEffect(() => {
    if (isClient) {
      const docRef = doc(db, "gameState", GAME_STATE_DOC_ID);
      
      const unsubscribe = onSnapshot(docRef, (docSnap) => {
        if (docSnap.exists()) {
          const savedState = docSnap.data() as GameState;
          const rehydratedAchievements = initialAchievements.map(initialAch => {
            const savedAch = savedState.achievements.find((a: any) => a.id === initialAch.id);
            return { ...initialAch, unlocked: savedAch ? savedAch.unlocked : initialAch.unlocked };
          });
          savedState.achievements = rehydratedAchievements;
          setGameState(savedState);
        } else {
          console.log("No game state found in Firestore, initializing.");
          const initialState = getInitialGameState();
          setGameState(initialState);
          saveGameState(initialState); // Save initial state to Firestore
        }
        setLoading(false);
      }, (error) => {
        console.error("Failed to load game state from Firestore:", error);
        setGameState(getInitialGameState());
        setLoading(false);
      });

      return () => unsubscribe(); // Cleanup snapshot listener on unmount
    }
  }, [isClient, saveGameState]);

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
        const docRef = doc(db, "gameState", GAME_STATE_DOC_ID);
        const previousDayDoc = await getDoc(docRef);

        if (previousDayDoc.exists()) {
            const previousDayState = previousDayDoc.data() as GameState;
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


  // Save state to Firestore whenever it changes
  useEffect(() => {
    if (!loading && gameState) {
      saveGameState(gameState);
    }
  }, [gameState, loading, saveGameState]);

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
