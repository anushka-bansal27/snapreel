'use server';
/**
 * @fileOverview A Genkit flow for translating UI text strings.
 *
 * - translateUiKeys - A function that translates all UI keys to a target language.
 * - TranslateUiInput - The input type.
 * - TranslateUiOutput - The output type.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { translationKeys } from '@/lib/translation-keys';

const TranslateUiInputSchema = z.object({
  languageName: z.string().describe('The full name of the target language to translate to (e.g., "French", "Spanish").'),
});
export type TranslateUiInput = z.infer<typeof TranslateUiInputSchema>;

// The output is a simple key-value map of the translated strings.
const TranslateUiOutputSchema = z.record(z.string());
export type TranslateUiOutput = z.infer<typeof TranslateUiOutputSchema>;


export async function translateUiKeys(input: TranslateUiInput): Promise<TranslateUiOutput> {
  return translateUiKeysFlow(input);
}

// Prepare the default English translations once
const defaultTranslations = translationKeys.reduce((acc, item) => {
    acc[item.key] = item.default;
    return acc;
}, {} as Record<string, string>);
const englishJson = JSON.stringify(defaultTranslations, null, 2);

const prompt = ai.definePrompt({
  name: 'translateUiPrompt',
  input: { schema: z.object({ languageName: z.string(), englishJson: z.string() }) },
  output: {
    schema: TranslateUiOutputSchema,
    format: 'json',
  },
  prompt: `You are an expert localizer and translator. Your task is to translate a JSON object of UI text strings from English into a target language.

Translate the following JSON object into {{{languageName}}}.

IMPORTANT:
- Respond with ONLY the raw, translated JSON object.
- Do not wrap the JSON in markdown backticks or any other text.
- Ensure all original keys are present in the translated output.
- Ensure the translation is natural and culturally appropriate for a user interface.

English JSON to translate:
{{{englishJson}}}
`,
});

const translateUiKeysFlow = ai.defineFlow(
  {
    name: 'translateUiKeysFlow',
    inputSchema: TranslateUiInputSchema,
    outputSchema: TranslateUiOutputSchema,
  },
  async (input) => {
    const {output} = await prompt({
        languageName: input.languageName,
        englishJson,
    });
    return output!;
  }
);
