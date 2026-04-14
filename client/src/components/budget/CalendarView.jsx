import React, { useState, useMemo } from 'react';
import { Plus, Edit, Trash2, Loader2, X, CheckCircle2, MinusCircle } from 'lucide-react';
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

    const [showBudgetRuleModal, setShowBudgetRuleModal] = useState(false);

    // Monthly expense total limited to categories that have a monthly budget set
    const budgetedMonthlyTotal = (monthlyExpenses || [])
        .filter((e) => {
            if (e.type !== 'expense' && e.type) return false;
            const catName = e.category ? e.category.trim() : '未分類';
            return budgets?.categoryLimits?.some((l) => l.name === catName && l.monthly > 0);
        })
        .reduce((sum, e) => sum + Number(e.amount), 0);

    // Per-category breakdown for the rule modal
    const categoryBreakdown = useMemo(() => {
        // Spending this month per category (for display only)
        const spentMap = {};
        (monthlyExpenses || []).forEach((e) => {
            if (e.type !== 'expense' && e.type) return;
            const catName = e.category ? e.category.trim() : '未分類';
            spentMap[catName] = (spentMap[catName] || 0) + Number(e.amount);
        });

        const included = [];
        const excluded = [];

        // Base: all user categories
        (categories || []).forEach((cat) => {
            const limitObj = budgets?.categoryLimits?.find((l) => l.name === cat && l.monthly > 0);
            const spent = spentMap[cat] || 0;
            if (limitObj) {
                included.push({ name: cat, limit: limitObj.monthly, spent, remaining: limitObj.monthly - spent });
            } else {
                excluded.push({ name: cat, spent });
            }
        });

        included.sort((a, b) => a.name.localeCompare(b.name, 'zh-TW'));
        excluded.sort((a, b) => a.name.localeCompare(b.name, 'zh-TW'));
        return { included, excluded };
    }, [categories, monthlyExpenses, budgets]);

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
        <>
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
                        <button
                            onClick={() => setShowBudgetRuleModal(true)}
                            className={`underline underline-offset-2 decoration-dotted transition-colors ${isDark ? 'text-slate-400 hover:text-slate-200' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            本月支出 *
                        </button>
                        <span className={`font-bold ${budgetedMonthlyTotal > budgets.monthly ? 'text-red-600' : 'text-red-500'}`}>
                            {formatCurrency(budgetedMonthlyTotal)}
                        </span>
                    </div>

                    {/* Simplified Daily Stats row to save space */}
                    {(() => {
                        const today = new Date();
                        if (today.getFullYear() === currentYear && today.getMonth() === currentMonth) {
                            const remainingDays = getDaysInMonth(currentYear, currentMonth) - today.getDate();
                            const remainingBudget = (budgets.monthly || 0) - budgetedMonthlyTotal;
                            const dailyAvailable = remainingDays > 0 ? Math.round(Math.max(0, remainingBudget) / remainingDays) : 0;
                            const daysPassed = today.getDate();
                            const dailySpent = daysPassed > 0 ? Math.round(budgetedMonthlyTotal / daysPassed) : 0;

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
        </div>

        {/* Budget Rule Modal */}
        {showBudgetRuleModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
                <div className={`w-full max-w-sm rounded-xl shadow-2xl flex flex-col max-h-[80vh] ${isDark ? 'bg-slate-800 text-slate-100' : 'bg-white text-gray-800'}`}>
                    {/* Header */}
                    <div className={`flex justify-between items-center p-4 border-b shrink-0 ${isDark ? 'border-slate-700' : 'border-gray-200'}`}>
                        <h3 className="font-bold text-base">本月支出統計規則</h3>
                        <button onClick={() => setShowBudgetRuleModal(false)} className={`p-1 rounded-full transition-colors ${isDark ? 'hover:bg-slate-700' : 'hover:bg-gray-100'}`}>
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Rule explanation */}
                    <div className={`px-4 py-3 text-sm shrink-0 ${isDark ? 'bg-slate-700/40 text-slate-300' : 'bg-blue-50 text-blue-800'}`}>
                        本月支出只計入<strong>有設定月預算</strong>的分類。<br />
                        未設定月預算的分類不列入統計，但仍會記錄在帳目中。<br />
                        如需計入，請至「設定」為該分類設定月預算。
                    </div>

                    {/* Category lists */}
                    <div className="overflow-y-auto px-4 py-3 space-y-3 custom-scrollbar">
                        {/* Included */}
                        <div>
                            <p className={`text-xs font-bold mb-2 flex items-center gap-1 ${isDark ? 'text-green-400' : 'text-green-700'}`}>
                                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                                計入本月統計（{categoryBreakdown.included.length} 項）：
                                {categoryBreakdown.included.length > 0 && (
                                    <span className="font-normal truncate">{categoryBreakdown.included.map((c) => c.name).join('、')}</span>
                                )}
                            </p>
                            {categoryBreakdown.included.length > 0 ? (
                                <ul className={`rounded-lg overflow-hidden divide-y text-sm ${isDark ? 'divide-slate-700' : 'divide-gray-100'}`}>
                                    {categoryBreakdown.included.map((cat) => (
                                        <li key={cat.name} className={`px-3 py-2 ${isDark ? 'bg-slate-700/40' : 'bg-gray-50'}`}>
                                            <div className="flex justify-between items-center">
                                                <span className={`font-medium ${isDark ? 'text-slate-200' : 'text-gray-700'}`}>{cat.name}</span>
                                                <span className="font-mono text-red-500 text-xs">花費 {formatCurrency(cat.spent)}</span>
                                            </div>
                                            <div className={`flex justify-between text-xs mt-0.5 ${isDark ? 'text-slate-400' : 'text-gray-400'}`}>
                                                <span>月預算 {formatCurrency(cat.limit)}</span>
                                                <span className={cat.remaining < 0 ? 'text-red-500 font-bold' : 'text-green-500'}>
                                                    剩 {formatCurrency(cat.remaining)}
                                                </span>
                                            </div>
                                            <div className={`mt-1.5 w-full rounded-full h-1.5 overflow-hidden ${isDark ? 'bg-slate-600' : 'bg-gray-200'}`}>
                                                <div
                                                    className={`h-1.5 rounded-full transition-all ${cat.remaining < 0 ? 'bg-red-500' : 'bg-green-500'}`}
                                                    style={{ width: `${Math.min(100, (cat.spent / cat.limit) * 100)}%` }}
                                                />
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <p className={`text-xs ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>無已設定月預算的分類</p>
                            )}
                        </div>

                        <div className={`border-t ${isDark ? 'border-slate-700' : 'border-gray-100'}`} />

                        {/* Excluded */}
                        <div>
                            <p className={`text-xs font-bold mb-2 flex items-center gap-1 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                                <MinusCircle className="w-3.5 h-3.5 shrink-0" />
                                未計入（無月預算設定，{categoryBreakdown.excluded.length} 項）：
                                {categoryBreakdown.excluded.length > 0 && (
                                    <span className="font-normal truncate">{categoryBreakdown.excluded.map((c) => c.name).join('、')}</span>
                                )}
                            </p>
                            {categoryBreakdown.excluded.length > 0 ? (
                                <ul className={`rounded-lg overflow-hidden divide-y text-sm ${isDark ? 'divide-slate-700' : 'divide-gray-100'}`}>
                                    {categoryBreakdown.excluded.map((cat) => (
                                        <li key={cat.name} className={`px-3 py-2 flex justify-between items-center ${isDark ? 'bg-slate-700/20 text-slate-400' : 'bg-gray-50 text-gray-400'}`}>
                                            <span>{cat.name}</span>
                                            <span className="font-mono text-xs">{formatCurrency(cat.spent)}</span>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <p className={`text-xs ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>所有分類皆已設定月預算</p>
                            )}
                        </div>
                    </div>

                    {/* Footer totals */}
                    <div className={`px-4 py-3 border-t text-sm flex justify-between shrink-0 ${isDark ? 'border-slate-700 bg-slate-900/40' : 'border-gray-200 bg-gray-50'}`}>
                        <span className={isDark ? 'text-slate-400' : 'text-gray-500'}>計入統計總計</span>
                        <span className="font-bold text-red-500">{formatCurrency(budgetedMonthlyTotal)}</span>
                    </div>
                </div>
            </div>
        )}
        </>
    );
};

export default CalendarView;
