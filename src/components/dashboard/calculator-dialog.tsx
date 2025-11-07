'use client';

import { useState, useEffect, useRef } from 'react';
import Draggable from 'react-draggable';
import { Button } from '@/components/ui/button';
import { Calculator, GripVertical, X, Grip } from 'lucide-react';
import { useTranslations } from 'next-intl';

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
  const { locale } = useTranslations();

  const [size, setSize] = useState({ width: 340, height: 500 });
  const resizeRef = useRef({ isResizing: false, startX: 0, startY: 0, startWidth: 0, startHeight: 0 });

  const getClientCoords = (e: MouseEvent | TouchEvent | React.MouseEvent | React.TouchEvent) => {
    if ('touches' in e) {
      return { clientX: e.touches[0].clientX, clientY: e.touches[0].clientY };
    }
    return { clientX: e.clientX, clientY: e.clientY };
  };

  const handleResizeStart = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const { clientX, clientY } = getClientCoords(e);
    resizeRef.current = {
      isResizing: true,
      startX: clientX,
      startY: clientY,
      startWidth: size.width,
      startHeight: size.height,
    };
    window.addEventListener('mousemove', handleResizeMove);
    window.addEventListener('mouseup', handleResizeEnd);
    window.addEventListener('touchmove', handleResizeMove);
    window.addEventListener('touchend', handleResizeEnd);
  };

  const handleResizeMove = (e: MouseEvent | TouchEvent) => {
    if (!resizeRef.current.isResizing) return;
    const { clientX, clientY } = getClientCoords(e);
    const dx = clientX - resizeRef.current.startX;
    const dy = clientY - resizeRef.current.startY;
    setSize({
      width: Math.max(300, resizeRef.current.startWidth + dx),
      height: Math.max(420, resizeRef.current.startHeight + dy),
    });
  };

  const handleResizeEnd = () => {
    resizeRef.current.isResizing = false;
    window.removeEventListener('mousemove', handleResizeMove);
    window.removeEventListener('mouseup', handleResizeEnd);
    window.removeEventListener('touchmove', handleResizeMove);
    window.removeEventListener('touchend', handleResizeEnd);
  };

  const handleClose = (e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    setIsOpen(false);
  };
  
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

  const handleKeyDown = (event: React.KeyboardEvent) => {
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
        event.preventDefault();
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
    <>
      <Button variant="ghost" size="icon" onClick={() => setIsOpen(!isOpen)}>
          <Calculator className="h-5 w-5" />
          <span className="sr-only">{t('calculatorTitle')}</span>
      </Button>

      {isOpen && (
         <Draggable nodeRef={nodeRef} handle=".handle" bounds="parent">
            <div 
              ref={nodeRef}
              style={{ width: `${size.width}px`, height: `${size.height}px` }}
              className="fixed top-1/4 left-1/4 z-50 bg-white rounded-2xl flex flex-col font-[Poppins] border-t-4 border-blue-500 overflow-hidden shadow-2xl"
            >
              <div className="handle cursor-move bg-gray-100 p-2 flex flex-row items-center justify-between">
                <div className="flex items-center gap-2">
                  <GripVertical className="h-5 w-5 text-gray-400" />
                  <p className="text-base text-gray-600">{t('calculatorTitle')}</p>
                </div>
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleClose} onTouchEnd={handleClose}>
                    <X className="h-4 w-4" />
                </Button>
              </div>
              <div onKeyDown={handleKeyDown} tabIndex={0} className="p-4 flex flex-col flex-grow outline-none">
                <div 
                  ref={displayRef} 
                  className="bg-gradient-to-br from-gray-100 to-gray-200 rounded-xl p-5 text-4xl text-[#2c3e50] overflow-x-auto whitespace-nowrap shadow-inner min-h-[80px] flex items-center justify-end font-medium">
                  {getDisplayValue()}
                </div>
                <div className="grid grid-cols-4 grid-rows-5 gap-3 mt-4 flex-grow">
                  {buttons.map((btn) => (
                    <Button
                      key={btn.label}
                      onClick={() => btn.action()}
                      className={`text-xl rounded-xl transition-transform duration-100 ease-in-out hover:-translate-y-1 hover:shadow-lg active:translate-y-0 active:shadow-md p-0 font-medium ${btn.style}`}
                    >
                      {btn.label}
                    </Button>
                  ))}
                </div>
              </div>
              <div 
                className="absolute bottom-0 right-0 cursor-se-resize p-1 text-gray-400 hover:text-blue-500 touch-none"
                onMouseDown={handleResizeStart}
                onTouchStart={handleResizeStart}
              >
                  <Grip className="h-4 w-4 rotate-45" />
              </div>
            </div>
         </Draggable>
      )}
    </>
  );
}
