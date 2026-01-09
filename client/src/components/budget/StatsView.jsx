import React, { useMemo, useState } from 'react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { X } from 'lucide-react';
import MonthSelector from './MonthSelector';

const formatCurrency = (amount) => new Intl.NumberFormat('zh-TW', { style: 'currency', currency: 'TWD', maximumFractionDigits: 0 }).format(amount);
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658', '#8dd1e1'];

const StatsView = ({
    isDark,
    monthlyTotal,
    yearlyTotal,
    budgets,
    monthlyExpenses,
    currentYear,
    currentMonth,
    currentDate,
    onPrevMonth,
    onNextMonth,
    onDateChange,
}) => {
    const [selectedCategoryStats, setSelectedCategoryStats] = useState(null);

    const categoryData = useMemo(() => {
        const data = {};
        monthlyExpenses.forEach((e) => {
            if (!data[e.category]) data[e.category] = 0;
            data[e.category] += Number(e.amount);
        });
        return Object.keys(data).map((key) => ({ name: key, value: data[key] }));
    }, [monthlyExpenses]);

    const categoryDrillDownList = useMemo(() => {
        if (!selectedCategoryStats) return [];
        return monthlyExpenses.filter((e) => e.category === selectedCategoryStats).sort((a, b) => new Date(b.date) - new Date(a.date));
    }, [monthlyExpenses, selectedCategoryStats]);

    const dailyData = useMemo(() => {
        // Guard clause: Ensure currentYear/Month have values
        if (!currentYear || currentMonth === undefined) return [];
        const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
        const data = [];
        for (let i = 1; i <= daysInMonth; i++) {
            const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
            const amount = monthlyExpenses.filter((e) => e.date === dateStr).reduce((sum, e) => sum + Number(e.amount), 0);
            data.push({ name: `${i}日`, amount });
        }
        return data;
    }, [monthlyExpenses, currentYear, currentMonth]);

    return (
        <div className="space-y-6">
            {/* Month Selector */}
            <div className={`rounded-xl shadow-sm overflow-hidden ${isDark ? 'bg-slate-800' : 'bg-white'}`}>
                <MonthSelector
                    currentDate={currentDate}
                    onPrevMonth={onPrevMonth}
                    onNextMonth={onNextMonth}
                    onDateChange={onDateChange}
                    isDark={isDark}
                />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className={`p-6 rounded-xl shadow-sm ${isDark ? 'bg-slate-800' : 'bg-white'}`}>
                    <h3 className={`text-sm font-medium mb-1 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>本月狀況</h3>
                    <div className="flex justify-between items-end mb-2">
                        <span className={`text-3xl font-bold ${isDark ? 'text-slate-100' : 'text-gray-800'}`}>{formatCurrency(monthlyTotal)}</span>
                        <span className={`text-sm ${isDark ? 'text-slate-500' : 'text-gray-500'}`}>/ {formatCurrency(budgets.monthly)}</span>
                    </div>
                    <div className={`w-full rounded-full h-2.5 ${isDark ? 'bg-slate-700' : 'bg-gray-200'}`}>
                        <div
                            className={`h-2.5 rounded-full ${monthlyTotal > budgets.monthly ? 'bg-red-500' : 'bg-blue-500'}`}
                            style={{ width: `${Math.min((monthlyTotal / budgets.monthly) * 100, 100)}%` }}
                        ></div>
                    </div>
                </div>
                <div className={`p-6 rounded-xl shadow-sm ${isDark ? 'bg-slate-800' : 'bg-white'}`}>
                    <h3 className={`text-sm font-medium mb-1 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>年度狀況</h3>
                    <div className="flex justify-between items-end mb-2">
                        <span className={`text-3xl font-bold ${isDark ? 'text-slate-100' : 'text-gray-800'}`}>{formatCurrency(yearlyTotal)}</span>
                        <span className={`text-sm ${isDark ? 'text-slate-500' : 'text-gray-500'}`}>/ {formatCurrency(budgets.yearly)}</span>
                    </div>
                    <div className={`w-full rounded-full h-2.5 ${isDark ? 'bg-slate-700' : 'bg-gray-200'}`}>
                        <div
                            className={`h-2.5 rounded-full ${yearlyTotal > budgets.yearly ? 'bg-red-500' : 'bg-green-500'}`}
                            style={{ width: `${Math.min((yearlyTotal / budgets.yearly) * 100, 100)}%` }}
                        ></div>
                    </div>
                </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className={`p-6 rounded-xl shadow-sm flex flex-col items-center ${isDark ? 'bg-slate-800' : 'bg-white'}`}>
                    <h3 className={`font-bold mb-4 self-start ${isDark ? 'text-slate-200' : 'text-gray-700'}`}>分類統計 (本月)</h3>
                    {categoryData.length > 0 ? (
                        <>
                            <ResponsiveContainer width="100%" height={250}>
                                <PieChart>
                                    <Pie
                                        data={categoryData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={80}
                                        fill="#8884d8"
                                        paddingAngle={5}
                                        dataKey="value"
                                        onClick={(data) => setSelectedCategoryStats(data.name)}
                                        cursor="pointer"
                                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                    >
                                        {categoryData.map((entry, index) => (
                                            <Cell
                                                key={`cell-${index}`}
                                                fill={COLORS[index % COLORS.length]}
                                                stroke={selectedCategoryStats === entry.name ? '#fff' : 'none'}
                                                strokeWidth={2}
                                                opacity={selectedCategoryStats && selectedCategoryStats !== entry.name ? 0.3 : 1}
                                            />
                                        ))}
                                    </Pie>
                                    <Tooltip formatter={(value) => formatCurrency(value)} />
                                </PieChart>
                            </ResponsiveContainer>
                            {selectedCategoryStats && (
                                <div
                                    className={`w-full mt-4 p-3 rounded-lg border animate-in fade-in slide-in-from-top-2 ${isDark ? 'bg-slate-700/50 border-slate-600' : 'bg-gray-50 border-gray-100'}`}
                                >
                                    <div className="flex justify-between items-center mb-2 pb-2 border-b border-gray-200 dark:border-slate-600">
                                        <h4 className="font-bold">{selectedCategoryStats} 明細</h4>
                                        <button onClick={() => setSelectedCategoryStats(null)} className="text-gray-400 hover:text-gray-600">
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                    <div className="max-h-40 overflow-y-auto space-y-2">
                                        {categoryDrillDownList.map((item) => (
                                            <div key={item.id} className="flex justify-between text-sm">
                                                <span className="text-gray-500 dark:text-slate-400">{item.date.slice(5)}</span>
                                                <span className="truncate flex-1 mx-2">{item.note || '-'}</span>
                                                <span className="font-medium">${item.amount}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="h-64 flex items-center text-gray-400">尚無資料</div>
                    )}
                </div>
                <div className={`p-6 rounded-xl shadow-sm flex flex-col items-center ${isDark ? 'bg-slate-800' : 'bg-white'}`}>
                    <h3 className={`font-bold mb-4 self-start ${isDark ? 'text-slate-200' : 'text-gray-700'}`}>每日支出趨勢</h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={dailyData}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? '#334155' : '#e5e7eb'} />
                            <XAxis dataKey="name" tick={{ fontSize: 10, fill: isDark ? '#94a3b8' : '#666' }} interval={2} />
                            <YAxis tick={{ fontSize: 10, fill: isDark ? '#94a3b8' : '#666' }} />
                            <Tooltip
                                formatter={(value) => formatCurrency(value)}
                                contentStyle={{
                                    backgroundColor: isDark ? '#1e293b' : '#fff',
                                    borderColor: isDark ? '#334155' : '#ccc',
                                    color: isDark ? '#f1f5f9' : '#000',
                                }}
                            />
                            <Bar dataKey="amount" fill="#8884d8" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
};

export default StatsView;
