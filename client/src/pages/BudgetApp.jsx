import React, { useState, useEffect } from 'react';
import { Calendar, PieChart as PieIcon, Settings, Wallet, Moon, Sun, Repeat, Loader2, Search, TrendingUp } from 'lucide-react';

// Hooks & Components
import { useBudgetData } from '../hooks/useBudgetData';
import LoadingOverlay from '../components/LoadingOverlay';

// Views
import CalendarView from '../components/budget/CalendarView';
import StatsView from '../components/budget/StatsView';
import RecurringView from '../components/budget/RecurringView';
import SettingsView from '../components/budget/SettingsView';
import SearchView from '../components/budget/SearchView';
import TrendView from '../components/budget/TrendView.jsx';
import InsightCard from '../components/budget/InsightCard.jsx'; // [NEW]

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
    const handlePrevMonth = () => data.setCurrentDate(new Date(data.currentYear, data.currentMonth - 1, 1));
    const handleNextMonth = () => data.setCurrentDate(new Date(data.currentYear, data.currentMonth + 1, 1));
    const handleDateChange = (newDate) => data.setCurrentDate(newDate);

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
            <div
                className={`min-h-screen font-sans pb-20 md:pb-0 transition-colors duration-300 ${isDarkMode ? 'bg-slate-900 text-slate-100' : 'bg-slate-100 text-slate-800'}`}
            >
                <header
                    className={`shadow-sm p-4 sticky top-0 z-10 transition-colors duration-300 ${isDarkMode ? 'bg-slate-800 border-b border-slate-700' : 'bg-white'}`}
                >
                    <div className="max-w-4xl mx-auto flex justify-between items-center">
                        <h1 className="text-xl font-bold text-blue-600 dark:text-blue-400 flex items-center gap-2">
                            <Wallet className="w-6 h-6" /> 記帳 ({username})
                        </h1>
                        <button
                            onClick={() => setIsDarkMode(!isDarkMode)}
                            className={`p-2 rounded-full transition-colors ${isDarkMode ? 'bg-slate-700 text-yellow-400' : 'bg-gray-100 text-slate-600'}`}
                        >
                            {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                        </button>
                    </div>
                </header>

                <main className="max-w-4xl mx-auto p-4">
                    {/* AI Insights - Only show on Calendar/Stats view to avoid clutter */}
                    {(currentView === 'calendar' || currentView === 'stats') && (
                        <InsightCard
                            expenses={data.expenses}
                            budgets={data.budgets}
                            categories={data.categories}
                            isDark={isDarkMode}
                        />
                    )}

                    <div className={`flex rounded-lg shadow-sm mb-6 p-1 transition-colors ${isDarkMode ? 'bg-slate-800' : 'bg-white'}`}>
                        {[
                            { id: 'calendar', icon: Calendar, label: '月曆' },
                            { id: 'stats', icon: PieIcon, label: '統計' },
                            { id: 'trend', icon: TrendingUp, label: '趨勢' },
                            { id: 'search', icon: Search, label: '搜尋' },
                            { id: 'recurring', icon: Repeat, label: '固定' },
                            { id: 'settings', icon: Settings, label: '設定' },
                        ].map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setCurrentView(tab.id)}
                                className={`flex-1 py-2 text-sm font-medium rounded-md flex items-center justify-center gap-2 transition-colors ${currentView === tab.id ? (isDarkMode ? 'bg-blue-900/50 text-blue-300' : 'bg-blue-100 text-blue-700') : isDarkMode ? 'text-slate-400 hover:bg-slate-700' : 'text-gray-500 hover:bg-gray-50'}`}
                            >
                                <tab.icon className="w-4 h-4" /> {tab.label}
                            </button>
                        ))}
                    </div>

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
                            // Pass expenses data
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
                </main>

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
