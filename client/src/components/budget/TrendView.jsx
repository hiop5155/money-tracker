import React, { useMemo, useState, useEffect, useRef } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { TrendingUp, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';

const TrendView = ({ expenses = [], isDark }) => {
    // State for Filter
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [period, setPeriod] = useState('ALL'); // 'ALL', 'H1', 'H2'

    // Chart resize logic
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

    // Robust data processing
    const data = useMemo(() => {
        if (!Array.isArray(expenses)) return [];

        // 1. Determine month range based on period
        let startMonth = 0; // 0-indexed (Jan)
        let endMonth = 11; // 0-indexed (Dec)

        if (period === 'H1') {
            endMonth = 5; // Jan - Jun
        } else if (period === 'H2') {
            startMonth = 6; // Jul - Dec
        }

        // 2. Initialize groups for the selected range
        const groups = {};
        const keys = [];

        for (let m = startMonth; m <= endMonth; m++) {
            // Format YYYY-MM
            const k = `${selectedYear}-${String(m + 1).padStart(2, '0')}`;
            keys.push(k);
            groups[k] = { name: k, income: 0, expense: 0, balance: 0 };
        }

        // 3. Aggregate Data
        expenses.forEach((e) => {
            if (!e || !e.date) return;

            // Check if expense falls in selected YYYY
            const eDate = new Date(e.date);
            if (eDate.getFullYear() !== selectedYear) return;

            // Check if month falls in selected period
            const month = eDate.getMonth();
            if (month < startMonth || month > endMonth) return;

            // Format key matches our groups
            // Note: Use local string construction to avoid timezone shifts if e.date is UTC string
            // Assuming e.date is YYYY-MM-DD string, simple substring is safest
            let dateStr = String(e.date);
            if (dateStr.length >= 7) {
                const monthKey = dateStr.substring(0, 7);
                if (groups[monthKey]) {
                    const amt = Number(e.amount) || 0;
                    if (e.type === 'income') {
                        groups[monthKey].income += amt;
                        groups[monthKey].balance += amt;
                    } else {
                        groups[monthKey].expense += amt;
                        groups[monthKey].balance -= amt;
                    }
                }
            }
        });

        return keys.map((key) => ({
            name: key, // Can refine display name here if needed (e.g., "Jan")
            ...groups[key],
        }));
    }, [expenses, selectedYear, period]);

    // Calculate Totals safely
    const totals = useMemo(() => {
        return data.reduce(
            (acc, curr) => ({
                income: acc.income + (curr.income || 0),
                expense: acc.expense + (curr.expense || 0),
                balance: acc.balance + (curr.balance || 0),
            }),
            { income: 0, expense: 0, balance: 0 }
        );
    }, [data]);

    const monthCount = data.length > 0 ? data.length : 1;
    const avg = {
        income: Math.round(totals.income / monthCount),
        expense: Math.round(totals.expense / monthCount),
    };

    return (
        <div className="h-full flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-300 overflow-hidden">
            {/* Controls Header (Fixed) */}
            <div
                className={`flex-none p-4 rounded-xl shadow-sm flex flex-col md:flex-row justify-between items-center gap-4 shrink-0 ${isDark ? 'bg-slate-800' : 'bg-white'}`}
            >
                {/* Title & Icon */}
                <div className="flex items-center gap-2 self-start md:self-center">
                    <div className={`p-2 rounded-lg ${isDark ? 'bg-slate-700/50 text-blue-400' : 'bg-blue-50 text-blue-600'}`}>
                        <TrendingUp className="w-6 h-6" />
                    </div>
                    <div>
                        <h2 className={`font-bold text-lg ${isDark ? 'text-slate-100' : 'text-gray-800'}`}>收支趨勢</h2>
                        <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                            {selectedYear}年 {period === 'ALL' ? '全年度' : period === 'H1' ? '上半年' : '下半年'}
                        </p>
                    </div>
                </div>

                {/* Filters Group */}
                <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
                    {/* Period Tabs */}
                    <div className="flex bg-gray-100 dark:bg-slate-700 p-1 rounded-lg w-full sm:w-auto">
                        {[
                            { id: 'H1', label: '上半年' },
                            { id: 'H2', label: '下半年' },
                            { id: 'ALL', label: '全年度' },
                        ].map((p) => (
                            <button
                                key={p.id}
                                onClick={() => setPeriod(p.id)}
                                className={`flex-1 sm:flex-none px-4 py-1.5 text-sm font-medium rounded-md transition-all whitespace-nowrap ${period === p.id
                                    ? 'bg-white text-blue-600 shadow-sm dark:bg-slate-600 dark:text-blue-300'
                                    : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'
                                    }`}
                            >
                                {p.label}
                            </button>
                        ))}
                    </div>

                    {/* Year Navigation */}
                    <div className="flex items-center bg-gray-100 dark:bg-slate-700 p-1 rounded-lg">
                        <button
                            onClick={() => setSelectedYear((prev) => prev - 1)}
                            className="p-1.5 hover:bg-white dark:hover:bg-slate-600 rounded-md transition-colors text-gray-500 dark:text-slate-400"
                        >
                            <ChevronLeft className="w-5 h-5" />
                        </button>
                        <span className={`px-4 font-mono font-bold ${isDark ? 'text-slate-200' : 'text-gray-700'}`}>{selectedYear}</span>
                        <button
                            onClick={() => setSelectedYear((prev) => prev + 1)}
                            className="p-1.5 hover:bg-white dark:hover:bg-slate-600 rounded-md transition-colors text-gray-500 dark:text-slate-400"
                        >
                            <ChevronRight className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Scrollable Body */}
            <div className="flex-1 overflow-y-auto min-h-0 space-y-4 pb-2 custom-scrollbar">
                {/* Main Chart */}
                <div className={`p-6 rounded-xl shadow-sm ${isDark ? 'bg-slate-800' : 'bg-white'}`}>
                    <div className="mb-6 flex items-center justify-between">
                        <h3 className={`font-bold ${isDark ? 'text-slate-200' : 'text-gray-800'}`}>月收支對比</h3>
                        <div className="flex gap-4 text-sm">
                            <span className="flex items-center gap-1.5">
                                <span className="w-3 h-3 rounded-full bg-emerald-500"></span>
                                <span className={isDark ? 'text-slate-300' : 'text-gray-600'}>收入</span>
                            </span>
                            <span className="flex items-center gap-1.5">
                                <span className="w-3 h-3 rounded-full bg-red-500"></span>
                                <span className={isDark ? 'text-slate-300' : 'text-gray-600'}>支出</span>
                            </span>
                        </div>
                    </div>

                    {/* Manual ResizeObserver Pattern */}
                    <div ref={chartContainerRef} className="w-full h-[300px] min-h-[300px] relative">
                        {chartSize.width > 0 ? (
                            <BarChart width={chartSize.width} height={chartSize.height} data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? '#334155' : '#e5e7eb'} />
                                <XAxis
                                    dataKey="name"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: isDark ? '#94a3b8' : '#64748b', fontSize: 12 }}
                                    dy={10}
                                    tickFormatter={(val) => {
                                        // Show simplified month name or number if needed, current key is YYYY-MM
                                        return val.split('-')[1]; // Just show '01', '02' etc.
                                    }}
                                />
                                <YAxis
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: isDark ? '#94a3b8' : '#64748b', fontSize: 12 }}
                                    tickFormatter={(value) => `$${value / 1000}k`}
                                />
                                <Tooltip
                                    cursor={{ fill: isDark ? '#334155' : '#f3f4f6', opacity: 0.4 }}
                                    contentStyle={{
                                        backgroundColor: isDark ? '#1e293b' : '#fff',
                                        borderRadius: '8px',
                                        border: 'none',
                                        boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                                        color: isDark ? '#f8fafc' : '#0f172a',
                                    }}
                                    formatter={(value) => `$${value.toLocaleString()}`}
                                />
                                <Bar dataKey="income" name="收入" fill="#10B981" radius={[4, 4, 0, 0]} maxBarSize={50} />
                                <Bar dataKey="expense" name="支出" fill="#EF4444" radius={[4, 4, 0, 0]} maxBarSize={50} />
                            </BarChart>
                        ) : (
                            <div className="w-full h-full flex items-center justify-center">
                                <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
                            </div>
                        )}
                    </div>
                </div>

                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className={`p-5 rounded-xl shadow-sm ${isDark ? 'bg-slate-800' : 'bg-white'}`}>
                        <div className="text-sm text-gray-500 mb-1">期間總結餘</div>
                        <div className={`text-2xl font-bold ${totals.balance >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                            {totals.balance >= 0 ? '+' : ''}${totals.balance.toLocaleString()}
                        </div>
                    </div>
                    <div className={`p-5 rounded-xl shadow-sm ${isDark ? 'bg-slate-800' : 'bg-white'}`}>
                        <div className="text-sm text-gray-500 mb-1">月平均總收入</div>
                        <div className="text-2xl font-bold text-emerald-500">${avg.income.toLocaleString()}</div>
                    </div>
                    <div className={`p-5 rounded-xl shadow-sm ${isDark ? 'bg-slate-800' : 'bg-white'}`}>
                        <div className="text-sm text-gray-500 mb-1">月平均總支出</div>
                        <div className="text-2xl font-bold text-red-500">${avg.expense.toLocaleString()}</div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TrendView;
