'use client';

import type { Transaction } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { useSettings } from '@/context/settings-context';
import { useTranslations } from 'next-intl';

interface DebtChartProps {
  data: { name: string; value: number }[];
}

const COLORS = ['#F97316', '#EA580C', '#D97706', '#FB923C', '#FDBA74'];

export function DebtChart({ data: chartData }: DebtChartProps) {
  const { currency } = useSettings();
  const t = useTranslations('DebtChart');

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

  const legendFormatter = (value: string) => {
    if (value.length > 15) {
      return `${value.substring(0, 15)}...`;
    }
    return value;
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
              <Legend iconSize={10} layout="vertical" verticalAlign="middle" align="right" formatter={legendFormatter} />
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
