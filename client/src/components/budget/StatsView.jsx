import React, { useState, useMemo, useEffect, useRef } from 'react';
import { PieChart, Pie, Cell, Tooltip } from 'recharts';
import { X, Calendar, FileText, Loader2, TrendingUp, TrendingDown, DollarSign } from 'lucide-react';
import MonthSelector from './MonthSelector';

// Chart Colors
const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#6366F1', '#14B8A6', '#64748B', '#84CC16', '#0EA5E9', '#D946EF'];

// --- Sub-component: Budget Progress Bar ---
const BudgetProgressBar = ({ label, current, total, colorClass = 'bg-blue-600', onClick, isIncomeMode, isDark }) => {
    const percentage = total > 0 ? Math.min(100, Math.max(0, (current / total) * 100)) : 0;
    const isOver = !isIncomeMode && total > 0 && current > total;

    return (
        <div
            className={`mb-4 cursor-pointer p-2 rounded-lg transition-colors group ${isDark ? 'hover:bg-slate-700/50' : 'hover:bg-gray-50'}`}
            onClick={onClick}
        >
            <div className="flex justify-between text-sm mb-1 pointer-events-none">
                <span className="font-medium truncate pr-2 flex items-center gap-2">
                    {label}
                    <span className={`opacity-0 group-hover:opacity-100 transition-opacity text-xs px-1.5 py-0.5 rounded-full ${isDark ? 'text-blue-500 bg-blue-900' : 'text-blue-500 bg-blue-100'}`}>
                        查看詳情
                    </span>
                </span>
                <span className={isOver ? 'text-red-500 font-bold' : isIncomeMode ? 'text-green-600 font-bold' : isDark ? 'text-gray-400' : 'text-gray-500'}>
                    ${current.toLocaleString()}
                    {!isIncomeMode && total > 0 && (
                        <>
                            {' '}
                            / <span className="text-xs text-gray-400">${total.toLocaleString()}</span>
                        </>
                    )}
                </span>
            </div>
            <div className={`w-full rounded-full h-2.5 overflow-hidden pointer-events-none ${isDark ? 'bg-slate-700' : 'bg-gray-200'}`}>
                <div
                    className={`h-2.5 rounded-full transition-all duration-500 ${isOver ? 'bg-red-500' : isIncomeMode ? 'bg-green-500' : colorClass}`}
                    style={{ width: isIncomeMode ? '100%' : total > 0 ? `${percentage}%` : '0%' }}
                ></div>
            </div>
        </div>
    );
};

// --- Sub-component: Donut Chart (Fixed size, no ResponsiveContainer) ---
const BudgetDonut = ({ title, spent, budget, isDark, isIncomeMode }) => {
    const safeBudget = budget || 0;
    const remaining = Math.max(0, safeBudget - spent);
    const incomeData = [{ name: '總收入', value: spent }];
    const expenseData = [
        { name: '已花費', value: spent },
        { name: '剩餘', value: remaining },
    ];

    const data = isIncomeMode ? incomeData : expenseData;

    let chartColors = ['#3B82F6', isDark ? '#374151' : '#E5E7EB'];
    if (isIncomeMode) {
        chartColors = ['#10B981'];
    } else if (safeBudget > 0 && spent > safeBudget) {
        chartColors = ['#EF4444', '#EF4444'];
    } else if (safeBudget === 0) {
        chartColors[0] = '#3B82F6';
        chartColors[1] = isDark ? '#1e293b' : '#fff';
    }

    return (
        <div className={`p-5 rounded-xl shadow-sm flex flex-col items-center ${isDark ? 'bg-slate-800' : 'bg-white'}`}>
            <h3 className={`text-lg font-bold mb-2 ${isDark ? 'text-slate-200' : 'text-gray-800'}`}>{title}</h3>

            <div style={{ width: 192, height: 192, position: 'relative' }}>
                <PieChart width={192} height={192}>
                    <Pie
                        data={data}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        fill="#8884d8"
                        paddingAngle={!isIncomeMode && safeBudget > 0 ? 5 : 0}
                        dataKey="value"
                        startAngle={90}
                        endAngle={-270}
                        stroke="none"
                        isAnimationActive={false}
                    >
                        {data.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={chartColors[index % chartColors.length]} />
                        ))}
                    </Pie>
                    <Tooltip
                        formatter={(value) => `$${value.toLocaleString()}`}
                        contentStyle={{
                            backgroundColor: isDark ? '#1e293b' : '#fff',
                            borderRadius: '8px',
                            border: 'none',
                            boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                        }}
                    />
                </PieChart>

                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-xs text-gray-500">{isIncomeMode ? '總收入' : safeBudget > 0 ? '總預算' : '無預算上限'}</span>
                    <span className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                        {isIncomeMode ? `$${spent.toLocaleString()}` : safeBudget > 0 ? `$${safeBudget.toLocaleString()}` : '∞'}
                    </span>
                </div>
            </div>

            <div className="mt-2 text-center">
                {isIncomeMode ? (
                    <p className="text-sm text-green-500 font-bold">本期收入: ${spent.toLocaleString()}</p>
                ) : (
                    <p className={`text-sm ${safeBudget > 0 && spent > safeBudget ? 'text-red-500 font-bold' : 'text-gray-500'}`}>
                        已用: ${spent.toLocaleString()}
                        {safeBudget > 0 && ` (${Math.round((spent / safeBudget) * 100)}%)`}
                    </p>
                )}
            </div>
        </div>
    );
};

// --- Sub-component: Category Detail Modal ---
const CategoryDetailModal = ({ isOpen, onClose, category, expenses, isDark, isIncomeMode }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div
                className={`w-full max-w-md rounded-xl shadow-2xl max-h-[80vh] flex flex-col ${isDark ? 'bg-slate-800 text-slate-100' : 'bg-white text-gray-800'}`}
            >
                <div className={`flex justify-between items-center p-4 border-b ${isDark ? 'border-slate-700' : 'border-gray-200'}`}>
                    <h3 className="font-bold text-lg flex items-center gap-2">
                        <FileText className={`w-5 h-5 ${isIncomeMode ? 'text-green-500' : 'text-blue-500'}`} />
                        {category} - {isIncomeMode ? '收入明細' : '支出明細'}
                    </h3>
                    <button onClick={onClose} className={`p-1 rounded-full transition-colors ${isDark ? 'hover:bg-slate-700' : 'hover:bg-gray-200'}`}>
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="overflow-y-auto p-4 space-y-3 custom-scrollbar">
                    {expenses.length > 0 ? (
                        expenses.map((expense, idx) => (
                            <div
                                key={expense.id || idx}
                                className={`flex justify-between items-center p-3 rounded-lg ${isDark ? 'bg-slate-700/50' : 'bg-gray-50'}`}
                            >
                                <div className="flex flex-col">
                                    <div className={`flex items-center gap-2 text-sm mb-0.5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                                        <Calendar className="w-3 h-3" />
                                        {expense.date}
                                    </div>
                                    <span className="font-medium">{expense.note || '無備註'}</span>
                                </div>
                                <span className={`font-bold text-lg ${isIncomeMode ? 'text-green-500' : isDark ? 'text-blue-400' : 'text-blue-600'}`}>
                                    ${Number(expense.amount).toLocaleString()}
                                </span>
                            </div>
                        ))
                    ) : (
                        <p className="text-center text-gray-500 py-8">無紀錄</p>
                    )}
                </div>

                <div className={`p-4 border-t rounded-b-xl flex justify-between items-center ${isDark ? 'border-slate-700 bg-slate-900/50' : 'border-gray-200 bg-gray-50'}`}>
                    <span className="text-sm text-gray-500">總筆數: {expenses.length}</span>
                    <span className="font-bold text-lg">總計: ${expenses.reduce((sum, e) => sum + Number(e.amount), 0).toLocaleString()}</span>
                </div>
            </div>
        </div>
    );
};

// --- Main Component: StatsView ---
const StatsView = ({
    isDark,
    monthlyTotal,
    yearlyTotal,
    monthlyIncome,
    yearlyIncome,
    budgets,
    monthlyExpenses = [],
    yearlyExpenses = [],
    categories = [],
    currentYear,
    currentMonth,
    currentDate,
    onPrevMonth,
    onNextMonth,
    onDateChange,
}) => {
    // State for Time Range (Monthly / Yearly)
    const [viewMode, setViewMode] = useState('monthly');
    // State for Type (Expense / Income)
    const [viewType, setViewType] = useState('expense'); // 'expense' | 'income'

    const [selectedCategory, setSelectedCategory] = useState(null);

    const chartContainerRef = useRef(null);
    const [chartSize, setChartSize] = useState({ width: 0, height: 0 });

    useEffect(() => {
        const observeTarget = chartContainerRef.current;
        if (!observeTarget) return;

        const resizeObserver = new ResizeObserver((entries) => {
            for (let entry of entries) {
                const { width, height } = entry.contentRect;
                if (width > 0 && height > 0) {
                    setChartSize({ width, height });
                }
            }
        });

        resizeObserver.observe(observeTarget);
        return () => resizeObserver.disconnect();
    }, []);

    const processStatsData = (expensesList, budgetLimits, timeScale) => {
        const stats = {};
        const safeExpenses = Array.isArray(expensesList) ? expensesList : [];

        const filteredList = safeExpenses.filter((e) => {
            if (viewType === 'income') return e.type === 'income';
            return e.type === 'expense' || !e.type;
        });

        filteredList.forEach((e) => {
            const catName = e.category ? e.category.trim() : '未分類';
            stats[catName] = (stats[catName] || 0) + Number(e.amount);
        });

        const limits = budgetLimits || [];

        return Object.keys(stats)
            .map((cat) => {
                const limitObj = limits.find((l) => l.name === cat);
                const limit = viewType === 'expense' && limitObj && limitObj[timeScale] > 0 ? limitObj[timeScale] : 0;

                return {
                    name: cat,
                    value: stats[cat],
                    limit: limit,
                };
            })
            .sort((a, b) => b.value - a.value);
    };

    const monthlyStats = useMemo(() => processStatsData(monthlyExpenses, budgets?.categoryLimits, 'monthly'), [monthlyExpenses, budgets, viewType]);
    const yearlyStats = useMemo(() => processStatsData(yearlyExpenses, budgets?.categoryLimits, 'yearly'), [yearlyExpenses, budgets, viewType]);

    const currentStats = viewMode === 'monthly' ? monthlyStats : yearlyStats;

    const currentTotalExpense = viewMode === 'monthly' ? monthlyTotal : yearlyTotal;
    const currentTotalIncome = viewMode === 'monthly' ? monthlyIncome : yearlyIncome;
    const currentTotal = viewType === 'income' ? currentTotalIncome : currentTotalExpense;

    const currentBudget = viewMode === 'monthly' ? budgets.monthly || 0 : budgets.yearly || 0;

    const currentRawExpenses = viewMode === 'monthly' ? monthlyExpenses : yearlyExpenses;

    const titlePrefix = viewMode === 'monthly' ? `${currentYear}年 ${currentMonth + 1}月` : `${currentYear} 年度`;

    const detailExpenses = useMemo(() => {
        if (!selectedCategory) return [];
        const sourceData = Array.isArray(currentRawExpenses) ? currentRawExpenses : [];
        return sourceData
            .filter((e) => {
                const typeMatch = viewType === 'income' ? e.type === 'income' : e.type === 'expense' || !e.type;
                const cat = e.category ? e.category.trim() : '未分類';
                return typeMatch && cat === selectedCategory;
            })
            .sort((a, b) => new Date(a.date) - new Date(b.date));
    }, [selectedCategory, currentRawExpenses, viewType]);

    return (
        <div className="h-full flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-300 overflow-hidden">
            {/* Fixed Header Section */}
            <div className="flex-none flex flex-col gap-4 shrink-0">
                <MonthSelector
                    currentDate={currentDate}
                    onPrevMonth={onPrevMonth}
                    onNextMonth={onNextMonth}
                    onDateChange={onDateChange}
                    isDark={isDark}
                />

                {/* control panel */}
                <div className={`p-2 rounded-lg flex flex-col gap-2 ${isDark ? 'bg-slate-800' : 'bg-gray-200'}`}>
                    {/* year/month */}
                    <div className={`flex rounded p-1 ${isDark ? 'bg-slate-700/50' : 'bg-white/50'}`}>
                        {['monthly', 'yearly'].map((mode) => (
                            <button
                                key={mode}
                                onClick={() => setViewMode(mode)}
                                className={`flex-1 py-1.5 text-sm font-medium rounded transition-all ${viewMode === mode
                                    ? `shadow-sm ${isDark ? 'bg-slate-600 text-blue-300' : 'bg-white text-blue-600'}`
                                    : `hover:text-gray-700 ${isDark ? 'text-gray-400' : 'text-gray-500'}`
                                    }`}
                            >
                                {mode === 'monthly' ? '月統計' : '年統計'}
                            </button>
                        ))}
                    </div>

                    {/* expense / income */}
                    <div className="flex gap-2">
                        <button
                            onClick={() => setViewType('expense')}
                            className={`flex-1 py-1.5 rounded border text-sm font-bold flex items-center justify-center gap-2 transition-all ${viewType === 'expense'
                                ? `border-red-500 ${isDark ? 'bg-red-900/20 text-red-400' : 'bg-red-50 text-red-600'}`
                                : `border-transparent ${isDark ? 'bg-slate-700/50 text-slate-400' : 'bg-gray-50 text-gray-500'}`
                                }`}
                        >
                            <TrendingDown className="w-4 h-4" /> 支出
                        </button>
                        <button
                            onClick={() => setViewType('income')}
                            className={`flex-1 py-1.5 rounded border text-sm font-bold flex items-center justify-center gap-2 transition-all ${viewType === 'income'
                                ? `border-green-500 ${isDark ? 'bg-green-900/20 text-green-400' : 'bg-green-50 text-green-600'}`
                                : `border-transparent ${isDark ? 'bg-slate-700/50 text-slate-400' : 'bg-gray-50 text-gray-500'}`
                                }`}
                        >
                            <TrendingUp className="w-4 h-4" /> 收入
                        </button>
                    </div>
                </div>
            </div>

            {/* Scrollable Content Section */}
            <div className="flex-1 overflow-y-auto space-y-4 min-h-0 pb-32 custom-scrollbar">
                {/* Overview Donut Charts */}
                <div className="grid grid-cols-1 gap-4">
                    <BudgetDonut
                        title={`${titlePrefix} ${viewType === 'expense' ? '總預算概覽' : '總收入概覽'}`}
                        spent={currentTotal}
                        budget={currentBudget}
                        isDark={isDark}
                        isIncomeMode={viewType === 'income'}
                    />
                </div>

                {/* Category List*/}
                <div className={`p-6 rounded-xl shadow-sm ${isDark ? 'bg-slate-800' : 'bg-white'}`}>
                    <h3 className={`font-bold mb-6 flex items-center gap-2 ${isDark ? 'text-slate-200' : 'text-gray-800'}`}>
                        {titlePrefix} {viewType === 'expense' ? '分類花費列表' : '收入來源列表'}
                        <span className="text-xs font-normal text-gray-500 ml-2">(點擊查看明細)</span>
                    </h3>

                    {currentStats.length > 0 ? (
                        <div className="space-y-2">
                            {currentStats.map((item, index) => (
                                <BudgetProgressBar
                                    key={item.name}
                                    label={item.name}
                                    current={item.value}
                                    total={item.limit}
                                    colorClass={COLORS[index % COLORS.length] ? `bg-[${COLORS[index % COLORS.length]}]` : 'bg-blue-500'}
                                    onClick={() => setSelectedCategory(item.name)}
                                    isIncomeMode={viewType === 'income'}
                                    isDark={isDark}
                                />
                            ))}
                        </div>
                    ) : (
                        <div className="h-40 flex items-center justify-center text-gray-400">
                            {titlePrefix} 尚無{viewType === 'expense' ? '支出' : '收入'}資料
                        </div>
                    )}
                </div>

                {/* 4. Distribution Pie Chart */}
                <div className={`p-6 rounded-xl shadow-sm ${isDark ? 'bg-slate-800' : 'bg-white'}`}>
                    <h3 className={`font-bold mb-4 ${isDark ? 'text-slate-200' : 'text-gray-800'}`}>
                        {titlePrefix} {viewType === 'expense' ? '花費比例分佈' : '收入比例分佈'}
                    </h3>

                    {/* Use ref for Observer to listen.
                        Only render PieChart when chartSize.width > 0.
                        This resolves initialization errors with ResponsiveContainer.
                    */}
                    <div ref={chartContainerRef} style={{ width: '100%', height: 300, minHeight: 300, position: 'relative' }}>
                        {chartSize.width > 0 ? (
                            <PieChart width={chartSize.width} height={chartSize.height}>
                                <Pie
                                    data={currentStats}
                                    cx="50%"
                                    cy="50%"
                                    outerRadius={80}
                                    fill="#8884d8"
                                    dataKey="value"
                                    onClick={(data) => setSelectedCategory(data.name)}
                                    cursor="pointer"
                                >
                                    {currentStats.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip formatter={(value) => `$${value.toLocaleString()}`} />
                            </PieChart>
                        ) : (
                            <div className="w-full h-full flex items-center justify-center">
                                <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Modal */}
            <CategoryDetailModal
                isOpen={!!selectedCategory}
                onClose={() => setSelectedCategory(null)}
                category={selectedCategory}
                expenses={detailExpenses}
                isDark={isDark}
                isIncomeMode={viewType === 'income'}
            />
        </div>
    );
};

export default StatsView;
