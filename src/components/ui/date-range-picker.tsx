'use client';

import * as React from 'react';
import { format } from 'date-fns';
import { Calendar as CalendarIcon } from 'lucide-react';
import { type DateRange } from 'react-day-picker';
import { es } from 'date-fns/locale';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

type DatePickerWithRangeProps = React.HTMLAttributes<HTMLDivElement> & {
  onUpdate: (values: { range: DateRange }) => void;
  initialDateFrom?: Date;
  initialDateTo?: Date;
  align?: 'start' | 'center' | 'end';
  locale?: any;
};

export function DateRangePicker({
  className,
  onUpdate,
  initialDateFrom,
  initialDateTo,
  align = 'end',
  locale = es,
}: DatePickerWithRangeProps) {
  const [date, setDate] = React.useState<DateRange | undefined>({
    from: initialDateFrom,
    to: initialDateTo,
  });

  const handleUpdate = (range: DateRange | undefined) => {
    setDate(range);
    if (range) {
      onUpdate({ range });
    }
  };

  return (
    <div className={cn('grid gap-2', className)}>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant={'outline'}
            className={cn(
              'w-full md:w-[260px] justify-start text-left font-normal',
              !date && 'text-muted-foreground'
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {date?.from ? (
              date.to ? (
                <>
                  {format(date.from, 'dd/MM/yyyy', { locale })} -{' '}
                  {format(date.to, 'dd/MM/yyyy', { locale })}
                </>
              ) : (
                format(date.from, 'dd/MM/yyyy', { locale })
              )
            ) : (
              <span>Elige un rango de fechas</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align={align}>
          <Calendar
            initialFocus
            mode="range"
            defaultMonth={date?.from}
            selected={date}
            onSelect={handleUpdate}
            numberOfMonths={2}
            locale={locale}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
