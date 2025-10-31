'use client';

import { useState } from 'react';
import type { Transaction } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { summarizeTransactions, type SummarizeTransactionsInput } from '@/ai/flows/summarize-transactions';
import { Loader2, Wand2 } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface AiSummaryProps {
  transactions: Transaction[];
}

export function AiSummary({ transactions: initialTransactions }: AiSummaryProps) {
  const [summary, setSummary] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleGenerateSummary = async () => {
    if (initialTransactions.length === 0) {
      setError('No hay transacciones disponibles para resumir.');
      return;
    }
    setLoading(true);
    setError('');
    setSummary('');

    try {
      const serializableTransactions = initialTransactions.map(t => {
        let date;
        if (t.date && typeof (t.date as any).toDate === 'function') {
          date = (t.date as any).toDate().toISOString().split('T')[0];
        } else {
          date = new Date(t.date as any).toISOString().split('T')[0];
        }
        return {
          ...t,
          date,
        };
      }) as SummarizeTransactionsInput['transactions'];

      const result = await summarizeTransactions({ transactions: serializableTransactions });
      setSummary(result.summary);
    } catch (e) {
      setError('No se pudo generar el resumen. Por favor, inténtalo de nuevo.');
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="flex flex-col h-full">
      <CardHeader>
        <CardTitle>Resumen con IA</CardTitle>
        <CardDescription>
          Obtén información instantánea sobre tus hábitos de gasto.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-grow">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : summary ? (
          <div className="text-sm text-foreground whitespace-pre-wrap font-light bg-muted p-4 rounded-md h-full overflow-y-auto max-h-56">
            {summary}
          </div>
        ) : (
           <div className="flex flex-col items-center justify-center h-full text-center p-4 rounded-lg border-2 border-dashed border-border">
                <Wand2 className="h-10 w-10 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold">Genera tu Informe Financiero</h3>
                <p className="text-sm text-muted-foreground">Haz clic en el botón de abajo para obtener un resumen de tus transacciones con IA.</p>
           </div>
        )}
        {error && (
            <Alert variant="destructive" className="mt-4">
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
            </Alert>
        )}
      </CardContent>
      <CardFooter>
        <Button onClick={handleGenerateSummary} disabled={loading || initialTransactions.length === 0} className="w-full">
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Generando...
            </>
          ) : (
            <>
              <Wand2 className="mr-2 h-4 w-4" />
              Generar Resumen
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}
