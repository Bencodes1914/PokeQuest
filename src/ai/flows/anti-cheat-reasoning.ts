'use server';

/**
 * @fileOverview An anti-cheat reasoning AI agent.
 *
 * - antiCheatReasoning - A function that provides human-readable reasoning for banning a user completion due to suspected cheating.
 * - AntiCheatReasoningInput - The input type for the antiCheatReasoning function.
 * - AntiCheatReasoningOutput - The return type for the antiCheatReasoning function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AntiCheatReasoningInputSchema = z.object({
  userActions: z
    .string()
    .describe('A description of the user actions that triggered the anti-cheat system.'),
  securityChecksPassed: z
    .boolean()
    .describe('Whether the user passed the security checks'),
});
export type AntiCheatReasoningInput = z.infer<typeof AntiCheatReasoningInputSchema>;

const AntiCheatReasoningOutputSchema = z.object({
  justification: z.string().describe('A human-readable justification for the ban.'),
});
export type AntiCheatReasoningOutput = z.infer<typeof AntiCheatReasoningOutputSchema>;

export async function antiCheatReasoning(input: AntiCheatReasoningInput): Promise<AntiCheatReasoningOutput> {
  return antiCheatReasoningFlow(input);
}

const prompt = ai.definePrompt({
  name: 'antiCheatReasoningPrompt',
  input: {schema: AntiCheatReasoningInputSchema},
  output: {schema: AntiCheatReasoningOutputSchema},
  prompt: `You are an expert in detecting cheating in mobile games. You are provided with a description of user actions and whether the user has passed security checks. If the user did not pass security checks, they may be cheating. Provide a detailed, human-readable justification for why the user completion should be banned, explaining the suspicious behavior. If the security checks passed, state that the user passed the checks and the actions are likely legitimate.\n\nUser Actions: {{{userActions}}}\nSecurity Checks Passed: {{{securityChecksPassed}}}`,
});

const antiCheatReasoningFlow = ai.defineFlow(
  {
    name: 'antiCheatReasoningFlow',
    inputSchema: AntiCheatReasoningInputSchema,
    outputSchema: AntiCheatReasoningOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
