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
    expenses,
    categories,
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
                    className={`min-h-[50px] md:h-24 border ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-gray-50 border-gray-100'}`}
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
                    className={`min-h-[50px] md:h-24 border p-0.5 md:p-1 cursor-pointer transition-colors relative flex flex-col justify-between ${isSelected
                        ? `border-blue-500 ring-1 ring-blue-500 ${isDark ? 'bg-blue-900/30' : 'bg-blue-50'}`
                        : `${isDark ? 'bg-slate-800 border-slate-700 hover:bg-slate-700' : 'bg-white border-gray-100 hover:bg-gray-50'}`
                        }`}
                >
                    <span
                        className={`text-xs font-medium ${isSelected ? (isDark ? 'text-blue-400' : 'text-blue-600') : isDark ? 'text-gray-300' : 'text-gray-700'}`}
                    >
                        {day}
                    </span>

                    {/* Expense Total (Compact) */}
                    {dayExpenseTotal > 0 && (
                        <div
                            className={`text-[10px] text-right font-bold truncate w-full leading-tight ${isDark ? 'text-red-400' : 'text-red-500'}`}
                        >
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
        <div className="flex flex-col h-full gap-2 overflow-y-auto md:grid md:grid-cols-[1fr_320px] md:gap-6 md:overflow-hidden">
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
                    <div className={`flex justify-between items-center pr-2 border-r ${isDark ? 'border-slate-600' : 'border-gray-300'}`}>
                        <span className={isDark ? 'text-slate-400' : 'text-gray-500'}>本月收入:</span>
                        <span className="font-bold text-green-500">{formatCurrency(monthlyIncome || 0)}</span>
                    </div>
                    <div className="flex justify-between items-center pl-2">
                        <span className={isDark ? 'text-slate-400' : 'text-gray-500'}>本月支出:</span>
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
                            const daysPassed = today.getDate();
                            const dailySpent = daysPassed > 0 ? Math.round(monthlyTotal / daysPassed) : 0;

                            return (
                                <div
                                    className={`col-span-2 pt-1 mt-1 border-t flex justify-between text-[10px] ${isDark ? 'border-slate-700 text-slate-400' : 'border-gray-300 text-gray-500'}`}
                                >
                                    <span>剩: {remainingDays}天</span>
                                    <span className="flex items-center gap-1">
                                        每日平均花費: <strong className={isDark ? 'text-slate-300' : 'text-gray-600'}>${dailySpent}</strong>
                                    </span>
                                    <span>
                                        剩下每日可用: <strong className="text-blue-500">${dailyAvailable}</strong>
                                    </span>
                                </div>
                            );
                        }
                        return null;
                    })()}
                </div>
            </div>

            {/* Right/Bottom: Selected Date Details (Scrollable) */}
            <div className="flex flex-col gap-2 shrink-0 md:min-h-0 md:flex-1">
                <div className={`flex flex-col rounded-xl shadow-sm md:min-h-0 md:flex-1 md:overflow-hidden ${isDark ? 'bg-slate-800' : 'bg-white'}`}>
                    <div className={`flex justify-between items-center p-3 border-b shrink-0 ${isDark ? 'border-slate-700' : 'border-gray-100'}`}>
                        <h3 className={`font-bold text-sm ${isDark ? 'text-slate-200' : 'text-gray-700'}`}>
                            {selectedDate.getMonth() + 1}/{selectedDate.getDate()} 詳情
                        </h3>
                        <button onClick={onAddExpense} className="bg-blue-600 text-white p-1.5 rounded-full hover:bg-blue-700 shadow-sm">
                            <Plus className="w-4 h-4" />
                        </button>
                    </div>

                    <div className="p-2 space-y-2 md:flex-1 md:overflow-y-auto md:pb-4 custom-scrollbar">
                        {/* InsightCard removed: Moved to Header in BudgetApp */}

                        {selectedDateExpenses.length === 0 ? (
                            <p className={`text-center py-4 text-xs ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>無紀錄</p>
                        ) : (
                            selectedDateExpenses.map((item) => (
                                <div key={item.id} className={`flex flex-col p-2.5 rounded-lg group ${isDark ? 'bg-slate-700/50' : 'bg-gray-50'}`}>
                                    <div className="flex justify-between items-start">
                                        <div className="flex flex-col">
                                            <span className={`font-medium text-sm ${isDark ? 'text-slate-200' : 'text-gray-700'}`}>{item.category}</span>
                                            {item.note && (
                                                <span className={`text-[10px] ${isDark ? 'text-slate-400' : 'text-gray-400'}`}>{item.note}</span>
                                            )}
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

                {/* Footer */}
                <footer className="text-center py-8 border-t border-gray-200 dark:border-slate-700 mt-2 shrink-0">
                    <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm mb-4">
                        <a href="/" className={`hover:text-blue-500 transition-colors ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                            記帳助手 App
                        </a>
                        <a href="/calc" className={`hover:text-blue-500 transition-colors ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                            資產計算器
                        </a>
                        <a href="/blog/" className={`hover:text-blue-500 transition-colors ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                            理財知識庫
                        </a>
                        <a href="/blog/privacy.html" className={`hover:text-blue-500 transition-colors ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                            隱私權政策
                        </a>
                    </div>
                    <div className={`text-xs ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
                        &copy; {new Date().getFullYear()} 記帳助手 Money Tracker.
                    </div>
                </footer>
            </div>
        </div >
    );
};

export default CalendarView;
