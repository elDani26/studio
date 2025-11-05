'use client';

import { useEffect, useState } from 'react';
import type { Transaction } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { useSettings } from '@/context/settings-context';
import { useTranslations } from 'next-intl';

interface IncomeChartProps {
  transactions: Transaction[];
}

const COLORS = ['#22C55E', '#84CC16', '#FBBF24', '#10B981', '#3B82F6'];

export function IncomeChart({ transactions: initialTransactions }: IncomeChartProps) {
  const [chartData, setChartData] = useState<any[]>([]);
  const { currency, categories } = useSettings();
  const t = useTranslations('IncomeChart');

  useEffect(() => {
    const incomes = initialTransactions.filter(t => 
      t.type === 'income' && !t.transferId
    );
    
    const incomeByCategory = incomes.reduce((acc, transaction) => {
      const categoryId = transaction.category;
      if (!acc[categoryId]) {
        acc[categoryId] = 0;
      }
      acc[categoryId] += transaction.amount;
      return acc;
    }, {} as Record<string, number>);

    const data = Object.keys(incomeByCategory).map(categoryId => {
      const categoryInfo = categories.find(c => c.id === categoryId);
      return {
        name: categoryInfo?.name || categoryId,
        value: incomeByCategory[categoryId],
      };
    })
    .filter(item => item.value > 0)
    .sort((a, b) => b.value - a.value);

    setChartData(data);
  }, [initialTransactions, categories]);

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
