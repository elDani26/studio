'use client';

import * as React from 'react';
import { format } from 'date-fns';
import { Calendar as CalendarIcon, X } from 'lucide-react';
import { type DateRange } from 'react-day-picker';
import { useTranslations } from 'next-intl';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

type DatePickerWithRangeProps = React.HTMLAttributes<HTMLDivElement> & {
  onUpdate: (values: { range: DateRange | undefined }) => void;
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
  locale,
}: DatePickerWithRangeProps) {
  const [date, setDate] = React.useState<DateRange | undefined>({
    from: initialDateFrom,
    to: initialDateTo,
  });
  const [open, setOpen] = React.useState(false);
  const t = useTranslations('TransactionDataTable.datePicker');


  const handleUpdate = (range: DateRange | undefined) => {
    setDate(range);
    onUpdate({ range });
  };

  const handleSelect = (range: DateRange | undefined) => {
    handleUpdate(range);
    if (range?.from && range?.to) {
        setOpen(false);
    } else if (range?.from && !range.to) {
        // This keeps it open for range selection
    } else {
        setOpen(false);
    }
  }

  const handleSingleSelect = (day: Date | undefined) => {
    if (day) {
      handleUpdate({ from: day, to: day });
      setOpen(false);
    }
  }
  
  const handleClear = () => {
    handleUpdate(undefined);
    setOpen(false);
  }

  return (
    <div className={cn('grid gap-2', className)}>
      <Popover open={open} onOpenChange={setOpen}>
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
              date.to && date.from !== date.to ? (
                <>
                  {format(date.from, 'LLL dd, y', { locale })} -{' '}
                  {format(date.to, 'LLL dd, y', { locale })}
                </>
              ) : (
                format(date.from, 'LLL dd, y', { locale })
              )
            ) : (
              <span>{t('placeholder')}</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align={align}>
          <Tabs defaultValue="range">
            <TabsList className="grid w-full grid-cols-2 rounded-none">
              <TabsTrigger value="single">{t('singleTab')}</TabsTrigger>
              <TabsTrigger value="range">{t('rangeTab')}</TabsTrigger>
            </TabsList>
            <TabsContent value="single">
              <Calendar
                initialFocus
                mode="single"
                selected={date?.from}
                onSelect={handleSingleSelect}
                locale={locale}
                />
            </TabsContent>
            <TabsContent value="range">
                <Calendar
                    initialFocus
                    mode="range"
                    defaultMonth={date?.from}
                    selected={date}
                    onSelect={handleSelect}
                    numberOfMonths={2}
                    locale={locale}
                />
            </TabsContent>
          </Tabs>
          <div className="p-2 border-t">
              <Button onClick={handleClear} variant="ghost" className="w-full justify-center">{t('clearButton')}</Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}