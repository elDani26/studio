'use client';

import { useState } from 'react';
import type { Transaction } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { summarizeTransactions, type SummarizeTransactionsInput } from '@/ai/flows/summarize-transactions';
import { Loader2, Wand2 } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useSettings } from '@/context/settings-context';
import { useTranslations } from 'next-intl';

interface AiSummaryProps {
  transactions: Transaction[];
}

export function AiSummary({ transactions: initialTransactions }: AiSummaryProps) {
  const [summary, setSummary] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { categories, accounts } = useSettings();
  const t = useTranslations('AiSummary');
  const tMisc = useTranslations('misc');

  const handleGenerateSummary = async () => {
    if (initialTransactions.length === 0) {
      setError(t('noTransactions'));
      return;
    }
    setLoading(true);
    setError('');
    setSummary('');

    try {
      // Create maps for quick lookups
      const categoryMap = new Map(categories.map(c => [c.id, c.name]));
      const accountMap = new Map(accounts.map(a => [a.id, a.name]));

      const serializableTransactions = initialTransactions.map(t => {
        let date;
        if (t.date && typeof (t.date as any).toDate === 'function') {
          date = (t.date as any).toDate().toISOString().split('T')[0];
        } else {
          date = new Date(t.date as any).toISOString().split('T')[0];
        }

        return {
          type: t.type,
          category: categoryMap.get(t.category) || tMisc('unknownCategory'),
          description: t.description,
          date,
          account: accountMap.get(t.account) || tMisc('unknownAccount'),
          amount: t.amount,
        };
      }) as SummarizeTransactionsInput['transactions'];

      const result = await summarizeTransactions({ transactions: serializableTransactions });
      setSummary(result.summary);
    } catch (e) {
      setError(t('error'));
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="flex flex-col h-full">
      <CardHeader>
        <CardTitle>{t('title')}</CardTitle>
        <CardDescription>
          {t('description')}
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
                <h3 className="text-lg font-semibold">{t('placeholderTitle')}</h3>
                <p className="text-sm text-muted-foreground">{t('placeholderDescription')}</p>
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
              {t('generatingButton')}
            </>
          ) : (
            <>
              <Wand2 className="mr-2 h-4 w-4" />
              {t('generateButton')}
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}
