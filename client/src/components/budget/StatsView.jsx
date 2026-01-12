import React, { useState, useMemo, useEffect, useRef } from 'react';
import { PieChart, Pie, Cell, Tooltip } from 'recharts'; // 移除 ResponsiveContainer
import { X, Calendar, FileText, Loader2 } from 'lucide-react';
import MonthSelector from './MonthSelector';

// Chart Colors
const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#6366F1', '#14B8A6', '#64748B', '#84CC16', '#0EA5E9', '#D946EF'];

// --- Sub-component: Budget Progress Bar ---
const BudgetProgressBar = ({ label, current, total, colorClass = 'bg-blue-600', onClick }) => {
    const percentage = total > 0 ? Math.min(100, Math.max(0, (current / total) * 100)) : 0;

    const isOver = total > 0 && current > total;

    return (
        <div className="mb-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-700/50 p-2 rounded-lg transition-colors group" onClick={onClick}>
            <div className="flex justify-between text-sm mb-1 pointer-events-none">
                <span className="font-medium truncate pr-2 flex items-center gap-2">
                    {label}
                    <span className="opacity-0 group-hover:opacity-100 transition-opacity text-xs text-blue-500 bg-blue-100 dark:bg-blue-900 px-1.5 py-0.5 rounded-full">
                        查看詳情
                    </span>
                </span>
                <span className={isOver ? 'text-red-500 font-bold' : 'text-gray-500 dark:text-gray-400'}>
                    ${current.toLocaleString()}
                    {total > 0 && (
                        <>
                            {' '}
                            / <span className="text-xs text-gray-400">${total.toLocaleString()}</span>
                        </>
                    )}
                </span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-2.5 overflow-hidden pointer-events-none">
                {total > 0 ? (
                    <div
                        className={`h-2.5 rounded-full transition-all duration-500 ${isOver ? 'bg-red-500' : colorClass}`}
                        style={{ width: `${percentage}%` }}
                    ></div>
                ) : (
                    <div className="h-2.5 rounded-full bg-gray-400/30 w-full"></div>
                )}
            </div>
        </div>
    );
};

// --- Sub-component: Donut Chart (Fixed size, no ResponsiveContainer) ---
const BudgetDonut = ({ title, spent, budget, isDark }) => {
    const safeBudget = budget || 0;
    const remaining = Math.max(0, safeBudget - spent);

    const data = [
        { name: '已花費', value: spent },
        { name: '剩餘', value: remaining },
    ];

    const chartColors = safeBudget > 0 && spent > safeBudget ? ['#EF4444', '#EF4444'] : ['#3B82F6', isDark ? '#374151' : '#E5E7EB'];

    if (safeBudget === 0) {
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
                        paddingAngle={safeBudget > 0 ? 5 : 0}
                        dataKey="value"
                        startAngle={90}
                        endAngle={-270}
                        stroke="none"
                        isAnimationActive={false}
                    >
                        {data.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={chartColors[index]} />
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
                    <span className="text-xs text-gray-500">{safeBudget > 0 ? '總預算' : '無預算上限'}</span>
                    <span className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                        {safeBudget > 0 ? `$${safeBudget.toLocaleString()}` : '∞'}
                    </span>
                </div>
            </div>

            <div className="mt-2 text-center">
                <p className={`text-sm ${safeBudget > 0 && spent > safeBudget ? 'text-red-500 font-bold' : 'text-gray-500'}`}>
                    已用: ${spent.toLocaleString()}
                    {safeBudget > 0 && ` (${Math.round((spent / safeBudget) * 100)}%)`}
                </p>
            </div>
        </div>
    );
};

// --- Sub-component: Category Detail Modal ---
const CategoryDetailModal = ({ isOpen, onClose, category, expenses, isDark }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div
                className={`w-full max-w-md rounded-xl shadow-2xl max-h-[80vh] flex flex-col ${isDark ? 'bg-slate-800 text-slate-100' : 'bg-white text-gray-800'}`}
            >
                <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-slate-700">
                    <h3 className="font-bold text-lg flex items-center gap-2">
                        <FileText className="w-5 h-5 text-blue-500" />
                        {category} - 支出明細
                    </h3>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors">
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
                                    <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-0.5">
                                        <Calendar className="w-3 h-3" />
                                        {expense.date}
                                    </div>
                                    <span className="font-medium">{expense.note || '無備註'}</span>
                                </div>
                                <span className="font-bold text-lg text-blue-600 dark:text-blue-400">${Number(expense.amount).toLocaleString()}</span>
                            </div>
                        ))
                    ) : (
                        <p className="text-center text-gray-500 py-8">無支出紀錄</p>
                    )}
                </div>

                <div className="p-4 border-t border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900/50 rounded-b-xl flex justify-between items-center">
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
    const [viewMode, setViewMode] = useState('monthly');
    const [selectedCategory, setSelectedCategory] = useState(null);

    // Don't use ResponsiveContainer, use logic to measure div size
    const chartContainerRef = useRef(null);
    const [chartSize, setChartSize] = useState({ width: 0, height: 0 });

    useEffect(() => {
        const observeTarget = chartContainerRef.current;
        if (!observeTarget) return;

        const resizeObserver = new ResizeObserver((entries) => {
            // Update chartSize when container size changes
            for (let entry of entries) {
                const { width, height } = entry.contentRect;
                // Only update if width > 0 to avoid -1 or 0 errors
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

        safeExpenses.forEach((e) => {
            const catName = e.category ? e.category.trim() : '未分類';
            stats[catName] = (stats[catName] || 0) + Number(e.amount);
        });

        const limits = budgetLimits || [];

        return Object.keys(stats)
            .map((cat) => {
                const limitObj = limits.find((l) => l.name === cat);
                const limit = limitObj && limitObj[timeScale] > 0 ? limitObj[timeScale] : 0;

                return {
                    name: cat,
                    value: stats[cat],
                    limit: limit,
                };
            })
            .sort((a, b) => b.value - a.value);
    };

    const monthlyStats = useMemo(() => processStatsData(monthlyExpenses, budgets?.categoryLimits, 'monthly'), [monthlyExpenses, budgets]);

    const yearlyStats = useMemo(() => processStatsData(yearlyExpenses, budgets?.categoryLimits, 'yearly'), [yearlyExpenses, budgets]);

    const currentStats = viewMode === 'monthly' ? monthlyStats : yearlyStats;
    const currentTotal = viewMode === 'monthly' ? monthlyTotal : yearlyTotal;
    const currentBudget = viewMode === 'monthly' ? budgets.monthly || 0 : budgets.yearly || 0;
    const currentRawExpenses = viewMode === 'monthly' ? monthlyExpenses : yearlyExpenses;

    const titlePrefix = viewMode === 'monthly' ? `${currentYear}年 ${currentMonth + 1}月` : `${currentYear} 年度`;

    const detailExpenses = useMemo(() => {
        if (!selectedCategory) return [];
        const sourceData = Array.isArray(currentRawExpenses) ? currentRawExpenses : [];
        return sourceData
            .filter((e) => {
                const cat = e.category ? e.category.trim() : '未分類';
                return cat === selectedCategory;
            })
            .sort((a, b) => new Date(a.date) - new Date(b.date));
    }, [selectedCategory, currentRawExpenses]);

    return (
        <div className="space-y-6 animate-in fade-in zoom-in-95 duration-300">
            {/* 1. Header */}
            <div className="flex flex-col gap-4">
                <MonthSelector
                    currentDate={currentDate}
                    onPrevMonth={onPrevMonth}
                    onNextMonth={onNextMonth}
                    onDateChange={onDateChange}
                    isDark={isDark}
                />

                <div className={`flex p-1 rounded-lg ${isDark ? 'bg-slate-800' : 'bg-gray-200'} self-center`}>
                    {['monthly', 'yearly'].map((mode) => (
                        <button
                            key={mode}
                            onClick={() => setViewMode(mode)}
                            className={`px-6 py-1.5 rounded-md text-sm font-medium transition-all ${
                                viewMode === mode
                                    ? 'bg-white text-blue-600 shadow-sm dark:bg-slate-600 dark:text-blue-300'
                                    : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'
                            }`}
                        >
                            {mode === 'monthly' ? '月統計' : '年統計'}
                        </button>
                    ))}
                </div>
            </div>

            {/* 2. Overview Donut Charts */}
            <div className="grid grid-cols-1 gap-4">
                <BudgetDonut title={`${titlePrefix} 總預算概覽`} spent={currentTotal} budget={currentBudget} isDark={isDark} />
            </div>

            {/* 3. Category List */}
            <div className={`p-6 rounded-xl shadow-sm ${isDark ? 'bg-slate-800' : 'bg-white'}`}>
                <h3 className={`font-bold mb-6 flex items-center gap-2 ${isDark ? 'text-slate-200' : 'text-gray-800'}`}>
                    {titlePrefix} 分類花費列表
                    <span className="text-xs font-normal text-gray-500 ml-2">(點擊分類查看明細)</span>
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
                            />
                        ))}
                    </div>
                ) : (
                    <div className="h-40 flex items-center justify-center text-gray-400">{titlePrefix} 尚無支出資料</div>
                )}
            </div>

            {/* 4. Distribution Pie Chart */}
            <div className={`p-6 rounded-xl shadow-sm ${isDark ? 'bg-slate-800' : 'bg-white'}`}>
                <h3 className={`font-bold mb-4 ${isDark ? 'text-slate-200' : 'text-gray-800'}`}>{titlePrefix} 花費比例分佈</h3>

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
                                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
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
                        // Loading state
                        <div className="w-full h-full flex items-center justify-center">
                            <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
                        </div>
                    )}
                </div>
            </div>

            {/* Modal */}
            <CategoryDetailModal
                isOpen={!!selectedCategory}
                onClose={() => setSelectedCategory(null)}
                category={selectedCategory}
                expenses={detailExpenses}
                isDark={isDark}
            />
        </div>
    );
};

export default StatsView;
