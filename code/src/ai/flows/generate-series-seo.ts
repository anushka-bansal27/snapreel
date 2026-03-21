'use server';
/**
 * @fileOverview This file defines a Genkit flow for generating SEO metadata for a series.
 *
 * - generateSeriesSeo - A function that generates SEO data.
 * - GenerateSeriesSeoInput - The input type.
 * - GenerateSeriesSeoOutput - The output type.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateSeriesSeoInputSchema = z.object({
  title: z.string().describe('The title of the drama series.'),
  description: z.string().describe('The full description of the series.'),
});
export type GenerateSeriesSeoInput = z.infer<typeof GenerateSeriesSeoInputSchema>;

const GenerateSeriesSeoOutputSchema = z.object({
  seoTitle: z.string().describe('A concise, compelling SEO-optimized title (max 60 characters).'),
  metaDescription: z.string().describe('A compelling meta description for search engine results (max 160 characters).'),
  metaKeywords: z.array(z.string()).describe('An array of 5-7 relevant keywords for SEO.'),
});
export type GenerateSeriesSeoOutput = z.infer<typeof GenerateSeriesSeoOutputSchema>;

export async function generateSeriesSeo(input: GenerateSeriesSeoInput): Promise<GenerateSeriesSeoOutput> {
  return generateSeriesSeoFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateSeriesSeoPrompt',
  input: {schema: GenerateSeriesSeoInputSchema},
  output: {schema: GenerateSeriesSeoOutputSchema},
  prompt: `You are an SEO expert specializing in the film and streaming industry.

For the drama series with the title "{{{title}}}" and description below, create the following SEO metadata:
1.  A concise, compelling SEO-optimized title (maximum 60 characters).
2.  An engaging meta description for search engine results (maximum 160 characters).
3.  A list of 5-7 relevant keywords.

Description:
{{{description}}}

Return the data as a single JSON object.`,
});

const generateSeriesSeoFlow = ai.defineFlow(
  {
    name: 'generateSeriesSeoFlow',
    inputSchema: GenerateSeriesSeoInputSchema,
    outputSchema: GenerateSeriesSeoOutputSchema,
  },
  async (input) => {
    const {output} = await prompt(input);
    return output!;
  }
);
