'use server';

/**
 * @fileOverview Generates a character-specific reason for a rival's XP gain.
 *
 * - rivalXPReasoning - A function that generates the reasoning for rival XP gain.
 * - RivalXPReasoningInput - The input type for the rivalXPReasoning function.
 * - RivalXPReasoningOutput - The return type for the rivalXPReasoning function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const RivalXPReasoningInputSchema = z.object({
  rivalName: z.string().describe('The name of the rival character.'),
  rivalBehavior: z.string().describe('The behavior type of the rival (Lazy, Focused, Hardcore, or Chaotic).'),
  xpGained: z.number().describe('The amount of XP gained by the rival.'),
});
export type RivalXPReasoningInput = z.infer<typeof RivalXPReasoningInputSchema>;

const RivalXPReasoningOutputSchema = z.object({
  reason: z.string().describe('A short, amusing, and character-specific reason for the rival gaining XP.'),
});
export type RivalXPReasoningOutput = z.infer<typeof RivalXPReasoningOutputSchema>;

export async function rivalXPReasoning(input: RivalXPReasoningInput): Promise<RivalXPReasoningOutput> {
  return rivalXPReasoningFlow(input);
}

const prompt = ai.definePrompt({
  name: 'rivalXPReasoningPrompt',
  input: {schema: RivalXPReasoningInputSchema},
  output: {schema: RivalXPReasoningOutputSchema},
  prompt: `You are tasked with generating a short, amusing reason for why a Pokémon rival character gained experience points (XP) in their quest. The rival has gained {{xpGained}} XP and has the following characteristics:\n\nRival Name: {{{rivalName}}}\nRival Behavior: {{{rivalBehavior}}}\n\nGiven the rival's name and behavior, create a one-sentence, humorous explanation for how they managed to gain XP today. The reason should align with their established personality. Make it very brief.\n\nReason: `,
});

const rivalXPReasoningFlow = ai.defineFlow(
  {
    name: 'rivalXPReasoningFlow',
    inputSchema: RivalXPReasoningInputSchema,
    outputSchema: RivalXPReasoningOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
