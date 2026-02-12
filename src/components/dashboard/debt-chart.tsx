'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { useSettings } from '@/context/settings-context';
import { useTranslations } from 'next-intl';

interface DebtChartProps {
  data: { name: string; value: number }[];
  type: 'pie' | 'bar';
}

const COLORS = ['#F97316', '#EA580C', '#D97706', '#FB923C', '#FDBA74'];

const CustomLegend = ({ payload }: any) => {
  if (!payload?.length) {
    return null;
  }
  return (
    <div className="h-full overflow-y-auto text-sm max-h-[180px] pr-2">
      <ul className="space-y-2">
        {payload.map((entry: any, index: number) => (
          <li key={`item-${index}`} className="flex items-center gap-2" title={entry.value}>
            <span
              className="h-2 w-2 shrink-0 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            <span className="flex-1 truncate">{entry.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
};

export function DebtChart({ data: chartData, type }: DebtChartProps) {
  const { currency } = useSettings();
  const t = useTranslations('DebtChart');

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const name = label || payload[0].name;
      const value = payload[0].value;
      return (
        <div className="p-2 text-sm bg-background border rounded-md shadow-lg">
          <p className="font-bold">{`${name} : ${new Intl.NumberFormat('es-ES', { style: 'currency', currency: currency }).format(value)}`}</p>
        </div>
      );
    }
    return null;
  };

  const renderChart = () => {
    switch (type) {
      case 'bar':
        return (
          <BarChart data={chartData} margin={{ top: 5, right: 20, left: -20, bottom: 50 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} angle={-45} textAnchor="end" />
            <YAxis tick={{ fontSize: 10 }} tickFormatter={(value) => new Intl.NumberFormat('en-US', { notation: "compact", compactDisplay: "short" }).format(value as number)} />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'hsl(var(--accent))' }} />
            <Bar dataKey="value" fill={COLORS[0]} radius={[4, 4, 0, 0]} />
          </BarChart>
        );
      case 'pie':
      default:
        return (
          <ResponsiveContainer width="100%" height={200}>
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
            </PieChart>
          </ResponsiveContainer>
        );
    }
  };

  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <CardTitle>{t('title')}</CardTitle>
        <CardDescription>{t('description')}</CardDescription>
      </CardHeader>
      <CardContent className="flex-grow flex flex-col justify-center">
        {chartData.length > 0 ? (
           <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center h-full">
            <div className="w-full h-full">
              {renderChart()}
            </div>
            <div className="w-full h-full flex justify-center items-center">
               <CustomLegend payload={chartData.map((entry, index) => ({
                value: entry.name,
                color: COLORS[index % COLORS.length]
              }))} />
            </div>
          </div>
        ) : (
            <div className="flex h-full w-full flex-col items-center justify-center">
                <p className="text-sm text-muted-foreground">{t('noData')}</p>
            </div>
        )}
      </CardContent>
    </Card>
  );
}
