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
  const transferCategory = categories.find(c => c.name.toLowerCase() === 'transfer' && c.type === 'expense');

  useEffect(() => {
    const expenses = initialTransactions.filter(t => 
      t.type === 'expense' && t.category !== transferCategory?.id
    );

    const expenseByCategory = expenses.reduce((acc, transaction) => {
      const categoryId = transaction.category;
      if (!acc[categoryId]) {
        acc[categoryId] = 0;
      }
      acc[categoryId] += transaction.amount;
      return acc;
    }, {} as Record<string, number>);


    const data = Object.keys(expenseByCategory).map(categoryId => {
      const categoryInfo = categories.find(c => c.id === categoryId);
      return {
        name: categoryInfo?.name || categoryId,
        value: expenseByCategory[categoryId],
      };
    })
    .filter(item => item.value > 0)
    .sort((a, b) => b.value - a.value);

    setChartData(data);
  }, [initialTransactions, categories, transferCategory]);

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
