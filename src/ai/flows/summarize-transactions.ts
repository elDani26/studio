'use server';

/**
 * @fileOverview Provides financial advice based on user transactions.
 *
 * - summarizeTransactions - A function that generates financial advice based on user transactions.
 * - SummarizeTransactionsInput - The input type for the summarizeTransactions function.
 * - SummarizeTransactionsOutput - The return type for the summarizeTransactions function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SummarizeTransactionsInputSchema = z.object({
  locale: z.string().describe('The locale to use for the response language (e.g., "en", "es", "fr").'),
  transactions: z.array(
    z.object({
      type: z.enum(['income', 'expense']),
      category: z.string().describe('The name of the category (e.g., "Alimentación", "Salario").'),
      description: z.string().optional(),
      date: z.string(),
      account: z.string().optional().describe('The name of the source account (e.g., "Cuenta de Banco", "Efectivo").'),
      amount: z.number(),
    })
  ).describe('An array of transaction objects.'),
});
export type SummarizeTransactionsInput = z.infer<typeof SummarizeTransactionsInputSchema>;

const SummarizeTransactionsOutputSchema = z.object({
  summary: z.string().describe('Actionable financial advice and tips based on the user\'s transaction history.'),
});
export type SummarizeTransactionsOutput = z.infer<typeof SummarizeTransactionsOutputSchema>;

export async function summarizeTransactions(input: SummarizeTransactionsInput): Promise<SummarizeTransactionsOutput> {
  return summarizeTransactionsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'summarizeTransactionsPrompt',
  input: {schema: SummarizeTransactionsInputSchema},
  output: {schema: SummarizeTransactionsOutputSchema},
  prompt: `You are a proactive and insightful personal finance advisor. Your goal is to help the user improve their financial health. Analyze the following transactions and provide actionable advice, tips, and identify areas for improvement. Go beyond a simple summary. Highlight spending patterns, suggest savings opportunities, and offer encouragement. The response must be in the language corresponding to this locale: {{locale}}.

Transactions:
{{#each transactions}}
- Type: {{type}}, Category: {{category}}, Amount: {{amount}}, Date: {{date}}{{#if description}}, Description: {{description}}{{/if}}{{#if account}}, Account: {{account}}{{/if}}
{{/each}}`,
});

const summarizeTransactionsFlow = ai.defineFlow(
  {
    name: 'summarizeTransactionsFlow',
    inputSchema: SummarizeTransactionsInputSchema,
    outputSchema: SummarizeTransactionsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
