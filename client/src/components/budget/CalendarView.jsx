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
            days.push(
                <div
                    key={`empty-${i}`}
                    className="min-h-[50px] md:h-24 bg-gray-50 dark:bg-slate-800 border border-gray-100 dark:border-slate-700"
                ></div>
            );
        }
        for (let day = 1; day <= daysInMonth; day++) {
            const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const dayExpenses = monthlyExpenses.filter((e) => e.date === dateStr);
            const dayExpenseTotal = dayExpenses.filter((e) => e.type === 'expense' || !e.type).reduce((sum, e) => sum + Number(e.amount), 0);

            const isSelected =
                selectedDate.getDate() === day && selectedDate.getMonth() === currentMonth && selectedDate.getFullYear() === currentYear;

            days.push(
                <div
                    key={day}
                    onClick={() => onDateClick(day)}
                    className={`min-h-[50px] md:h-24 border p-0.5 md:p-1 cursor-pointer transition-colors relative flex flex-col justify-between ${isSelected ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-500 ring-1 ring-blue-500' : 'bg-white dark:bg-slate-800 border-gray-100 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700'}`}
                >
                    <span className={`text-xs font-medium ${isSelected ? 'text-blue-600 dark:text-blue-400' : 'text-gray-700 dark:text-gray-300'}`}>
                        {day}
                    </span>

                    {/* Expense Total (Compact) */}
                    {dayExpenseTotal > 0 && (
                        <div className="text-[10px] text-right font-bold text-red-500 dark:text-red-400 truncate w-full leading-tight">
                            ${dayExpenseTotal}
                        </div>
                    )}

                    {/* Dots (Compact) */}
                    {dayExpenses.length > 0 && (
                        <div className="flex gap-0.5 flex-wrap content-end">
                            {dayExpenses.slice(0, 3).map((ex, idx) => (
                                <div
                                    key={idx}
                                    className={`w-1 h-1 md:w-1.5 md:h-1.5 rounded-full ${ex.type === 'income' ? 'bg-green-500' : 'bg-blue-400'}`}
                                ></div>
                            ))}
                        </div>
                    )}
                </div>
            );
        }
        return days;
    };

    return (
        <div className="flex flex-col h-full gap-2 md:grid md:grid-cols-[1fr_320px] md:gap-6 overflow-hidden">
            {/* Left/Top: Calendar Grid */}
            <div className={`flex flex-col shrink-0 rounded-xl shadow-sm ${isDark ? 'bg-slate-800' : 'bg-white'}`}>
                <MonthSelector
                    currentDate={safeDate}
                    onPrevMonth={onPrevMonth}
                    onNextMonth={onNextMonth}
                    onDateChange={onDateChange}
                    isDark={isDark}
                />

                <div
                    className={`grid grid-cols-7 text-center text-xs font-medium py-1 border-b ${isDark ? 'bg-slate-700/30 text-slate-400 border-slate-700' : 'bg-gray-50 text-gray-500 border-gray-100'}`}
                >
                    <div>日</div>
                    <div>一</div>
                    <div>二</div>
                    <div>三</div>
                    <div>四</div>
                    <div>五</div>
                    <div>六</div>
                </div>

                <div className="grid grid-cols-7">{renderCalendarDays()}</div>

                {/* Compact Stats */}
                <div
                    className={`px-3 py-2 text-xs grid grid-cols-2 gap-y-1 ${isDark ? 'bg-slate-900/50 border-t border-slate-700' : 'bg-blue-50/50 border-t border-blue-100'}`}
                >
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

                    {/* Simplified Daily Stats row to save space */}
                    {(() => {
                        const today = new Date();
                        if (today.getFullYear() === currentYear && today.getMonth() === currentMonth) {
                            const remainingDays = getDaysInMonth(currentYear, currentMonth) - today.getDate();
                            const remainingBudget = (budgets.monthly || 0) - monthlyTotal;
                            const dailyAvailable = remainingDays > 0 ? Math.round(Math.max(0, remainingBudget) / remainingDays) : 0;

                            return (
                                <div className="col-span-2 pt-1 mt-1 border-t border-gray-300 dark:border-slate-700 flex justify-between text-[10px] text-gray-500 dark:text-slate-400">
                                    <span>剩: {remainingDays}天</span>
                                    <span>可用: <strong className="text-blue-500">${dailyAvailable}/日</strong></span>
                                </div>
                            );
                        }
                        return null;
                    })()}
                </div>
            </div>

            {/* Right/Bottom: Selected Date Details (Scrollable) */}
            <div className={`flex flex-col min-h-0 flex-1 rounded-xl shadow-sm ${isDark ? 'bg-slate-800' : 'bg-white'} overflow-hidden`}>
                <div className="flex justify-between items-center p-3 border-b border-gray-100 dark:border-slate-700 shrink-0">
                    <h3 className={`font-bold text-sm ${isDark ? 'text-slate-200' : 'text-gray-700'}`}>
                        {selectedDate.getMonth() + 1}/{selectedDate.getDate()} 詳情
                    </h3>
                    <button onClick={onAddExpense} className="bg-blue-600 text-white p-1.5 rounded-full hover:bg-blue-700 shadow-sm">
                        <Plus className="w-4 h-4" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-2 space-y-2 custom-scrollbar">
                    {selectedDateExpenses.length === 0 ? (
                        <p className={`text-center py-4 text-xs ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>無紀錄</p>
                    ) : (
                        selectedDateExpenses.map((item) => (
                            <div key={item.id} className={`flex flex-col p-2.5 rounded-lg group ${isDark ? 'bg-slate-700/50' : 'bg-gray-50'}`}>
                                <div className="flex justify-between items-start">
                                    <div className="flex flex-col">
                                        <span className={`font-medium text-sm ${isDark ? 'text-slate-200' : 'text-gray-700'}`}>{item.category}</span>
                                        {item.note && <span className={`text-[10px] ${isDark ? 'text-slate-400' : 'text-gray-400'}`}>{item.note}</span>}
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <span className={`font-bold font-mono text-sm ${item.type === 'income' ? 'text-green-500' : 'text-red-500'}`}>
                                            {item.type === 'income' ? '+' : '-'}${item.amount}
                                        </span>

                                        <div className="flex gap-1">
                                            <button
                                                onClick={() => onEditExpense(item)}
                                                disabled={deletingId === item.id}
                                                className="text-gray-400 hover:text-blue-500 p-1"
                                            >
                                                <Edit className="w-3 h-3" />
                                            </button>
                                            <button
                                                onClick={() => onDeleteExpense(item.id)}
                                                disabled={deletingId === item.id}
                                                className="text-gray-400 hover:text-red-500 p-1"
                                            >
                                                {deletingId === item.id ? (
                                                    <Loader2 className="w-3 h-3 animate-spin text-red-500" />
                                                ) : (
                                                    <Trash2 className="w-3 h-3" />
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

export default CalendarView;
