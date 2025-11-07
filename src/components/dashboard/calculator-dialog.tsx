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
import { Calculator } from 'lucide-react';
import { useTranslations, useLocale } from 'next-intl';

const buttonClasses = {
  number: "bg-[#f8f9fa] hover:bg-gray-200 text-[#2c3e50] shadow-sm",
  operator: "bg-gradient-to-br from-[#3498db] to-[#2980b9] text-white",
  clear: "bg-gradient-to-br from-[#e74c3c] to-[#c0392b] text-white",
  delete: "bg-gradient-to-br from-[#f39c12] to-[#e67e22] text-white",
  equal: "bg-gradient-to-br from-[#27ae60] to-[#229954] text-white row-span-2",
};

export function CalculatorDialog() {
  const [expression, setExpression] = useState('');
  const [result, setResult] = useState<string | null>(null);
  const t = useTranslations('CalculatorDialog');
  const displayRef = useRef<HTMLDivElement>(null);
  const locale = useLocale();

  const formatNumber = (numStr: string) => {
    // Avoid formatting operators
    if (isNaN(parseFloat(numStr))) return numStr;
    const [integer, decimal] = numStr.split('.');
    const formattedInteger = new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(parseFloat(integer));
    return decimal !== undefined ? `${formattedInteger}.${decimal}` : formattedInteger;
  };
  
  const handleInput = (value: string) => {
    setResult(null);
    setExpression(prev => {
        // Prevent multiple operators in a row
        if (['+', '-', '*', '/'].includes(value)) {
            if (prev === '' || ['+', '-', '*', '/'].includes(prev.slice(-1).trim())) {
                return prev;
            }
            return prev + ` ${value} `;
        }
        // Prevent multiple decimals in one number segment
        if (value === '.') {
            const parts = prev.split(' ');
            if (parts[parts.length - 1].includes('.')) {
                return prev;
            }
        }
        return prev + value;
    });
  };

  const calculateResult = () => {
    if (expression === '' || ['+', '-', '*', '/'].includes(expression.slice(-2).trim())) {
      return;
    }
    try {
      // eslint-disable-next-line no-eval
      const evalResult = eval(expression.replace(/×/g, '*').replace(/÷/g, '/').replace(/−/g, '-'));
      if (isNaN(evalResult) || !isFinite(evalResult)) {
        setResult('Error');
        setExpression('');
      } else {
        const resultString = String(evalResult);
        setResult(formatNumber(resultString));
        setExpression(resultString);
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
      setExpression(prev => prev.trim().slice(0, -1).trim());
    }
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const { key } = event;
      if (key >= '0' && key <= '9' || key === '.') {
        handleInput(key);
      } else if (key === '+' || key === '-') {
        handleInput(key);
      } else if (key === '*') {
        handleInput('×');
      } else if (key === '/') {
        handleInput('÷');
      } else if (key === 'Enter' || key === '=') {
        event.preventDefault();
        calculateResult();
      } else if (key === 'Backspace') {
        deleteLast();
      } else if (key === 'Escape' || key.toLowerCase() === 'c') {
        clearAll();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expression]);

  useEffect(() => {
    if (displayRef.current) {
        displayRef.current.scrollLeft = displayRef.current.scrollWidth;
    }
  }, [expression, result]);

  const displayValue = result ? result : (expression || '0');
  
  const buttons = [
    { label: 'C', action: clearAll, style: buttonClasses.clear },
    { label: '⌫', action: deleteLast, style: buttonClasses.delete },
    { label: '÷', action: () => handleInput('÷'), style: buttonClasses.operator },
    { label: '×', action: () => handleInput('×'), style: buttonClasses.operator },
    { label: '7', action: () => handleInput('7'), style: buttonClasses.number },
    { label: '8', action: () => handleInput('8'), style: buttonClasses.number },
    { label: '9', action: () => handleInput('9'), style: buttonClasses.number },
    { label: '−', action: () => handleInput('−'), style: buttonClasses.operator },
    { label: '4', action: () => handleInput('4'), style: buttonClasses.number },
    { label: '5', action: () => handleInput('5'), style: buttonClasses.number },
    { label: '6', action: () => handleInput('6'), style: buttonClasses.number },
    { label: '+', action: () => handleInput('+'), style: buttonClasses.operator },
    { label: '1', action: () => handleInput('1'), style: buttonClasses.number },
    { label: '2', action: () => handleInput('2'), style: buttonClasses.number },
    { label: '3', action: () => handleInput('3'), style: buttonClasses.number },
    { label: '=', action: calculateResult, style: buttonClasses.equal },
    { label: '0', action: () => handleInput('0'), style: `${buttonClasses.number} col-span-2` },
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
      <DialogContent className="sm:max-w-sm w-full p-6 shadow-2xl bg-white rounded-2xl flex flex-col font-[Poppins] border-t-4 border-blue-500">
        <DialogHeader className="sr-only">
           <DialogTitle>{t('calculatorTitle')}</DialogTitle>
        </DialogHeader>
        <div 
            ref={displayRef} 
            className="bg-gradient-to-br from-gray-100 to-gray-200 rounded-xl p-5 text-right text-4xl text-[#2c3e50] overflow-x-auto whitespace-nowrap shadow-inner min-h-[80px] flex items-center justify-end font-medium">
            {displayValue}
        </div>
        <div className="grid grid-cols-4 gap-3">
          {buttons.map((btn) => (
            <Button
              key={btn.label}
              onClick={btn.action}
              className={`h-auto aspect-square text-xl rounded-xl transition-transform duration-100 ease-in-out hover:-translate-y-1 hover:shadow-lg active:translate-y-0 active:shadow-md p-0 font-medium ${btn.style}`}
            >
              {btn.label}
            </Button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
