'use client';

import { useEffect, useState } from 'react';
import type { Transaction } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { useSettings } from '@/context/settings-context';
import { useTranslations } from 'next-intl';

interface ExpenseChartProps {
  transactions: Transaction[];
}

const COLORS = ['#3B82F6', '#F59E0B', '#10B981', '#EF4444', '#8B5CF6', '#F472B6', '#6B7280', '#EC4899', '#D946EF', '#818CF8'];

export function ExpenseChart({ transactions: initialTransactions }: ExpenseChartProps) {
  const [chartData, setChartData] = useState<any[]>([]);
  const { currency, categories } = useSettings();
  const t = useTranslations('ExpenseChart');
  const tMisc = useTranslations('misc');

  useEffect(() => {
    // Gastos de débito (excluyendo transferencias y pagos de TC)
    const debitExpenses = initialTransactions.filter(t => 
      t.type === 'expense' && !t.transferId && !t.isCreditCardExpense && !t.paymentFor
    );

    // Gastos realizados con tarjeta de crédito
    const creditCardExpensesTotal = initialTransactions
      .filter(t => t.isCreditCardExpense)
      .reduce((sum, t) => sum + t.amount, 0);

    const expenseByCategory = debitExpenses.reduce((acc, transaction) => {
      const categoryId = transaction.category;
      if (!acc[categoryId]) {
        acc[categoryId] = 0;
      }
      acc[categoryId] += transaction.amount;
      return acc;
    }, {} as Record<string, number>);

    // Convertir las categorías de débito a formato de gráfico
    const data = Object.keys(expenseByCategory).map(categoryId => {
      const categoryInfo = categories.find(c => c.id === categoryId);
      return {
        name: categoryInfo?.name || categoryId,
        value: expenseByCategory[categoryId],
      };
    });

    // Añadir el total de gastos de tarjeta de crédito como una categoría separada
    if (creditCardExpensesTotal > 0) {
      data.push({
        name: tMisc('creditCardExpense'),
        value: creditCardExpensesTotal
      });
    }

    const finalData = data
      .filter(item => item.value > 0)
      .sort((a, b) => b.value - a.value);

    setChartData(finalData);
  }, [initialTransactions, categories, tMisc]);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="p-2 text-sm bg-background border rounded-md shadow-lg">
          <p className="font-bold">{`${payload[0].name} : ${new Intl.NumberFormat('es-ES', { style: 'currency', currency: currency }).format(payload[0].value)}`}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>{t('title')}</CardTitle>
        <CardDescription>{t('description')}</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={200}>
          {chartData.length > 0 ? (
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                labelLine={false}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
                stroke="hsl(var(--background))"
                strokeWidth={2}
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend iconSize={10} layout="vertical" verticalAlign="middle" align="right" />
            </PieChart>
          ) : (
             <div className="flex h-full w-full flex-col items-center justify-center">
                <p className="text-sm text-muted-foreground">{t('noData')}</p>
            </div>
          )}
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
