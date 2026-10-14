import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import CalendarView from '../components/budget/CalendarView';
import SettingsView from '../components/budget/SettingsView';

const mockExtremeExpenses = [
    {
        id: '1',
        category: '超長分類名稱測試用防爆版食品與高級餐飲',
        amount: 125000000,
        type: 'expense',
        date: '2026-10-13',
        note: 'https://example.com/very/long/unbroken/url/path/that/used/to/break/flexbox/layouts/without/min-w-0?query=extremely_long_string_without_spaces_1234567890_abcdefghijklmnopqrstuvwxyz'
    },
    {
        id: '2',
        category: '薪資收入',
        amount: 88888888,
        type: 'income',
        date: '2026-10-13',
        note: '極端大額收入千分位展示測試'
    },
    {
        id: '3',
        category: '微型日常',
        amount: 35,
        type: 'expense',
        date: '2026-10-13',
        note: '一般日常茶葉蛋'
    }
];

const mockBudgets = {
    monthly: 50000,
    yearly: 600000,
    categoryLimits: [
        { name: '早餐', monthly: 2000, yearly: 24000 },
        { name: '午餐', monthly: 2500, yearly: '' },
        { name: '玩！', monthly: '', yearly: 123456 },
        { name: '居住', monthly: 20000, yearly: 240000 },
        { name: '保險', monthly: '', yearly: '' }
    ]
};

const DevPreview = ({ isDarkMode: parentDarkMode, toggleTheme }) => {
    const [searchParams] = useSearchParams();
    const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'settings');
    const [testEmptyState, setTestEmptyState] = useState(searchParams.get('empty') === 'true');
    const [isDarkMode, setIsDarkMode] = useState(searchParams.get('dark') === 'true' || parentDarkMode);

    return (
        <div className={`min-h-screen ${isDarkMode ? 'bg-slate-900 text-slate-100' : 'bg-gray-100 text-gray-800'}`}>
            {/* Top Toolbar */}
            <div className="p-2.5 bg-blue-600 text-white flex items-center justify-between text-xs font-semibold shadow-md overflow-x-auto custom-scrollbar">
                <div className="flex items-center gap-2 shrink-0">
                    <span className="bg-white/20 px-2 py-1 rounded hidden sm:inline-block shrink-0">DEV PREVIEW</span>
                    <button
                        onClick={() => setActiveTab('settings')}
                        className={`px-2.5 py-1 rounded transition-colors shrink-0 whitespace-nowrap ${activeTab === 'settings' ? 'bg-white text-blue-700 font-bold' : 'hover:bg-white/10'}`}
                    >
                        設定頁面 (SettingsView)
                    </button>
                    <button
                        onClick={() => setActiveTab('calendar')}
                        className={`px-2.5 py-1 rounded transition-colors shrink-0 whitespace-nowrap ${activeTab === 'calendar' ? 'bg-white text-blue-700 font-bold' : 'hover:bg-white/10'}`}
                    >
                        記帳極端測試 (CalendarView)
                    </button>
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-3">
                    {activeTab === 'calendar' && (
                        <button
                            onClick={() => setTestEmptyState(!testEmptyState)}
                            className="bg-white/20 hover:bg-white/30 px-2 py-1 rounded transition-colors shrink-0 whitespace-nowrap"
                        >
                            {testEmptyState ? '極端數據' : '空狀態'}
                        </button>
                    )}
                    <button onClick={toggleTheme} className="bg-white/20 hover:bg-white/30 px-2 py-1 rounded transition-colors shrink-0 whitespace-nowrap">
                        {isDarkMode ? '🌙 深色' : '☀️ 淺色'}
                    </button>
                </div>
            </div>

            {/* Container */}
            <div className="max-w-4xl mx-auto p-4 h-[calc(100vh-50px)]">
                {activeTab === 'calendar' && (
                    <CalendarView
                        isDark={isDarkMode}
                        currentDate={new Date(2026, 9, 13)}
                        selectedDate={new Date(2026, 9, 13)}
                        monthlyExpenses={mockExtremeExpenses}
                        selectedDateExpenses={testEmptyState ? [] : mockExtremeExpenses}
                        monthlyTotal={125000035}
                        yearlyTotal={125000035}
                        monthlyIncome={88888888}
                        yearlyIncome={88888888}
                        budgets={mockBudgets}
                        expenses={mockExtremeExpenses}
                        categories={['超長分類名稱測試用防爆版食品與高級餐飲', '薪資收入', '微型日常']}
                        onPrevMonth={() => { }}
                        onNextMonth={() => { }}
                        onDateChange={() => { }}
                        onDateClick={() => { }}
                        onAddExpense={() => { }}
                        onEditExpense={() => { }}
                        onDeleteExpense={() => { }}
                        deletingId={null}
                    />
                )}
                {activeTab === 'settings' && (
                    <SettingsView
                        isDark={isDarkMode}
                        budgets={mockBudgets}
                        categories={['早餐', '午餐', '玩！', '居住', '保險']}
                        onUpdateBudget={() => { }}
                        onAddCategory={() => { }}
                        onDeleteCategory={() => { }}
                        onExport={() => { }}
                        onImport={() => { }}
                        onLogout={() => { }}
                        onDeleteAccount={() => { }}
                    />
                )}
            </div>
        </div>
    );
};

export default DevPreview;
