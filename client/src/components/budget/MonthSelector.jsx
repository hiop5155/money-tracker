import React, { useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const MonthSelector = ({ currentDate, onPrevMonth, onNextMonth, onDateChange, isDark }) => {
    const dateObj = currentDate instanceof Date ? currentDate : new Date();
    const currentYear = dateObj.getFullYear();
    const currentMonth = dateObj.getMonth() + 1;
    const inputValue = `${currentYear}-${String(currentMonth).padStart(2, '0')}`;

    // Ref for the input element
    const inputRef = useRef(null);

    const handleInputChange = (e) => {
        if (!e.target.value) return;
        const [year, month] = e.target.value.split('-');
        const newDate = new Date(parseInt(year), parseInt(month) - 1, 1);
        if (onDateChange) {
            onDateChange(newDate);
        }
    };

    // Function to programmatically open the date picker
    const handleDivClick = () => {
        try {
            if (inputRef.current) {
                inputRef.current.showPicker(); // Modern browser API
            }
        } catch (error) {
            // Fallback for older browsers or Safari (focus usually works)
            inputRef.current?.focus();
        }
    };

    return (
        <div
            className={`p-4 border-b flex justify-between items-center ${isDark ? 'bg-slate-700/50 border-slate-700' : 'bg-gray-50 border-gray-100'}`}
        >
            <button onClick={onPrevMonth} className={`p-1 rounded-full transition-colors ${isDark ? 'hover:bg-slate-600' : 'hover:bg-gray-200'}`}>
                <ChevronLeft className="w-5 h-5" />
            </button>

            {/* Bind onClick here to trigger the picker */}
            <div className="relative group cursor-pointer" onClick={handleDivClick}>
                {/* 顯示文字 */}
                <h2 className="text-lg font-bold flex items-center justify-center gap-2">
                    {currentYear}年 {currentMonth}月
                </h2>

                {/* Hidden input */}
                {/* z-10 ensures it sits on top, ref bound for programmatic access */}
                <input
                    ref={inputRef}
                    type="month"
                    value={inputValue}
                    onChange={handleInputChange}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10"
                />
            </div>

            <button onClick={onNextMonth} className={`p-1 rounded-full transition-colors ${isDark ? 'hover:bg-slate-600' : 'hover:bg-gray-200'}`}>
                <ChevronRight className="w-5 h-5" />
            </button>
        </div>
    );
};

export default MonthSelector;
