'use server';

/**
 * @fileOverview This file defines a Genkit flow for generating personalized push notification messages.
 *
 * The flow takes user's streak and rival progress as input and generates a short, engaging notification message
 * to remind them to play the game. This is designed to increase user engagement.
 *
 * - generateNotificationText - A function that generates the notification text.
 * - NotificationTextInput - The input type for the generateNotificationText function.
 * - NotificationTextOutput - The return type for the generateNotificationText function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const NotificationTextInputSchema = z.object({
  streak: z.number().describe('The user\'s current daily streak.'),
  rivalName: z.string().describe('The name of the Pokemon rival.'),
  rivalXp: z.number().describe('The current XP of the rival.'),
  userXp: z.number().describe('The current XP of the user.'),
});
export type NotificationTextInput = z.infer<typeof NotificationTextInputSchema>;

const NotificationTextOutputSchema = z.object({
  notificationText: z.string().describe('The generated push notification message.'),
});
export type NotificationTextOutput = z.infer<typeof NotificationTextOutputSchema>;

export async function generateNotificationText(
  input: NotificationTextInput
): Promise<NotificationTextOutput> {
  return notificationTextFlow(input);
}

const notificationTextPrompt = ai.definePrompt({
  name: 'notificationTextPrompt',
  input: {schema: NotificationTextInputSchema},
  output: {schema: NotificationTextOutputSchema},
  prompt: `You are an AI assistant designed to generate engaging push notification messages for a game called PokeQuest.

  The goal is to remind users to play the game and to increase engagement.

  Consider the user\'s current streak and their rival\'s progress when generating the message.

  The message should be short and personalized.

  Here\'s the user\'s information:
  - Streak: {{{streak}}} days
  - Rival Name: {{{rivalName}}}
  - Rival XP: {{{rivalXp}}}
  - Your XP: {{{userXp}}}

  Generate a single, compelling push notification message. Aim for less than 50 characters.
  DO NOT output anything other than the message, and it should be in a short, colloquial, and natural sounding tone.  For example: \"Your rival is catching up!\" or \"Keep your streak alive!\"
  `,
});

const notificationTextFlow = ai.defineFlow(
  {
    name: 'notificationTextFlow',
    inputSchema: NotificationTextInputSchema,
    outputSchema: NotificationTextOutputSchema,
  },
  async input => {
    const {output} = await notificationTextPrompt(input);
    return output!;
  }
);
