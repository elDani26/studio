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
  prompt: `Eres un asesor financiero profesional especializado en educación financiera personal. 
Tu tarea es analizar los datos del usuario (ingresos, egresos, balance actual, categorías, fechas y transferencias) 
y generar consejos personalizados para mejorar sus hábitos financieros. 

⚙️ Instrucciones:
- No hagas resúmenes de los datos.
- No repitas la información que ya tiene el usuario.
- Enfócate solo en ofrecer recomendaciones o tips prácticos y realistas.
- Usa un tono profesional pero cercano, como el de un asesor que orienta con claridad.
- Sé breve: máximo 3 consejos o ideas por respuesta.
- Usa frases cortas, claras y accionables (por ejemplo: “Reduce tus gastos en entretenimiento al 10% del ingreso mensual.”).
- Si detectas comportamientos financieros saludables, felicítalos y refuerza el buen hábito.
- Si detectas desbalance o gastos altos, da una sugerencia concreta para mejorarlo.

Transactions:
{{#each transactions}}
- Type: {{type}}, Category: {{category}}, Amount: {{amount}}, Date: {{date}}{{#if description}}, Description: {{description}}{{/if}}{{#if account}}, Account: {{account}}{{/if}}
{{/each}}

The response must be in the language corresponding to this locale: {{locale}}.`,
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
