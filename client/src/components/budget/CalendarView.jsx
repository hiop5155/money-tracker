import React from 'react';
import { Plus, Edit, Trash2, Loader2 } from 'lucide-react';
import MonthSelector from './MonthSelector';

const formatCurrency = (amount) => new Intl.NumberFormat('zh-TW', { style: 'currency', currency: 'TWD', maximumFractionDigits: 0 }).format(amount);

const CalendarView = ({
    isDark,
    currentDate,
    selectedDate,
    monthlyExpenses,
    selectedDateExpenses,
    monthlyTotal,
    yearlyTotal,
    monthlyIncome,
    yearlyIncome,
    budgets,
    onPrevMonth,
    onNextMonth,
    onDateChange,
    onDateClick,
    onAddExpense,
    onEditExpense,
    onDeleteExpense,
    deletingId,
}) => {
    // Guard clause: Ensure currentDate has a value
    const safeDate = currentDate || new Date();
    const currentYear = safeDate.getFullYear();
    const currentMonth = safeDate.getMonth();
    const getDaysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
    const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay();

    const renderCalendarDays = () => {
        const daysInMonth = getDaysInMonth(currentYear, currentMonth);
        const days = [];
        for (let i = 0; i < firstDayOfMonth; i++) {
            days.push(<div key={`empty-${i}`} className="h-24 bg-gray-50 dark:bg-slate-800 border border-gray-100 dark:border-slate-700"></div>);
        }
        for (let day = 1; day <= daysInMonth; day++) {
            const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const dayExpenses = monthlyExpenses.filter((e) => e.date === dateStr);

            // Calculate total expenses for the day (excluding income)
            const dayExpenseTotal = dayExpenses.filter((e) => e.type === 'expense' || !e.type).reduce((sum, e) => sum + Number(e.amount), 0);

            const isSelected =
                selectedDate.getDate() === day && selectedDate.getMonth() === currentMonth && selectedDate.getFullYear() === currentYear;

            days.push(
                <div
                    key={day}
                    onClick={() => onDateClick(day)}
                    className={`h-24 border p-1 cursor-pointer transition-colors relative flex flex-col justify-between ${isSelected ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-500 ring-1 ring-blue-500' : 'bg-white dark:bg-slate-800 border-gray-100 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700'}`}
                >
                    <span className={`text-sm font-medium ${isSelected ? 'text-blue-600 dark:text-blue-400' : 'text-gray-700 dark:text-gray-300'}`}>
                        {day}
                    </span>
                    {/* Only display expense total (Red) */}
                    {dayExpenseTotal > 0 && (
                        <div className="text-xs text-right font-bold text-red-500 dark:text-red-400 truncate w-full">${dayExpenseTotal}</div>
                    )}

                    {dayExpenses.length > 0 && (
                        <div className="flex gap-0.5 flex-wrap content-end">
                            {dayExpenses.slice(0, 3).map((ex, idx) => (
                                <div key={idx} className={`w-1.5 h-1.5 rounded-full ${ex.type === 'income' ? 'bg-green-500' : 'bg-blue-400'}`}></div>
                            ))}
                        </div>
                    )}
                </div>
            );
        }
        return days;
    };

    return (
        <div className="flex flex-col md:flex-row gap-6">
            {/* Left: Calendar Body */}
            <div className={`flex-1 rounded-xl shadow-sm overflow-hidden flex flex-col ${isDark ? 'bg-slate-800' : 'bg-white'}`}>
                <MonthSelector
                    currentDate={safeDate}
                    onPrevMonth={onPrevMonth}
                    onNextMonth={onNextMonth}
                    onDateChange={onDateChange}
                    isDark={isDark}
                />

                <div
                    className={`grid grid-cols-7 text-center text-xs font-medium py-2 border-b ${isDark ? 'bg-slate-700/30 text-slate-400 border-slate-700' : 'bg-gray-50 text-gray-500 border-gray-100'}`}
                >
                    <div>日</div>
                    <div>一</div>
                    <div>二</div>
                    <div>三</div>
                    <div>四</div>
                    <div>五</div>
                    <div>六</div>
                </div>

                <div className="grid grid-cols-7 flex-1">{renderCalendarDays()}</div>

                {/* --- Bottom Stats Area --- */}
                <div
                    className={`p-4 text-sm grid grid-cols-2 gap-y-2 ${isDark ? 'bg-slate-900/50 border-t border-slate-700' : 'bg-blue-50/50 border-t border-blue-100'}`}
                >
                    {/* Row 1: Monthly Income vs Expense */}
                    <div className="flex justify-between items-center pr-2 border-r border-gray-300 dark:border-slate-600">
                        <span className="text-gray-500 dark:text-slate-400">本月收入:</span>
                        <span className="font-bold text-green-500">{formatCurrency(monthlyIncome || 0)}</span>
                    </div>
                    <div className="flex justify-between items-center pl-2">
                        <span className="text-gray-500 dark:text-slate-400">本月支出:</span>
                        <span className={`font-bold ${monthlyTotal > budgets.monthly ? 'text-red-600' : 'text-red-500'}`}>
                            {formatCurrency(monthlyTotal)}
                        </span>
                    </div>

                    {/* Row 2: Yearly Income vs Expense */}
                    <div className="flex justify-between items-center pr-2 border-r border-gray-300 dark:border-slate-600 pt-2 border-t dark:border-t-slate-700">
                        <span className="text-gray-500 dark:text-slate-400">年度收入:</span>
                        <span className="font-bold text-green-500">{formatCurrency(yearlyIncome || 0)}</span>
                    </div>
                    <div className="flex justify-between items-center pl-2 pt-2 border-t border-gray-300 dark:border-t-slate-700">
                        <span className="text-gray-500 dark:text-slate-400">年度支出:</span>
                        <span className={`font-bold ${yearlyTotal > budgets.yearly ? 'text-red-600' : 'text-red-500'}`}>
                            {formatCurrency(yearlyTotal)}
                        </span>
                    </div>

                    {/* Row 3: Daily Stats (NEW) */}
                    {(() => {
                        const daysInCurrentMonth = getDaysInMonth(currentYear, currentMonth);
                        // Logic: if looking at past months, days passed = total days. If future, 0?
                        // Assuming logic is relevant for "Current Viewing Month"
                        // But usually "Remaining Days" implies relation to TODAY.

                        // Check if viewing current actual month
                        const today = new Date();
                        const isCurrentRealMonth = today.getFullYear() === currentYear && today.getMonth() === currentMonth;

                        if (!isCurrentRealMonth) return null; // Only show for current month

                        const dayOfMonth = today.getDate();
                        const remainingDays = daysInCurrentMonth - dayOfMonth;
                        const remainingBudget = (budgets.monthly || 0) - monthlyTotal;

                        const dailyAvgSpent = dayOfMonth > 0 ? Math.round(monthlyTotal / dayOfMonth) : 0;
                        const dailyAvailable = remainingDays > 0 ? Math.round(Math.max(0, remainingBudget) / remainingDays) : 0;

                        return (
                            <>
                                <div className="col-span-2 pt-2 mt-2 border-t border-gray-300 dark:border-slate-700 flex justify-between text-xs text-gray-500 dark:text-slate-400">
                                    <span>剩餘天數: <strong className={isDark ? 'text-slate-200' : 'text-gray-700'}>{remainingDays} 天</strong></span>
                                    <span>日均花費: <strong className="text-orange-500">${dailyAvgSpent}</strong></span>
                                    <span>日均可用: <strong className="text-blue-500">${dailyAvailable}</strong></span>
                                </div>
                            </>
                        );
                    })()}
                </div>
                {/* --------------------------- */}
            </div>

            {/* Right: Selected Date Details */}
            <div className="w-full md:w-80 flex flex-col gap-4">
                <div className={`rounded-xl shadow-sm p-4 flex-1 ${isDark ? 'bg-slate-800' : 'bg-white'}`}>
                    <div className="flex justify-between items-center mb-4">
                        <h3 className={`font-bold ${isDark ? 'text-slate-200' : 'text-gray-700'}`}>
                            {selectedDate.getMonth() + 1}/{selectedDate.getDate()} 日 詳情
                        </h3>
                        <button onClick={onAddExpense} className="bg-blue-600 text-white p-2 rounded-full hover:bg-blue-700 shadow-lg">
                            <Plus className="w-4 h-4" />
                        </button>
                    </div>
                    <div className="space-y-3 max-h-[400px] overflow-y-auto custom-scrollbar">
                        {selectedDateExpenses.length === 0 ? (
                            <p className={`text-center py-8 text-sm ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>No records today</p>
                        ) : (
                            selectedDateExpenses.map((item) => (
                                <div key={item.id} className={`flex flex-col p-3 rounded-lg group ${isDark ? 'bg-slate-700/50' : 'bg-gray-50'}`}>
                                    <div className="flex justify-between items-start">
                                        <div className="flex flex-col">
                                            <span className={`font-medium ${isDark ? 'text-slate-200' : 'text-gray-700'}`}>{item.category}</span>
                                            <span className={`text-xs ${isDark ? 'text-slate-400' : 'text-gray-400'}`}>{item.note || 'No note'}</span>
                                        </div>

                                        <div className="flex items-center gap-3">
                                            {/* Green for Income, Red for Expense */}
                                            <span className={`font-bold font-mono ${item.type === 'income' ? 'text-green-500' : 'text-red-500'}`}>
                                                {item.type === 'income' ? '+' : '-'}${item.amount}
                                            </span>

                                            <button
                                                onClick={() => onEditExpense(item)}
                                                disabled={deletingId === item.id}
                                                className="text-gray-400 hover:text-blue-500 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity disabled:opacity-0"
                                            >
                                                <Edit className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => onDeleteExpense(item.id)}
                                                disabled={deletingId === item.id}
                                                className="text-gray-400 hover:text-red-500 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity disabled:opacity-100"
                                            >
                                                {deletingId === item.id ? (
                                                    <Loader2 className="w-4 h-4 animate-spin text-red-500" />
                                                ) : (
                                                    <Trash2 className="w-4 h-4" />
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CalendarView;
