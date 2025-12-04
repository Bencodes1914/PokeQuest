'use server';

import { rivalXPReasoning } from '@/ai/flows/rival-xp-reasoning';
import { generateNotificationText } from '@/ai/flows/notification-text-generation';
import type { RivalBehavior } from '@/lib/types';

export async function getRivalXPReasoning(
  rivalName: string,
  rivalBehavior: RivalBehavior,
  xpGained: number
) {
  return await rivalXPReasoning({ rivalName, rivalBehavior, xpGained });
}

export async function getNotificationText(
    streak: number,
    rivalName: string,
    rivalXp: number,
    userXp: number,
) {
    return await generateNotificationText({ streak, rivalName, rivalXp, userXp });
}
