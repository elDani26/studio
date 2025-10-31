'use server';

/**
 * @fileOverview Summarizes user transactions, providing insights into spending habits.
 *
 * - summarizeTransactions - A function that generates a summary of user transactions.
 * - SummarizeTransactionsInput - The input type for the summarizeTransactions function.
 * - SummarizeTransactionsOutput - The return type for the summarizeTransactions function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SummarizeTransactionsInputSchema = z.object({
  transactions: z.array(
    z.object({
      type: z.enum(['income', 'expense']),
      category: z.string(),
      description: z.string().optional(),
      date: z.string(),
      account: z.string().optional(),
      amount: z.number(),
    })
  ).describe('An array of transaction objects.'),
});
export type SummarizeTransactionsInput = z.infer<typeof SummarizeTransactionsInputSchema>;

const SummarizeTransactionsOutputSchema = z.object({
  summary: z.string().describe('A summary of the user transactions, including percentage of income allocated to each category.'),
});
export type SummarizeTransactionsOutput = z.infer<typeof SummarizeTransactionsOutputSchema>;

export async function summarizeTransactions(input: SummarizeTransactionsInput): Promise<SummarizeTransactionsOutput> {
  return summarizeTransactionsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'summarizeTransactionsPrompt',
  input: {schema: SummarizeTransactionsInputSchema},
  output: {schema: SummarizeTransactionsOutputSchema},
  prompt: `You are a personal finance expert. Please summarize the following transactions for the user, providing insights into their spending habits, including the percentage of income allocated to each category.

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
