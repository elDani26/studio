'use client';

import { useEffect, useState } from 'react';
import type { Transaction } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from 'recharts';
import { TRANSACTION_CATEGORIES } from '@/lib/constants';

interface ExpenseChartProps {
  transactions: Transaction[];
}

export function ExpenseChart({ transactions: initialTransactions }: ExpenseChartProps) {
  const [chartData, setChartData] = useState<any[]>([]);

  useEffect(() => {
    const expenses = initialTransactions.filter(t => t.type === 'expense');
    const data = TRANSACTION_CATEGORIES
      .filter(cat => cat.value !== 'salary' && cat.value !== 'income')
      .map(category => {
        const total = expenses
          .filter(expense => expense.category === category.value)
          .reduce((acc, curr) => acc + curr.amount, 0);
        return { name: category.label, total };
      })
      .filter(item => item.total > 0)
      .sort((a, b) => b.total - a.total);

    setChartData(data);
  }, [initialTransactions]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Top Expenses</CardTitle>
        <CardDescription>A look at your spending by category.</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          {chartData.length > 0 ? (
            <BarChart data={chartData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
              <XAxis
                dataKey="name"
                stroke="#888888"
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                stroke="#888888"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => `$${value}`}
              />
              <Tooltip
                cursor={{ fill: 'hsla(var(--accent) / 0.3)' }}
                contentStyle={{
                    background: 'hsl(var(--background))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: 'var(--radius)',
                }}
              />
              <Bar dataKey="total" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            </BarChart>
          ) : (
             <div className="flex h-full w-full flex-col items-center justify-center">
                <p className="text-muted-foreground">No expense data to display.</p>
                <p className="text-sm text-muted-foreground">Add some expenses to get started.</p>
            </div>
          )}
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
