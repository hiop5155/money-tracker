import React, { useEffect } from 'react';
import { Delete } from 'lucide-react';

const CalculatorKeypad = ({ value, onChange, onSubmit, isDark }) => {
    // Core processing logic (extracted for reusability)
    const handlePress = (key) => {
        // Handle Complete (OK)
        if (key === 'OK') {
            onSubmit();
            return;
        }

        // Handle Delete (DEL)
        if (key === 'DEL') {
            onChange(value.length > 0 ? value.slice(0, -1) : '');
            return;
        }

        // Validation logic
        const operators = ['+', '-', '*', '/'];
        const lastChar = value.slice(-1);

        // 1. If it's an operator and the last character is also an operator, replace it
        if (operators.includes(key)) {
            if (operators.includes(lastChar)) {
                onChange(value.slice(0, -1) + key);
                return;
            }
            // If no number is input yet, ignore operator (prevent starting with *)
            if (value === '') return;
        }

        // 2. Decimal point validation: Check if current number segment already has a decimal
        if (key === '.') {
            // Split by operators, get the last number segment
            const parts = value.split(/[\+\-\*\/]/);
            const currentPart = parts[parts.length - 1];
            if (currentPart.includes('.')) return;
        }

        onChange(value + key);
    };

    // --- New: Keyboard Event Listener ---
    useEffect(() => {
        const handleKeyDown = (e) => {
            // 1. If user is typing in a note (focus on input/textarea), ignore keypad
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
                return;
            }

            const key = e.key;

            // 2. Numbers (0-9)
            if (/^[0-9]$/.test(key)) {
                handlePress(key);
            }
            // 3. Operators (+ - * /)
            else if (['+', '-', '*', '/'].includes(key)) {
                handlePress(key);
            }
            // 4. Decimal
            else if (key === '.') {
                handlePress('.');
            }
            // 5. Backspace
            else if (key === 'Backspace') {
                handlePress('DEL');
            }
            // 6. Submit (Enter or =)
            else if (key === 'Enter' || key === '=') {
                e.preventDefault(); // Prevent form submission in some cases
                onSubmit();
            }
        };

        window.addEventListener('keydown', handleKeyDown);

        // Cleanup function: remove listener on unmount
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [value, onChange, onSubmit]); // Depend on value to ensure latest state

    // Define key layout
    const keys = [
        { label: '÷', val: '/', type: 'op' },
        { label: '7', val: '7', type: 'num' },
        { label: '8', val: '8', type: 'num' },
        { label: '9', val: '9', type: 'num' },
        { label: '×', val: '*', type: 'op' },
        { label: '4', val: '4', type: 'num' },
        { label: '5', val: '5', type: 'num' },
        { label: '6', val: '6', type: 'num' },
        { label: '-', val: '-', type: 'op' },
        { label: '1', val: '1', type: 'num' },
        { label: '2', val: '2', type: 'num' },
        { label: '3', val: '3', type: 'num' },
        { label: '+', val: '+', type: 'op' },
        { label: '.', val: '.', type: 'num' },
        { label: '0', val: '0', type: 'num' },
        { label: 'DEL', val: 'DEL', type: 'action' },
    ];

    return (
        <div className={`grid grid-cols-4 gap-0.5 p-0.5 ${isDark ? 'bg-slate-700' : 'bg-gray-200'}`}>
            {keys.map((btn) => (
                <button
                    key={btn.label}
                    onClick={(e) => {
                        e.preventDefault();
                        handlePress(btn.val);
                    }}
                    className={`
            h-14 flex items-center justify-center text-xl font-medium active:scale-95 transition-transform select-none
            ${
                btn.type === 'op'
                    ? isDark
                        ? 'bg-slate-600 text-blue-400'
                        : 'bg-gray-100 text-blue-600'
                    : btn.type === 'action'
                      ? isDark
                          ? 'bg-slate-600 text-red-400'
                          : 'bg-gray-100 text-red-500'
                      : isDark
                        ? 'bg-slate-800 text-white'
                        : 'bg-white text-gray-800'
            }
          `}
                >
                    {btn.label === 'DEL' ? <Delete className="w-6 h-6" /> : btn.label}
                </button>
            ))}
        </div>
    );
};

export default CalculatorKeypad;
