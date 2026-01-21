import React, { useMemo, useState, useEffect, useRef } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { TrendingUp, Loader2 } from 'lucide-react';

const TrendView = ({ expenses = [], isDark }) => {
    const [range, setRange] = useState(6); // 6 months or 12 months
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

        // 1. Helper to generate last N months keys
        const groups = {};
        const recentKeys = [];
        const today = new Date();

        for (let i = range - 1; i >= 0; i--) {
            // Safely handle month calculation
            const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
            const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            recentKeys.push(k);
            groups[k] = { name: k, income: 0, expense: 0, balance: 0 };
        }

        // 2. Aggregate Data
        expenses.forEach(e => {
            if (!e || !e.date) return;

            // Safe key extraction
            let dateStr = String(e.date);
            // Ensure format YYYY-MM
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

        return recentKeys.map(key => ({
            name: key,
            ...groups[key]
        }));
    }, [expenses, range]);

    // Calculate Totals safely
    const totals = useMemo(() => {
        return data.reduce((acc, curr) => ({
            income: acc.income + (curr.income || 0),
            expense: acc.expense + (curr.expense || 0),
            balance: acc.balance + (curr.balance || 0)
        }), { income: 0, expense: 0, balance: 0 });
    }, [data]);

    const safeRange = range > 0 ? range : 1;
    const avg = {
        income: Math.round(totals.income / safeRange),
        expense: Math.round(totals.expense / safeRange),
    };

    return (
        <div className="space-y-6 animate-in fade-in zoom-in-95 duration-300">

            {/* Controls */}
            <div className={`p-4 rounded-xl shadow-sm flex flex-col sm:flex-row justify-between items-center gap-4 ${isDark ? 'bg-slate-800' : 'bg-white'}`}>
                <div className="flex items-center gap-2">
                    <div className={`p-2 rounded-lg ${isDark ? 'bg-slate-700/50 text-blue-400' : 'bg-blue-50 text-blue-600'}`}>
                        <TrendingUp className="w-6 h-6" />
                    </div>
                    <div>
                        <h2 className={`font-bold text-lg ${isDark ? 'text-slate-100' : 'text-gray-800'}`}>收支趨勢</h2>
                        <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>過去 {range} 個月的財務變化</p>
                    </div>
                </div>

                <div className="flex bg-gray-100 dark:bg-slate-700 p-1 rounded-lg">
                    {[6, 12].map(r => (
                        <button
                            key={r}
                            onClick={() => setRange(r)}
                            className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${range === r
                                ? 'bg-white text-blue-600 shadow-sm dark:bg-slate-600 dark:text-blue-300'
                                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'
                                }`}
                        >
                            近 {r} 個月
                        </button>
                    ))}
                </div>
            </div>

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

                {/* Manual ResizeObserver Pattern (Similar to StatsView) */}
                <div ref={chartContainerRef} className="w-full h-[300px] min-h-[300px] relative">
                    {chartSize.width > 0 ? (
                        <BarChart
                            width={chartSize.width}
                            height={chartSize.height}
                            data={data}
                            margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                        >
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? '#334155' : '#e5e7eb'} />
                            <XAxis
                                dataKey="name"
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: isDark ? '#94a3b8' : '#64748b', fontSize: 12 }}
                                dy={10}
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
                                    color: isDark ? '#f8fafc' : '#0f172a'
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
                    <div className="text-2xl font-bold text-emerald-500">
                        ${avg.income.toLocaleString()}
                    </div>
                </div>
                <div className={`p-5 rounded-xl shadow-sm ${isDark ? 'bg-slate-800' : 'bg-white'}`}>
                    <div className="text-sm text-gray-500 mb-1">月平均總支出</div>
                    <div className="text-2xl font-bold text-red-500">
                        ${avg.expense.toLocaleString()}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TrendView;
