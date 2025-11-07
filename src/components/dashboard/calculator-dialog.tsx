'use client';

import { useState, useEffect, useRef } from 'react';
import Draggable from 'react-draggable';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose
} from '@/components/ui/dialog';
import { Calculator, GripVertical, X } from 'lucide-react';
import { useTranslations, useLocale } from 'next-intl';

const buttonClasses = {
  number: "bg-[#f8f9fa] hover:bg-gray-200 text-[#2c3e50] shadow-sm",
  operator: "bg-gradient-to-br from-[#3498db] to-[#2980b9] text-white",
  clear: "bg-gradient-to-br from-[#e74c3c] to-[#c0392b] text-white",
  delete: "bg-gradient-to-br from-[#f39c12] to-[#e67e22] text-white",
  equal: "bg-gradient-to-br from-[#27ae60] to-[#229954] text-white",
};

export function CalculatorDialog() {
  const [isOpen, setIsOpen] = useState(false);
  const [expression, setExpression] = useState('');
  const [result, setResult] = useState<string | null>(null);
  const t = useTranslations('CalculatorDialog');
  const displayRef = useRef<HTMLDivElement>(null);
  const nodeRef = useRef(null);
  const locale = useLocale();

  const formatNumber = (numStr: string) => {
    if (isNaN(parseFloat(numStr)) || numStr.endsWith('.')) return numStr;
    const [integer, decimal] = numStr.split('.');
    
    const cleanInteger = integer.replace(/[^\d-]/g, '');
    if (cleanInteger === '' || cleanInteger === '-') return integer;
    
    const formattedInteger = new Intl.NumberFormat(locale).format(parseInt(cleanInteger, 10));
    
    return decimal !== undefined ? `${formattedInteger}.${decimal}` : formattedInteger;
  };
  
  const handleInput = (value: string) => {
    setResult(null);
    setExpression(prev => {
        const isOperator = ['+', '−', '×', '÷'].includes(value);

        if (isOperator) {
            if (prev === '' || ['+', '−', '×', '÷'].includes(prev.trim().slice(-1))) {
                return prev;
            }
            return `${prev} ${value} `;
        }

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
    if (expression === '' || ['+', '−', '×', '÷'].includes(expression.trim().slice(-1))) {
      return;
    }
    try {
      const sanitizedExpression = expression
        .replace(/×/g, '*')
        .replace(/÷/g, '/')
        .replace(/−/g, '-')
        .replace(new RegExp(`\\${new Intl.NumberFormat(locale).format(1111).charAt(1)}`, 'g'), '');
        
      // eslint-disable-next-line no-eval
      const evalResult = eval(sanitizedExpression);
      
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

  const handleKeyDown = (event: KeyboardEvent) => {
      const { key } = event;
      
      if (key >= '0' && key <= '9' || key === '.') {
        handleInput(key);
      } else if (key === '+') {
        handleInput('+');
      } else if (key === '-') {
        handleInput('−');
      } else if (key === '*') {
        handleInput('×');
      } else if (key === '/') {
        handleInput('÷');
      } else if (key === 'Enter' || key === '=') {
        calculateResult();
      } else if (key === 'Backspace') {
        deleteLast();
      } else if (key.toLowerCase() === 'c') {
        clearAll();
      } else if (key === 'Escape') {
        setIsOpen(false);
      }
  };

  useEffect(() => {
    if (displayRef.current) {
        displayRef.current.scrollLeft = displayRef.current.scrollWidth;
    }
  }, [expression, result]);
  
  const getDisplayValue = () => {
    if (result !== null) return result;
    if (expression === '') return '0';

    return expression
      .split(' ')
      .map((part) => (['+', '−', '×', '÷'].includes(part) ? part : formatNumber(part)))
      .join(' ');
  }

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
    { label: '=', action: calculateResult, style: `${buttonClasses.equal} row-span-2` },
    { label: '0', action: () => handleInput('0'), style: `${buttonClasses.number} col-span-2` },
    { label: '.', action: () => handleInput('.'), style: buttonClasses.number },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon">
          <Calculator className="h-5 w-5" />
          <span className="sr-only">{t('calculatorTitle')}</span>
        </Button>
      </DialogTrigger>
       <Draggable nodeRef={nodeRef} handle=".handle">
        <DialogContent 
            ref={nodeRef} 
            className="sm:max-w-sm w-full p-0 shadow-2xl bg-white rounded-2xl flex flex-col font-[Poppins] border-t-4 border-blue-500 overflow-hidden"
            onKeyDown={handleKeyDown}
        >
            <DialogHeader className="handle cursor-move bg-gray-100 p-2 flex flex-row items-center justify-between">
                <div className="flex items-center gap-2">
                    <GripVertical className="h-5 w-5 text-gray-400" />
                    <DialogTitle className="text-base text-gray-600">{t('calculatorTitle')}</DialogTitle>
                </div>
                 <DialogClose asChild>
                    <Button variant="ghost" size="icon" className="h-6 w-6">
                        <X className="h-4 w-4" />
                    </Button>
                </DialogClose>
            </DialogHeader>
            <div className="p-4">
                <div 
                    ref={displayRef} 
                    className="bg-gradient-to-br from-gray-100 to-gray-200 rounded-xl p-5 text-right text-4xl text-[#2c3e50] overflow-x-auto whitespace-nowrap shadow-inner min-h-[80px] flex items-center justify-end font-medium">
                    {getDisplayValue()}
                </div>
                <div className="grid grid-cols-4 gap-3 mt-4">
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
            </div>
        </DialogContent>
       </Draggable>
    </Dialog>
  );
}