'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Calculator, Grip, X } from 'lucide-react';
import { useTranslations, useLocale } from 'next-intl';

const buttonClasses = {
  number: "bg-gray-100 hover:bg-gray-200 text-gray-800 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700",
  operator: "bg-blue-500 hover:bg-blue-600 text-white",
  clear: "bg-red-500 hover:bg-red-600 text-white",
  delete: "bg-orange-500 hover:bg-orange-600 text-white",
  equal: "bg-green-500 hover:bg-green-600 text-white row-span-2",
};

export function CalculatorDialog() {
  const [expression, setExpression] = useState('');
  const [result, setResult] = useState<string | null>(null);
  const t = useTranslations('CalculatorDialog');
  const displayRef = useRef<HTMLDivElement>(null);
  const locale = useLocale();

  const formatNumber = (numStr: string) => {
    const number = parseFloat(numStr);
    if (isNaN(number)) return numStr;
    return new Intl.NumberFormat(locale, { maximumFractionDigits: 10 }).format(number);
  };
  
  const handleInput = (value: string) => {
    setResult(null);
    setExpression(prev => {
        if (['+', '-', '*', '/'].includes(value)) {
            if (prev === '' || ['+', '-', '*', '/'].includes(prev.slice(-1))) {
                return prev;
            }
        }
        if (value === '.') {
            const parts = prev.split(/[\+\-\*\/]/);
            if (parts[parts.length - 1].includes('.')) {
                return prev;
            }
        }
        return prev + value;
    });
  };

  const calculateResult = () => {
    if (expression === '' || ['+', '-', '*', '/'].includes(expression.slice(-1))) {
      return;
    }
    try {
      // eslint-disable-next-line no-eval
      const evalResult = eval(expression);
      if (isNaN(evalResult) || !isFinite(evalResult)) {
        setResult('Error');
      } else {
        setResult(formatNumber(String(evalResult)));
        setExpression(String(evalResult));
      }
    } catch (error) {
      setResult('Error');
      setExpression('');
    }
  };

  const clearAll = () => {
    setExpression('');
    setResult(null);
  };

  const deleteLast = () => {
    if (result !== null) {
      clearAll();
    } else {
      setExpression(prev => prev.slice(0, -1));
    }
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const { key } = event;
      if (key >= '0' && key <= '9' || key === '.') {
        handleInput(key);
      } else if (['+', '-', '*', '/'].includes(key)) {
        handleInput(key);
      } else if (key === 'Enter' || key === '=') {
        event.preventDefault();
        calculateResult();
      } else if (key === 'Backspace') {
        deleteLast();
      } else if (key === 'Escape' || key === 'Delete') {
        clearAll();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (displayRef.current) {
        displayRef.current.scrollLeft = displayRef.current.scrollWidth;
    }
  }, [expression, result]);

  const displayValue = result ?? expression || '0';
  const formattedDisplay = displayValue.split(/([\+\-\*\/])/).map(part => {
      if (['+', '-', '*', '/'].includes(part)) {
          return ` ${part} `;
      }
      return formatNumber(part);
  }).join('');
  
  const buttons = [
    { label: 'C', action: clearAll, style: buttonClasses.clear },
    { label: '⌫', action: deleteLast, style: buttonClasses.delete },
    { label: '÷', action: () => handleInput('/'), style: buttonClasses.operator },
    { label: '×', action: () => handleInput('*'), style: buttonClasses.operator },
    { label: '7', action: () => handleInput('7'), style: buttonClasses.number },
    { label: '8', action: () => handleInput('8'), style: buttonClasses.number },
    { label: '9', action: () => handleInput('9'), style: buttonClasses.number },
    { label: '−', action: () => handleInput('-'), style: buttonClasses.operator },
    { label: '4', action: () => handleInput('4'), style: buttonClasses.number },
    { label: '5', action: () => handleInput('5'), style: buttonClasses.number },
    { label: '6', action: () => handleInput('6'), style: buttonClasses.number },
    { label: '+', action: () => handleInput('+'), style: buttonClasses.operator },
    { label: '1', action: () => handleInput('1'), style: buttonClasses.number },
    { label: '2', action: () => handleInput('2'), style: buttonClasses.number },
    { label: '3', action: () => handleInput('3'), style: buttonClasses.number },
    { label: '=', action: calculateResult, style: buttonClasses.equal },
    { label: '0', action: () => handleInput('0'), style: buttonClasses.number, className: "col-span-2" },
    { label: '.', action: () => handleInput('.'), style: buttonClasses.number },
  ];

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon">
          <Calculator className="h-5 w-5" />
          <span className="sr-only">{t('calculatorTitle')}</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-xs w-full p-4 border-0 shadow-lg bg-card rounded-3xl flex flex-col">
        <DialogHeader className="sr-only">
           <DialogTitle>{t('calculatorTitle')}</DialogTitle>
        </DialogHeader>
        <div className="flex-1 flex flex-col justify-end text-right overflow-hidden h-32">
          <div ref={displayRef} className="overflow-x-auto whitespace-nowrap scrollbar-hide text-right pb-2 text-4xl font-light pr-4">
            {formattedDisplay}
          </div>
        </div>
        <div className="grid grid-cols-4 grid-rows-5 gap-2">
          {buttons.map((btn) => (
            <Button
              key={btn.label}
              onClick={btn.action}
              className={`h-auto aspect-square text-2xl rounded-2xl transition-transform duration-100 ease-in-out active:scale-95 ${btn.style} ${btn.className || ''}`}
            >
              {btn.label}
            </Button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
