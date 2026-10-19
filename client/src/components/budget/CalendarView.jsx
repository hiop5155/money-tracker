import React, { useState, useMemo } from 'react';
import { Plus, Edit, Trash2, Loader2, X, CheckCircle2, MinusCircle, Receipt, TrendingUp, TrendingDown, Wallet, ArrowUpRight, ArrowDownRight, Sparkles } from 'lucide-react';
import MonthSelector from './MonthSelector';
import { getCalcUrl } from '../../utils/calcUrl';

import { usePlan } from '../../context/PlanContext';
import { useTranslation } from '../../i18n';

// Format amount compactly for mobile calendar cells to prevent truncation (e.g. $1... bug)
const formatCalendarAmount = (val) => {
    const num = Math.round(Number(val) || 0);
    if (num < 1000) {
        return `$${num}`;
    }
    if (num < 10000) {
        // e.g. 1250 => $1250 (compact without commas, fits easily in 40px)
        return `$${num}`;
    }
    if (num < 100000) {
        // e.g. 15200 => $15.2k, 15000 => $15k
        const kVal = (num / 1000).toFixed(1).replace(/\.0$/, '');
        return `$${kVal}k`;
    }
    // >= 100k, e.g. 120000 => $120k
    return `$${Math.round(num / 1000)}k`;
};

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
    const { t, formatCurrency, language } = useTranslation();
    const { isPro, userPlan, openUpgradeModal } = usePlan();
    // Guard clause: Ensure currentDate has a value
    const safeDate = currentDate || new Date();
    const currentYear = safeDate.getFullYear();
    const currentMonth = safeDate.getMonth();

    const [showBudgetRuleModal, setShowBudgetRuleModal] = useState(() => {
        const params = new URLSearchParams(window.location.search);
        return params.get('modal') === 'budget-rule';
    });

    // Monthly expense total limited to categories that have a monthly budget set
    const budgetedMonthlyTotal = (monthlyExpenses || [])
        .filter((e) => {
            if (e.type !== 'expense' && e.type) return false;
            const catName = e.category ? e.category.trim() : t('calendar.uncategorized');
            return budgets?.categoryLimits?.some((l) => l.name === catName && l.monthly > 0);
        })
        .reduce((sum, e) => sum + Number(e.amount), 0);

    // Per-category breakdown for the rule modal
    const categoryBreakdown = useMemo(() => {
        // Spending this month per category (for display only)
        const spentMap = {};
        (monthlyExpenses || []).forEach((e) => {
            if (e.type !== 'expense' && e.type) return;
            const catName = e.category ? e.category.trim() : t('calendar.uncategorized');
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

        included.sort((a, b) => a.name.localeCompare(b.name, language));
        excluded.sort((a, b) => a.name.localeCompare(b.name, language));
        return { included, excluded };
    }, [categories, monthlyExpenses, budgets, language]);

    const getDaysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
    const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay();

    const renderCalendarDays = () => {
        const daysInMonth = getDaysInMonth(currentYear, currentMonth);
        const days = [];
        const today = new Date();
        const isCurrentMonthThisYear = today.getFullYear() === currentYear && today.getMonth() === currentMonth;
        const todayDate = today.getDate();

        for (let i = 0; i < firstDayOfMonth; i++) {
            days.push(
                <div
                    key={`empty-${i}`}
                    className={`min-h-[50px] md:h-24 rounded-xl border border-transparent ${isDark ? 'bg-slate-800/20' : 'bg-slate-100/30'}`}
                ></div>
            );
        }
        for (let day = 1; day <= daysInMonth; day++) {
            const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const dayExpenses = monthlyExpenses.filter((e) => e.date === dateStr);
            const dayExpenseTotal = dayExpenses.filter((e) => e.type === 'expense' || !e.type).reduce((sum, e) => sum + Number(e.amount), 0);
            const dayIncomeTotal = dayExpenses.filter((e) => e.type === 'income').reduce((sum, e) => sum + Number(e.amount), 0);

            const isSelected =
                selectedDate.getDate() === day && selectedDate.getMonth() === currentMonth && selectedDate.getFullYear() === currentYear;
            const isToday = isCurrentMonthThisYear && todayDate === day;

            days.push(
                <div
                    key={day}
                    onClick={() => onDateClick(day)}
                    className={`min-h-[50px] md:h-24 rounded-xl p-0.5 sm:p-1 md:p-1.5 cursor-pointer transition-all duration-150 relative flex flex-col justify-between overflow-hidden active:scale-[0.98] ${
                        isSelected
                            ? isDark
                                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20 ring-2 ring-blue-400/50 z-10'
                                : 'bg-blue-600 text-white shadow-md shadow-blue-600/25 ring-2 ring-blue-500/40 z-10'
                            : isToday
                                ? isDark
                                    ? 'bg-blue-950/40 border border-blue-500/40 hover:bg-slate-700/60 text-slate-100'
                                    : 'bg-blue-50/80 border border-blue-400/40 hover:bg-slate-100/80 text-slate-900'
                                : isDark
                                    ? 'bg-slate-800/80 hover:bg-slate-700/70 text-slate-200 border border-white/[0.04]'
                                    : 'bg-white hover:bg-slate-50/90 text-slate-800 border border-black/[0.04]'
                    }`}
                >
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between w-full min-w-0 gap-0.5 px-0.5">
                        <span
                            className={`text-xs font-semibold tabular-nums shrink-0 leading-none ${
                                isSelected
                                    ? 'text-white'
                                    : isToday
                                        ? isDark ? 'text-blue-400 font-bold' : 'text-blue-600 font-bold'
                                        : isDark ? 'text-slate-300' : 'text-slate-700'
                            }`}
                        >
                            {day}
                        </span>
                        {isToday && (
                            <span
                                className={`text-[8px] sm:text-[9px] px-1 py-0.5 rounded font-medium tracking-tight leading-none shrink-0 self-start sm:self-auto max-w-full truncate ${
                                    isSelected
                                        ? 'bg-white/20 text-white'
                                        : isDark
                                            ? 'bg-blue-500/20 text-blue-400'
                                            : 'bg-blue-500/10 text-blue-600'
                                }`}
                            >
                                {t('calendar.today') || '今日'}
                            </span>
                        )}
                    </div>

                    {/* Day Amount Badges */}
                    <div className="w-full flex flex-col items-end gap-0.5 mt-auto px-0.5">
                        {dayExpenseTotal > 0 && (
                            <div
                                className={`font-bold tabular-nums leading-none text-right w-full whitespace-nowrap overflow-hidden ${
                                    dayExpenseTotal >= 10000
                                        ? 'text-[8.5px] tracking-tighter'
                                        : dayExpenseTotal >= 1000
                                            ? 'text-[9px] tracking-tight'
                                            : 'text-[10px]'
                                } ${
                                    isSelected
                                        ? 'text-white'
                                        : isDark
                                            ? 'text-red-400'
                                            : 'text-red-600'
                                }`}
                                title={`$${Math.round(dayExpenseTotal).toLocaleString()}`}
                            >
                                <span className="sm:hidden">{formatCalendarAmount(dayExpenseTotal)}</span>
                                <span className="hidden sm:inline">${Math.round(dayExpenseTotal).toLocaleString()}</span>
                            </div>
                        )}
                        {dayIncomeTotal > 0 && dayExpenseTotal === 0 && (
                            <div
                                className={`font-bold tabular-nums leading-none text-right w-full whitespace-nowrap overflow-hidden ${
                                    dayIncomeTotal >= 10000
                                        ? 'text-[8.5px] tracking-tighter'
                                        : dayIncomeTotal >= 1000
                                            ? 'text-[9px] tracking-tight'
                                            : 'text-[10px]'
                                } ${
                                    isSelected
                                        ? 'text-white'
                                        : isDark
                                            ? 'text-emerald-400'
                                            : 'text-emerald-600'
                                }`}
                                title={`+$${Math.round(dayIncomeTotal).toLocaleString()}`}
                            >
                                <span className="sm:hidden">+{formatCalendarAmount(dayIncomeTotal)}</span>
                                <span className="hidden sm:inline">+${Math.round(dayIncomeTotal).toLocaleString()}</span>
                            </div>
                        )}

                        {/* Dot indicator */}
                        {dayExpenses.length > 0 && (
                            <div className="flex gap-0.5 justify-end w-full">
                                {dayExpenses.slice(0, 3).map((ex, idx) => (
                                    <div
                                        key={idx}
                                        className={`w-1 h-1 md:w-1.5 md:h-1.5 rounded-full ${
                                            isSelected
                                                ? 'bg-white'
                                                : ex.type === 'income'
                                                    ? 'bg-emerald-400'
                                                    : 'bg-blue-400'
                                        }`}
                                    ></div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            );
        }
        return days;
    };

    // Bento 財務指標計算
    const today = new Date();
    const isCurrentMonthThisYear = today.getFullYear() === currentYear && today.getMonth() === currentMonth;
    const remainingDays = isCurrentMonthThisYear
        ? Math.max(1, getDaysInMonth(currentYear, currentMonth) - today.getDate() + 1)
        : getDaysInMonth(currentYear, currentMonth);
    const daysPassed = isCurrentMonthThisYear ? Math.max(1, today.getDate()) : getDaysInMonth(currentYear, currentMonth);

    const hasMonthlyBudget = (budgets?.monthly || 0) > 0;
    const remainingBudget = (budgets?.monthly || 0) - budgetedMonthlyTotal;
    const budgetPercent = hasMonthlyBudget
        ? Math.min(100, Math.max(0, Math.round((budgetedMonthlyTotal / budgets.monthly) * 100)))
        : 0;
    const isOverBudget = hasMonthlyBudget && budgetedMonthlyTotal > budgets.monthly;
    const isWarning = hasMonthlyBudget && budgetPercent >= 80 && !isOverBudget;
    const netBalance = (monthlyIncome || 0) - budgetedMonthlyTotal;

    const dailyAvailable = hasMonthlyBudget
        ? (remainingBudget > 0 ? Math.round(remainingBudget / remainingDays) : 0)
        : Math.round((monthlyIncome || 0) / getDaysInMonth(currentYear, currentMonth));
    const dailySpent = Math.round(budgetedMonthlyTotal / daysPassed);

    return (
        <>
        {/* 頂部 Bento 財務決策概覽卡 (Modern Bento Financial Dashboard) */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 mb-3">
            {/* Card 1: 本月預算狀態 / 淨收支核心卡 (col-span-12 sm:col-span-7) */}
            <div
                className={`col-span-12 sm:col-span-7 p-4 sm:p-5 rounded-2xl border transition-all flex flex-col justify-between ${
                    isDark
                        ? 'bg-[#121824] border-white/[0.08] shadow-xs'
                        : 'bg-white border-black/[0.06] shadow-xs'
                }`}
            >
                <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                        <Wallet className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                        {hasMonthlyBudget ? t('calendar.budgetStatus') : t('calendar.netBalanceTitle')}
                    </span>
                    {hasMonthlyBudget && (
                        <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                isOverBudget
                                    ? 'bg-red-500/15 text-red-600 dark:text-red-400 border border-red-500/20'
                                    : isWarning
                                        ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                                        : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                            }`}
                        >
                            {isOverBudget ? t('calendar.budgetExceeded') : isWarning ? t('calendar.budgetWarning') : t('calendar.budgetHealthy')}
                        </span>
                    )}
                </div>

                {/* 核心金額大字展示 (Tabular Nums & Clear Typographic Hierarchy) */}
                <div className="flex items-baseline gap-1 my-1">
                    <span className="text-sm font-semibold text-slate-400 dark:text-slate-500">$</span>
                    <span
                        className={`text-2xl sm:text-3xl font-extrabold tabular-nums tracking-tight ${
                            hasMonthlyBudget
                                ? isOverBudget ? 'text-red-600 dark:text-red-400' : isDark ? 'text-white' : 'text-slate-900'
                                : netBalance >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
                        }`}
                    >
                        {Math.abs(hasMonthlyBudget ? remainingBudget : netBalance).toLocaleString()}
                    </span>
                    <span className="text-xs font-medium text-slate-400 dark:text-slate-500 ml-1.5">
                        {hasMonthlyBudget
                            ? t('calendar.remainingOfBudget', { budget: Number(budgets.monthly).toLocaleString() })
                            : t('calendar.monthNetBalance')}
                    </span>
                </div>

                {/* 預算微進度條 */}
                {hasMonthlyBudget && (
                    <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden my-2">
                        <div
                            className={`h-full rounded-full transition-all duration-500 ${
                                isOverBudget
                                    ? 'bg-red-500'
                                    : isWarning
                                        ? 'bg-amber-500'
                                        : 'bg-blue-600 dark:bg-blue-500'
                            }`}
                            style={{ width: `${Math.min(100, budgetPercent)}%` }}
                        />
                    </div>
                )}

                {/* 收支微標籤 (Muted Pastel Badges) */}
                <div className="flex items-center gap-3 pt-2 border-t border-black/[0.04] dark:border-white/[0.06] text-xs mt-1">
                    <div className="flex items-center gap-1.5 flex-1 min-w-0">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0"></span>
                        <span className="text-slate-500 dark:text-slate-400 text-[11px] truncate">{t('calendar.monthlyIncome')}</span>
                        <span className="font-bold tabular-nums text-emerald-600 dark:text-emerald-400 text-xs ml-auto">
                            +${(monthlyIncome || 0).toLocaleString()}
                        </span>
                    </div>
                    <div className="h-3 w-px bg-slate-200 dark:bg-slate-700"></div>
                    <div
                        onClick={() => setShowBudgetRuleModal(true)}
                        className="flex items-center gap-1.5 flex-1 min-w-0 cursor-pointer group"
                        title={t('calendar.ruleModalTitle') || '查看月度支出計算規則'}
                    >
                        <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0"></span>
                        <span className="text-slate-500 dark:text-slate-400 text-[11px] truncate underline decoration-dotted group-hover:text-slate-700 dark:group-hover:text-slate-200">
                            {t('calendar.monthlyExpense')}
                        </span>
                        <span className="font-bold tabular-nums text-red-600 dark:text-red-400 text-xs ml-auto">
                            -${budgetedMonthlyTotal.toLocaleString()}
                        </span>
                    </div>
                </div>
            </div>

            {/* Card 2: 每日節奏與可用額度 (col-span-12 sm:col-span-5) */}
            <div
                className={`col-span-12 sm:col-span-5 p-4 sm:p-5 rounded-2xl border transition-all flex flex-col justify-between ${
                    isDark
                        ? 'bg-[#121824] border-white/[0.08] shadow-xs'
                        : 'bg-white border-black/[0.06] shadow-xs'
                }`}
            >
                <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                        {t('calendar.dailyAvailable') || '每日建議花費'}
                    </span>
                    <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500">
                        {t('calendar.daysRemaining', { days: remainingDays })}
                    </span>
                </div>

                <div className="flex items-baseline gap-1 my-1">
                    <span className="text-sm font-semibold text-blue-500">$</span>
                    <span className="text-2xl sm:text-3xl font-extrabold tabular-nums tracking-tight text-blue-600 dark:text-blue-400">
                        {dailyAvailable.toLocaleString()}
                    </span>
                    <span className="text-xs font-medium text-slate-400 dark:text-slate-500 ml-1">
                        {t('calendar.perDay') || '/ 天'}
                    </span>
                </div>

                <div className="pt-2 border-t border-black/[0.04] dark:border-white/[0.06] flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                    <span>{t('calendar.dailyAvgSpent')}:</span>
                    <span className="font-bold tabular-nums text-slate-700 dark:text-slate-300">
                        ${dailySpent.toLocaleString()}
                    </span>
                </div>
            </div>
        </div>

        {/* 主體佈局：日曆網格 (左/上) + 當日詳情 (右/下) */}
        <div className="flex flex-col gap-3 md:grid md:grid-cols-[1fr_330px] md:gap-4 md:items-start">
            {/* Left/Top: 現代極簡圓角日曆 (Modern Rounded Calendar Grid) */}
            <div
                className={`flex flex-col shrink-0 rounded-2xl border p-2 sm:p-3 transition-all ${
                    isDark
                        ? 'bg-[#121824] border-white/[0.08] shadow-xs'
                        : 'bg-white border-black/[0.06] shadow-xs'
                }`}
            >
                <MonthSelector
                    currentDate={safeDate}
                    onPrevMonth={onPrevMonth}
                    onNextMonth={onNextMonth}
                    onDateChange={onDateChange}
                    isDark={isDark}
                />

                <div
                    className={`grid grid-cols-7 text-center text-xs font-bold py-2 px-1 mb-1 rounded-xl ${
                        isDark ? 'bg-white/[0.03] text-slate-400' : 'bg-slate-50 text-slate-500'
                    }`}
                >
                    {(Array.isArray(t('calendar.weekdays')) ? t('calendar.weekdays') : ['日', '一', '二', '三', '四', '五', '六']).map((dayStr, idx) => (
                        <div key={idx} className={idx === 0 || idx === 6 ? 'text-amber-500/80 dark:text-amber-400/80' : ''}>
                            {dayStr}
                        </div>
                    ))}
                </div>

                <div className="grid grid-cols-7 gap-1 md:gap-1.5">{renderCalendarDays()}</div>
            </div>

            {/* Right/Bottom: 當日收支明細與快速記帳 (Selected Date Details Panel) */}
            <div className="flex flex-col gap-2 shrink-0 w-full">
                <div
                    className={`flex flex-col rounded-2xl border transition-all ${
                        isDark
                            ? 'bg-[#121824] border-white/[0.08] shadow-xs'
                            : 'bg-white border-black/[0.06] shadow-xs'
                    }`}
                >
                    {/* Header */}
                    <div className={`flex justify-between items-center p-3.5 border-b shrink-0 ${isDark ? 'border-white/[0.08]' : 'border-black/[0.05]'}`}>
                        <div className="flex items-center gap-2">
                            <h3 className={`font-bold text-sm tracking-tight ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>
                                {t('calendar.selectedDateDetails', { month: selectedDate.getMonth() + 1, day: selectedDate.getDate() })}
                            </h3>
                            <span className={`text-[11px] font-medium px-2 py-0.5 rounded-md ${isDark ? 'bg-white/5 text-slate-400' : 'bg-slate-100 text-slate-600'}`}>
                                {(Array.isArray(t('calendar.weekdays')) ? t('calendar.weekdays') : ['日', '一', '二', '三', '四', '五', '六'])[selectedDate.getDay()]}
                            </span>
                        </div>
                        {/* 高階 Island 記帳按鈕 */}
                        <button
                            onClick={onAddExpense}
                            className="bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded-xl font-semibold text-xs flex items-center gap-1.5 shadow-sm active:scale-95 transition-all cursor-pointer"
                            title={t('common.add')}
                        >
                            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                            <span>{t('calendar.recordExpense') || t('common.add')}</span>
                        </button>
                    </div>

                    {/* Transaction List */}
                    <div className="p-3 space-y-2 md:flex-1 md:overflow-y-auto md:pb-4 custom-scrollbar">
                        {selectedDateExpenses.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
                                <div className={`p-3.5 rounded-2xl mb-2.5 ${isDark ? 'bg-white/[0.04] text-slate-500' : 'bg-slate-100 text-slate-400'}`}>
                                    <Receipt className="w-6 h-6" />
                                </div>
                                <p className={`text-xs font-semibold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{t('calendar.noRecordsToday')}</p>
                                <p className={`text-[11px] mt-1 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{t('calendar.clickPlusToRecord')}</p>
                            </div>
                        ) : (
                            selectedDateExpenses.map((item) => (
                                <div
                                    key={item.id}
                                    className={`flex flex-col p-3 rounded-xl border transition-all ${
                                        isDark
                                            ? 'bg-slate-800/40 hover:bg-slate-800/80 border-white/[0.04]'
                                            : 'bg-slate-50/70 hover:bg-white border-black/[0.04] shadow-2xs'
                                    }`}
                                >
                                    <div className="flex justify-between items-center gap-2">
                                        {/* Left: Category and Note */}
                                        <div className="flex flex-col min-w-0 flex-1 mr-2">
                                            <div className="flex items-center gap-1.5">
                                                <span className={`w-2 h-2 rounded-full shrink-0 ${item.type === 'income' ? 'bg-emerald-500' : 'bg-blue-500'}`}></span>
                                                <span className={`font-semibold text-sm truncate ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>
                                                    {item.category || t('common.uncategorized')}
                                                </span>
                                            </div>
                                            {item.note && (
                                                <span className={`text-xs break-all line-clamp-2 mt-1 pl-3.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                                                    {item.note}
                                                </span>
                                            )}
                                        </div>

                                        {/* Right: Amount & Touch-friendly Action Buttons */}
                                        <div className="flex items-center gap-2.5 shrink-0">
                                            <span className={`font-bold tabular-nums text-sm shrink-0 ${item.type === 'income' ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                                                {item.type === 'income' ? '+' : '-'}${Number(item.amount || 0).toLocaleString()}
                                            </span>

                                            <div className="flex items-center gap-1">
                                                <button
                                                    onClick={() => onEditExpense(item)}
                                                    disabled={deletingId === item.id}
                                                    aria-label={t('common.edit')}
                                                    className={`w-7 h-7 flex items-center justify-center rounded-lg transition-all active:scale-90 cursor-pointer ${
                                                        isDark ? 'text-slate-400 hover:text-blue-400 hover:bg-white/10' : 'text-slate-400 hover:text-blue-600 hover:bg-slate-200/80'
                                                    }`}
                                                >
                                                    <Edit className="w-3.5 h-3.5" />
                                                </button>
                                                <button
                                                    onClick={() => onDeleteExpense(item.id)}
                                                    disabled={deletingId === item.id}
                                                    aria-label={t('common.delete')}
                                                    className={`w-7 h-7 flex items-center justify-center rounded-lg transition-all active:scale-90 cursor-pointer ${
                                                        isDark ? 'text-slate-400 hover:text-red-400 hover:bg-red-500/10' : 'text-slate-400 hover:text-red-600 hover:bg-red-50'
                                                    }`}
                                                >
                                                    {deletingId === item.id ? (
                                                        <Loader2 className="w-3.5 h-3.5 animate-spin text-red-500" />
                                                    ) : (
                                                        <Trash2 className="w-3.5 h-3.5" />
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
                <footer className="text-center py-6 border-t border-black/[0.04] dark:border-white/[0.06] mt-2 shrink-0">
                    <div className="flex flex-wrap justify-center gap-x-5 gap-y-1.5 text-xs mb-3">
                        <a href="/" className={`hover:text-blue-500 transition-colors ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                            {t('footer.appName')}
                        </a>
                        <a href={getCalcUrl()} className={`hover:text-blue-500 transition-colors ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                            {t('footer.calcTool')}
                        </a>
                        <a href="/blog/" className={`hover:text-blue-500 transition-colors ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                            {t('footer.knowledge')}
                        </a>
                        <a href="/blog/privacy.html" className={`hover:text-blue-500 transition-colors ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                            {t('footer.privacy')}
                        </a>
                    </div>
                    <div className={`text-[11px] ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                        {t('footer.copyright', { year: new Date().getFullYear() })}
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
                        <h3 className="font-bold text-base">{t('calendar.ruleModalTitle')}</h3>
                        <button onClick={() => setShowBudgetRuleModal(false)} className={`p-1 rounded-full transition-colors ${isDark ? 'hover:bg-slate-700' : 'hover:bg-gray-100'}`}>
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Rule explanation */}
                    <div className={`px-4 py-3 text-sm shrink-0 ${isDark ? 'bg-slate-700/40 text-slate-300' : 'bg-blue-50 text-blue-800'}`}>
                        {t('calendar.ruleModalDesc')}
                    </div>

                    {/* Category lists */}
                    <div className="overflow-y-auto px-4 py-3 space-y-3 custom-scrollbar">
                        {/* Included */}
                        <div>
                            <p className={`text-xs font-bold mb-2 flex items-center gap-1 ${isDark ? 'text-green-400' : 'text-green-700'}`}>
                                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                                {t('calendar.countedCategories')}（{categoryBreakdown.included.length}）：
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
                                                <span className="font-mono text-red-500 text-xs">{t('calendar.spent')} {formatCurrency(cat.spent)}</span>
                                            </div>
                                            <div className={`flex justify-between text-xs mt-0.5 ${isDark ? 'text-slate-400' : 'text-gray-400'}`}>
                                                <span>{t('calendar.limit')} {formatCurrency(cat.limit)}</span>
                                                <span className={cat.remaining < 0 ? 'text-red-500 font-bold' : 'text-green-500'}>
                                                    {cat.remaining < 0 ? t('calendar.overBudget') : t('calendar.remaining')} {formatCurrency(Math.abs(cat.remaining))}
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
                                <p className={`text-xs ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>-</p>
                            )}
                        </div>

                        <div className={`border-t ${isDark ? 'border-slate-700' : 'border-gray-100'}`} />

                        {/* Excluded */}
                        <div>
                            <p className={`text-xs font-bold mb-2 flex items-center gap-1 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                                <MinusCircle className="w-3.5 h-3.5 shrink-0" />
                                {t('calendar.uncountedCategories')}（{categoryBreakdown.excluded.length}）：
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
                                <p className={`text-xs ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>-</p>
                            )}
                        </div>
                    </div>

                    {/* Footer totals */}
                    <div className={`px-4 py-3 border-t text-sm flex justify-between shrink-0 ${isDark ? 'border-slate-700 bg-slate-900/40' : 'border-gray-200 bg-gray-50'}`}>
                        <span className={isDark ? 'text-slate-400' : 'text-gray-500'}>{t('calendar.monthlyExpense')}</span>
                        <span className="font-bold text-red-500">{formatCurrency(budgetedMonthlyTotal)}</span>
                    </div>
                </div>
            </div>
        )}
        </>
    );
};

export default CalendarView;
