import React, { useState, useEffect } from 'react';
import { Calendar, PieChart as PieIcon, Settings, Wallet, Moon, Sun, Repeat, Loader2, Search, TrendingUp, AlertTriangle, Lightbulb, TrendingDown, X } from 'lucide-react';

// Hooks & Components
import { useBudgetData } from '../hooks/useBudgetData';
import LoadingOverlay from '../components/LoadingOverlay';
import { generateInsights } from '../utils/insightEngine';

// Views
import CalendarView from '../components/budget/CalendarView';
import StatsView from '../components/budget/StatsView';
import RecurringView from '../components/budget/RecurringView';
import SettingsView from '../components/budget/SettingsView';
import SearchView from '../components/budget/SearchView';
import TrendView from '../components/budget/TrendView.jsx';

// Modals
import ExpenseModal from '../components/budget/ExpenseModal';
import RecurringModal from '../components/budget/RecurringModal';

const BudgetApp = ({ token, onLogout, username }) => {
    const data = useBudgetData(token, onLogout);

    const [isDarkMode, setIsDarkMode] = useState(() => localStorage.getItem('theme') === 'dark');
    const [currentView, setCurrentView] = useState('calendar');

    const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
    const [editingExpense, setEditingExpense] = useState(null);

    const [isRecurringModalOpen, setIsRecurringModalOpen] = useState(false);
    const [editingRecurring, setEditingRecurring] = useState(null);

    // Smart Insight State
    const [currentInsight, setCurrentInsight] = useState(null);
    const [isInsightVisible, setIsInsightVisible] = useState(true);

    useEffect(() => {
        if (data.expenses.length > 0) {
            const insights = generateInsights(data.expenses, data.budgets, data.categories);
            if (insights.length > 0) {
                setCurrentInsight(insights[0]);
                setIsInsightVisible(true);
            } else {
                setCurrentInsight(null);
            }
        }
    }, [data.expenses, data.budgets, data.categories]);

    const insightStyles = {
        warning: {
            bg: isDarkMode ? 'bg-amber-900/30' : 'bg-amber-50',
            border: isDarkMode ? 'border-amber-700/50' : 'border-amber-200',
            text: isDarkMode ? 'text-amber-200' : 'text-amber-800',
            icon: AlertTriangle,
        },
        danger: {
            bg: isDarkMode ? 'bg-red-900/30' : 'bg-red-50',
            border: isDarkMode ? 'border-red-700/50' : 'border-red-200',
            text: isDarkMode ? 'text-red-200' : 'text-red-800',
            icon: TrendingUp,
        },
        success: {
            bg: isDarkMode ? 'bg-emerald-900/30' : 'bg-emerald-50',
            border: isDarkMode ? 'border-emerald-700/50' : 'border-emerald-200',
            text: isDarkMode ? 'text-emerald-200' : 'text-emerald-800',
            icon: Lightbulb,
        },
    };

    useEffect(() => {
        if (isDarkMode) {
            document.documentElement.classList.add('dark');
            localStorage.setItem('theme', 'dark');
        } else {
            document.documentElement.classList.remove('dark');
            localStorage.setItem('theme', 'light');
        }
    }, [isDarkMode]);

    // Handlers for Date Navigation
    const handlePrevMonth = () => {
        const newDate = new Date(data.currentYear, data.currentMonth - 1, 1);
        data.setCurrentDate(newDate);
        data.setSelectedDate(newDate);
    };
    const handleNextMonth = () => {
        const newDate = new Date(data.currentYear, data.currentMonth + 1, 1);
        data.setCurrentDate(newDate);
        data.setSelectedDate(newDate);
    };
    const handleDateChange = (newDate) => {
        data.setCurrentDate(newDate);
        data.setSelectedDate(newDate);
    };

    // Modal Wrappers
    const openAddExpense = () => {
        setEditingExpense(null);
        setIsExpenseModalOpen(true);
    };
    const openEditExpense = (item) => {
        setEditingExpense(item);
        setIsExpenseModalOpen(true);
    };
    const saveExpenseWrapper = async (formData) => {
        const success = await data.handleSaveExpense(formData, editingExpense?.id);
        if (success) setIsExpenseModalOpen(false);
    };

    const openAddRecurring = () => {
        setEditingRecurring(null);
        setIsRecurringModalOpen(true);
    };
    const openEditRecurring = (rule) => {
        setEditingRecurring(rule);
        setIsRecurringModalOpen(true);
    };
    const saveRecurringWrapper = async (formData) => {
        const success = await data.handleSaveRecurring(formData, editingRecurring?._id);
        if (success) setIsRecurringModalOpen(false);
    };

    if (data.isInitialLoading)
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-100 dark:bg-slate-900">
                <Loader2 className="w-10 h-10 animate-spin text-blue-500" />
            </div>
        );

    return (
        <>
            <LoadingOverlay isVisible={data.isApiLoading} />
            {/* Main App Container - Full Height, No Global Scroll */}
            <div
                className={`flex flex-col h-screen fixed inset-0 font-sans transition-colors duration-300 ${isDarkMode ? 'bg-slate-900 text-slate-100' : 'bg-slate-100 text-slate-800'}`}
            >
                {/* 1. Header (Fixed Top) */}
                <header
                    className={`flex-none shadow-sm p-4 z-10 transition-colors duration-300 ${isDarkMode ? 'bg-slate-800 border-b border-slate-700' : 'bg-white'}`}
                >
                    <div className="max-w-4xl mx-auto flex justify-between items-center gap-4">
                        {currentInsight && isInsightVisible ? (
                            <div
                                className={`flex-1 flex items-center justify-between p-2 rounded-lg border animate-in slide-in-from-top-2 fade-in duration-300 ${insightStyles[currentInsight.type]?.bg || insightStyles.warning.bg
                                    } ${insightStyles[currentInsight.type]?.border || insightStyles.warning.border} ${insightStyles[currentInsight.type]?.text || insightStyles.warning.text
                                    }`}
                            >
                                <div className="flex items-center gap-2 overflow-hidden">
                                    {React.createElement(insightStyles[currentInsight.type]?.icon || AlertTriangle, { className: 'w-4 h-4 shrink-0' })}
                                    <span className="text-sm font-bold truncate">
                                        {currentInsight.message}
                                    </span>
                                </div>
                                <button
                                    onClick={() => setIsInsightVisible(false)}
                                    className={`p-1 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors ml-2 shrink-0 ${insightStyles[currentInsight.type]?.text || insightStyles.warning.text
                                        }`}
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        ) : (
                            <h1 className="text-xl font-bold text-blue-600 dark:text-blue-400 flex items-center gap-2 shrink-0">
                                <Wallet className="w-6 h-6" /> 記帳 ({username})
                            </h1>
                        )}
                        <button
                            onClick={() => setIsDarkMode(!isDarkMode)}
                            className={`p-2 rounded-full transition-colors ${isDarkMode ? 'bg-slate-700 text-yellow-400' : 'bg-gray-100 text-slate-600'}`}
                        >
                            {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                        </button>
                    </div>
                </header>

                {/* 2. Main Content Area (View-controlled Scroll) */}
                <main className="flex-1 overflow-hidden relative max-w-4xl mx-auto w-full">
                    <div className="absolute inset-0 p-4 pb-24 md:pb-4 w-full h-full">
                        {/* View Rendering */}
                        {currentView === 'calendar' && (
                            <CalendarView
                                isDark={isDarkMode}
                                currentDate={data.currentDate}
                                selectedDate={data.selectedDate}
                                monthlyExpenses={data.monthlyExpenses}
                                selectedDateExpenses={data.selectedDateExpenses}
                                monthlyTotal={data.monthlyTotal}
                                yearlyTotal={data.yearlyTotal}
                                monthlyIncome={data.monthlyIncome}
                                yearlyIncome={data.yearlyIncome}
                                budgets={data.budgets}
                                expenses={data.expenses}
                                categories={data.categories}
                                onPrevMonth={handlePrevMonth}
                                onNextMonth={handleNextMonth}
                                onDateChange={handleDateChange}
                                onDateClick={(day) => data.setSelectedDate(new Date(data.currentYear, data.currentMonth, day))}
                                onAddExpense={openAddExpense}
                                onEditExpense={openEditExpense}
                                onDeleteExpense={data.handleDeleteExpense}
                                deletingId={data.deletingId}
                            />
                        )}

                        {currentView === 'stats' && (
                            <StatsView
                                isDark={isDarkMode}
                                monthlyTotal={data.monthlyTotal}
                                yearlyTotal={data.yearlyTotal}
                                monthlyIncome={data.monthlyIncome}
                                yearlyIncome={data.yearlyIncome}
                                budgets={data.budgets}
                                monthlyExpenses={data.monthlyExpenses}
                                yearlyExpenses={data.yearlyExpenses}
                                categories={data.categories}
                                currentYear={data.currentYear}
                                currentMonth={data.currentMonth}
                                currentDate={data.currentDate}
                                onPrevMonth={handlePrevMonth}
                                onNextMonth={handleNextMonth}
                                onDateChange={handleDateChange}
                            />
                        )}

                        {currentView === 'trend' && <TrendView isDark={isDarkMode} expenses={data.expenses || []} />}

                        {currentView === 'search' && <SearchView isDark={isDarkMode} expenses={data.yearlyExpenses} categories={data.categories} />}

                        {currentView === 'recurring' && (
                            <RecurringView
                                isDark={isDarkMode}
                                recurringRules={data.recurringRules}
                                onAddRule={openAddRecurring}
                                onEditRule={openEditRecurring}
                                onDeleteRule={data.handleDeleteRecurring}
                                deletingId={data.deletingId}
                            />
                        )}

                        {currentView === 'settings' && (
                            <SettingsView
                                isDark={isDarkMode}
                                budgets={data.budgets}
                                categories={data.categories}
                                onUpdateBudget={data.handleUpdateBudget}
                                onAddCategory={data.handleAddCategory}
                                onDeleteCategory={data.handleDeleteCategory}
                                onExport={data.exportToCSV}
                                onImport={data.handleImportCSV}
                                onLogout={onLogout}
                            />
                        )}
                    </div>
                </main>

                {/* 3. Bottom Navigation Bar (Fixed Bottom) */}
                <nav
                    className={`flex-none fixed bottom-0 w-full h-[72px] pb-[safe-area-inset-bottom] border-t z-50 transition-colors duration-300 ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200 shadow-upper'}`}
                >
                    <div className="max-w-4xl mx-auto h-full flex justify-around items-center px-2">
                        {[
                            { id: 'calendar', icon: Calendar, label: '記帳' },
                            { id: 'stats', icon: PieIcon, label: '統計' },
                            { id: 'trend', icon: TrendingUp, label: '趨勢' },
                            { id: 'search', icon: Search, label: '搜尋' },
                            { id: 'recurring', icon: Repeat, label: '固定' },
                            { id: 'settings', icon: Settings, label: '設定' },
                        ].map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setCurrentView(tab.id)}
                                className={`flex flex-col items-center justify-center w-full h-full gap-1 transition-all duration-200 active:scale-95 ${currentView === tab.id
                                    ? isDarkMode
                                        ? 'text-blue-400'
                                        : 'text-blue-600'
                                    : isDarkMode
                                        ? 'text-slate-500 hover:text-slate-300'
                                        : 'text-gray-400 hover:text-gray-600'
                                    }`}
                            >
                                <div
                                    className={`p-1 rounded-xl transition-all ${currentView === tab.id ? (isDarkMode ? 'bg-slate-700' : 'bg-blue-50') : ''}`}
                                >
                                    <tab.icon className={`w-6 h-6 ${currentView === tab.id ? 'stroke-[2.5px]' : 'stroke-2'}`} />
                                </div>
                                <span className="text-[10px] font-medium">{tab.label}</span>
                            </button>
                        ))}
                    </div>
                </nav>

                <ExpenseModal
                    isOpen={isExpenseModalOpen}
                    onClose={() => setIsExpenseModalOpen(false)}
                    onSave={saveExpenseWrapper}
                    initialData={editingExpense}
                    selectedDate={data.selectedDate}
                    categories={data.categories}
                    expenses={data.expenses}
                    budgets={data.budgets}
                    isDark={isDarkMode}
                />

                <RecurringModal
                    isOpen={isRecurringModalOpen}
                    onClose={() => setIsRecurringModalOpen(false)}
                    onSave={saveRecurringWrapper}
                    initialData={editingRecurring}
                    categories={data.categories}
                    isDark={isDarkMode}
                />
            </div>
        </>
    );
};

export default BudgetApp;
