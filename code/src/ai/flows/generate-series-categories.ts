'use server';
/**
 * @fileOverview This file defines a Genkit flow for generating drama series categories.
 *
 * - generateSeriesCategories - A function that suggests categories based on title and description.
 * - GenerateSeriesCategoriesInput - The input type.
 * - GenerateSeriesCategoriesOutput - The output type.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateSeriesCategoriesInputSchema = z.object({
  title: z.string().describe('The title of the drama series.'),
  description: z.string().describe('The description of the drama series.'),
});
export type GenerateSeriesCategoriesInput = z.infer<typeof GenerateSeriesCategoriesInputSchema>;

const GenerateSeriesCategoriesOutputSchema = z.object({
  categories: z.array(z.string()).describe('An array of up to 5 relevant genres/categories for the series.'),
  tags: z.array(z.string()).describe('An array of 5-10 relevant keywords/tags for the series (e.g., "contract marriage", "CEO", "revenge").')
});
export type GenerateSeriesCategoriesOutput = z.infer<typeof GenerateSeriesCategoriesOutputSchema>;

export async function generateSeriesCategories(input: GenerateSeriesCategoriesInput): Promise<GenerateSeriesCategoriesOutput> {
  return generateSeriesCategoriesFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateSeriesCategoriesPrompt',
  input: {schema: GenerateSeriesCategoriesInputSchema},
  output: {schema: GenerateSeriesCategoriesOutputSchema},
  prompt: `You are a film and television expert who is skilled at categorizing content.
Based on the title and description provided, suggest:
1. Up to 5 relevant genres or categories for the series.
2. A list of 5-10 specific keywords or tags that describe the plot, themes, or tropes (e.g., "contract marriage", "amnesia", "revenge", "CEO").

Title: "{{{title}}}"
Description: {{{description}}}

Return a JSON object with a 'categories' array and a 'tags' array.`,
});

const generateSeriesCategoriesFlow = ai.defineFlow(
  {
    name: 'generateSeriesCategoriesFlow',
    inputSchema: GenerateSeriesCategoriesInputSchema,
    outputSchema: GenerateSeriesCategoriesOutputSchema,
  },
  async (input) => {
    const {output} = await prompt(input);
    return output!;
  }
);
