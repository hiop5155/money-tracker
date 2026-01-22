import React, { useState, useEffect } from 'react';
import { X, Calendar as CalendarIcon, Tag, FileText, Check } from 'lucide-react';
import CalculatorKeypad from './CalculatorKeypad';

const ExpenseModal = ({ isOpen, onClose, onSave, initialData, selectedDate, categories, expenses, budgets, isDark }) => {
    const [formData, setFormData] = useState({
        type: 'expense',
        amountStr: '', // Store expression as string (e.g., "100+50")
        category: '',
        note: '',
        date: '',
    });

    // Initialize Data
    useEffect(() => {
        if (isOpen) {
            if (initialData) {
                setFormData({
                    type: initialData.type || 'expense',
                    amountStr: String(initialData.amount || ''),
                    category: initialData.category || categories[0] || '',
                    note: initialData.note || '',
                    date: initialData.date || new Date().toISOString().split('T')[0],
                });
            } else {
                // New Entry Mode
                const defaultDate = selectedDate
                    ? `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`
                    : new Date().toISOString().split('T')[0];

                setFormData({
                    type: 'expense',
                    amountStr: '',
                    category: categories[0] || '',
                    note: '',
                    date: defaultDate,
                });
            }
        }
    }, [isOpen, initialData, selectedDate, categories]);

    if (!isOpen) return null;

    // Calculate result of current expression
    const calculateResult = (expression) => {
        try {
            if (!expression) return 0;
            // Safe calculation (only allow numbers and operators)
            // eslint-disable-next-line no-new-func
            const result = new Function('return ' + expression)();
            // Handle infinity or non-numbers
            if (!isFinite(result) || isNaN(result)) return 0;
            return result;
        } catch (e) {
            return 0;
        }
    };

    const handleSubmit = () => {
        // 1. Calculate final amount
        const finalAmount = calculateResult(formData.amountStr);

        if (finalAmount <= 0) {
            alert('Please enter a valid amount');
            return;
        }

        // 2. Validate category
        if (!formData.category) {
            alert('Please select a category');
            return;
        }

        onSave({
            ...formData,
            amount: finalAmount, // Return number
        });
    };

    // Get preview amount (show realtime result if operators exist)
    const previewAmount = calculateResult(formData.amountStr);

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end md:items-center justify-center animate-in fade-in duration-200">
            {/* Modal Container */}
            <div
                className={`w-full md:w-[400px] md:rounded-2xl rounded-t-2xl shadow-2xl flex flex-col max-h-[90vh] ${isDark ? 'bg-slate-800 text-slate-100' : 'bg-white text-slate-800'}`}
            >
                {/* Header: Type Switcher & Close */}
                <div className={`flex justify-between items-center p-4 border-b ${isDark ? 'border-slate-700' : 'border-gray-100'}`}>
                    <div className="flex bg-gray-100 dark:bg-slate-700 rounded-lg p-1">
                        <button
                            onClick={() => setFormData({ ...formData, type: 'expense' })}
                            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
                                formData.type === 'expense'
                                    ? 'bg-white dark:bg-slate-600 text-red-500 shadow-sm'
                                    : 'text-gray-500 dark:text-slate-400'
                            }`}
                        >
                            支出
                        </button>
                        <button
                            onClick={() => setFormData({ ...formData, type: 'income' })}
                            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
                                formData.type === 'income'
                                    ? 'bg-white dark:bg-slate-600 text-green-500 shadow-sm'
                                    : 'text-gray-500 dark:text-slate-400'
                            }`}
                        >
                            收入
                        </button>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Amount Display Area */}
                <div className={`px-6 py-4 flex flex-col items-end justify-center h-24 ${isDark ? 'bg-slate-800' : 'bg-white'}`}>
                    {/* Display expression (e.g. 100 + 50) */}
                    <div className={`text-sm h-5 ${isDark ? 'text-slate-400' : 'text-gray-400'}`}>{formData.amountStr || '0'}</div>
                    {/* Display result (e.g. 150) */}
                    <div
                        className={`text-4xl font-mono font-bold tracking-tight flex items-center gap-2 ${
                            formData.type === 'expense' ? 'text-red-500' : 'text-green-500'
                        }`}
                    >
                        <span>$</span>
                        {/* Show preview if calculating */}
                        <span>{formData.amountStr ? previewAmount.toLocaleString() : '0'}</span>
                    </div>
                </div>

                {/* Input Fields Area */}
                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    {/* Date & Category Selection Row */}
                    <div className={`p-4 space-y-4 ${isDark ? 'bg-slate-800' : 'bg-white'}`}>
                        {/* Date Picker */}
                        <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-full ${isDark ? 'bg-slate-700 text-slate-400' : 'bg-gray-100 text-gray-500'}`}>
                                <CalendarIcon className="w-5 h-5" />
                            </div>
                            <input
                                type="date"
                                value={formData.date}
                                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                                className={`flex-1 bg-transparent text-lg font-medium outline-none ${isDark ? 'text-white' : 'text-gray-800'}`}
                            />
                        </div>

                        {/* Category Selector (Horizontal Scroll) */}
                        <div className="flex items-center gap-3 overflow-x-auto pb-2 no-scrollbar">
                            <div className={`shrink-0 p-2 rounded-full ${isDark ? 'bg-slate-700 text-slate-400' : 'bg-gray-100 text-gray-500'}`}>
                                <Tag className="w-5 h-5" />
                            </div>
                            <div className="flex gap-2">
                                {categories.map((cat) => (
                                    <button
                                        key={cat}
                                        onClick={() => setFormData({ ...formData, category: cat })}
                                        className={`px-3 py-1.5 rounded-full text-sm whitespace-nowrap border transition-colors ${
                                            formData.category === cat
                                                ? isDark
                                                    ? 'bg-blue-900/50 border-blue-500 text-blue-400'
                                                    : 'bg-blue-50 border-blue-500 text-blue-600'
                                                : isDark
                                                  ? 'border-slate-600 text-slate-300 hover:bg-slate-700'
                                                  : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                                        }`}
                                    >
                                        {cat}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Category Budget Info - Only show if expense type */}
                        {formData.type === 'expense' && formData.category && (
                            <CategoryBudgetInfo
                                category={formData.category}
                                date={formData.date}
                                expenses={expenses}
                                budgets={budgets}
                                isDark={isDark}
                            />
                        )}

                        {/* Note Input */}
                        <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-full ${isDark ? 'bg-slate-700 text-slate-400' : 'bg-gray-100 text-gray-500'}`}>
                                <FileText className="w-5 h-5" />
                            </div>
                            <input
                                type="text"
                                placeholder="備註..."
                                value={formData.note}
                                onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                                className={`flex-1 bg-transparent border-b outline-none py-1 ${isDark ? 'border-slate-700 text-white placeholder-slate-500' : 'border-gray-200 text-gray-800 placeholder-gray-400'} focus:border-blue-500 transition-colors`}
                            />
                        </div>
                    </div>
                </div>

                {/* Bottom: Calculator + Complete Button */}
                <div className={`border-t ${isDark ? 'border-slate-700 bg-slate-800' : 'border-gray-200 bg-gray-50'}`}>
                    {/* Toolbar */}
                    <div className="flex justify-between items-center px-4 py-2 text-xs text-gray-400">
                        <span></span>
                        <button
                            onClick={handleSubmit}
                            className="bg-blue-600 text-white px-6 py-1.5 rounded-full flex items-center gap-1 font-bold shadow hover:bg-blue-700 active:scale-95 transition-all"
                        >
                            <Check className="w-4 h-4" /> 完成
                        </button>
                    </div>

                    {/* Calculator Keypad */}
                    <CalculatorKeypad
                        value={formData.amountStr}
                        onChange={(val) => setFormData({ ...formData, amountStr: val })}
                        onSubmit={handleSubmit}
                        isDark={isDark}
                    />
                </div>
            </div>
        </div>
    );
};

const CategoryBudgetInfo = ({ category, date, expenses, budgets, isDark }) => {
    // 1. Get Monthly Limit
    const categoryLimit = budgets?.categoryLimits?.find((c) => c.name === category)?.monthly || 0;

    if (!categoryLimit) return null; // No limit set

    // 2. Calculate Spent this month
    const targetDate = new Date(date);
    const targetYear = targetDate.getFullYear();
    const targetMonth = targetDate.getMonth(); // 0-11

    const spent = expenses
        .filter((e) => {
            if (e.category !== category || e.type !== 'expense') return false;
            if (!e.date) return false;
            const eDate = new Date(e.date);
            return eDate.getFullYear() === targetYear && eDate.getMonth() === targetMonth;
        })
        .reduce((sum, e) => sum + Number(e.amount), 0);

    const remaining = categoryLimit - spent;
    const isOverBudget = remaining < 0;

    return (
        <div className={`mx-4 px-3 py-2 rounded-lg text-sm flex justify-between items-center ${isDark ? 'bg-slate-700/50' : 'bg-gray-50'}`}>
            <span className={isDark ? 'text-slate-400' : 'text-gray-500'}>
                預算: {categoryLimit.toLocaleString()} / 已用: {spent.toLocaleString()}
            </span>
            <span className={`font-medium ${isOverBudget ? 'text-red-500' : 'text-green-500'}`}>剩餘: {remaining.toLocaleString()}</span>
        </div>
    );
};

export default ExpenseModal;
