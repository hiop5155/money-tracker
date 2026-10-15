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
import { PlanProvider, usePlan } from '../context/PlanContext';
import { useTranslation } from '../i18n';

// Header 方案徽章與升級觸發元件（解耦 Props Drilling）
const HeaderPlanStatus = () => {
    const { isPro, openUpgradeModal } = usePlan();
    const { t } = useTranslation();

    if (isPro) {
        return (
            <span
                onClick={openUpgradeModal}
                className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 shrink-0 cursor-pointer hover:bg-blue-500/20 transition-colors"
                title={t('header.managePro')}
            >
                PRO
            </span>
        );
    }

    return (
        <button
            onClick={openUpgradeModal}
            className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all shrink-0 active:scale-95 cursor-pointer"
        >
            {t('header.upgradePro')}
        </button>
    );
};

const BudgetApp = ({ token, onLogout, username, avatar }) => {
    const { t } = useTranslation();
    const data = useBudgetData(token, onLogout);

    const [isDarkMode, setIsDarkMode] = useState(() => localStorage.getItem('theme') === 'dark');
    const [currentView, setCurrentView] = useState(() => {
        const params = new URLSearchParams(window.location.search);
        return params.get('view') || 'calendar';
    });

    const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(() => {
        const params = new URLSearchParams(window.location.search);
        return params.get('modal') === 'expense';
    });
    const [editingExpense, setEditingExpense] = useState(null);

    const [isRecurringModalOpen, setIsRecurringModalOpen] = useState(() => {
        const params = new URLSearchParams(window.location.search);
        return params.get('modal') === 'recurring';
    });
    const [editingRecurring, setEditingRecurring] = useState(null);

    // Format username: remove @domain if present
    const formatDisplayName = (name) => {
        if (!name) return t('common.personal');
        return name.includes('@') ? name.split('@')[0] : name;
    };

    // Detect standalone PWA mode dynamically
    useEffect(() => {
        const isStandalone = window.navigator?.standalone || window.matchMedia?.('(display-mode: standalone)').matches;
        if (isStandalone) {
            document.documentElement.classList.add('is-pwa');
        }
    }, []);

    // Smart Insight State (目前暫時關閉此功能，保留完整程式碼以備後續重構)
    const ENABLE_INSIGHTS = false;
    const [currentInsight, setCurrentInsight] = useState(null);
    const [isInsightVisible, setIsInsightVisible] = useState(true);

    useEffect(() => {
        if (!ENABLE_INSIGHTS) {
            setCurrentInsight(null);
            return;
        }
        if (data.expenses.length > 0) {
            const insights = generateInsights(data.expenses, data.budgets, data.categories, t);
            if (insights.length > 0) {
                setCurrentInsight(insights[0]);
                setIsInsightVisible(true);
            } else {
                setCurrentInsight(null);
            }
        }
    }, [data.expenses, data.budgets, data.categories, t]);

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
            document.documentElement.classList.add('dark', 'dark-mode');
            document.body.classList.add('dark', 'dark-mode');
            localStorage.setItem('theme', 'dark');
        } else {
            document.documentElement.classList.remove('dark', 'dark-mode');
            document.body.classList.remove('dark', 'dark-mode');
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
        <PlanProvider
            value={{
                isPro: data.isPro,
                userPlan: data.userPlan,
                planExpiresAt: data.planExpiresAt,
                isAutoRenewing: data.isAutoRenewing,
                refreshUserPlan: data.refreshUserPlan,
                simulateUpgrade: data.simulateUpgrade,
                cancelSubscription: data.cancelSubscription,
            }}
            userEmail={username}
            isDark={isDarkMode}
        >
            <LoadingOverlay isVisible={data.isApiLoading} />
            {/* Main App Container - Dynamic Viewport Height Edge-to-Edge */}
            <div
                className={`flex flex-col min-h-screen min-h-[100dvh] w-full font-sans transition-colors duration-300 ${isDarkMode ? 'bg-slate-900 text-slate-100' : 'bg-slate-100 text-slate-800'}`}
            >
                {/* 1. Header (Sticky Top with Notch Safe Area) */}
                <header
                    className={`sticky top-0 shadow-sm p-4 z-20 transition-colors duration-300 ${isDarkMode ? 'bg-slate-800 border-b border-slate-700' : 'bg-white'}`}
                >
                    <div className="max-w-4xl mx-auto flex justify-between items-center gap-2 w-full min-w-0">
                        {ENABLE_INSIGHTS && currentInsight && isInsightVisible ? (
                            <div
                                className={`flex-1 min-w-0 flex items-center justify-between p-2 rounded-lg border animate-in slide-in-from-top-2 fade-in duration-300 ${insightStyles[currentInsight.type]?.bg || insightStyles.warning.bg
                                    } ${insightStyles[currentInsight.type]?.border || insightStyles.warning.border} ${insightStyles[currentInsight.type]?.text || insightStyles.warning.text
                                    }`}
                            >
                                <div className="flex items-center gap-2 overflow-hidden min-w-0">
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
                            <div className="flex items-center gap-2.5 min-w-0 flex-1 mr-2">
                                {avatar ? (
                                    <img
                                        src={avatar}
                                        alt={t('common.userAvatar')}
                                        className="w-9 h-9 rounded-full object-cover border border-slate-200 dark:border-slate-700 shrink-0 shadow-sm ring-1 ring-slate-900/5 dark:ring-white/10"
                                        referrerPolicy="no-referrer"
                                        onError={(e) => { e.currentTarget.style.display = 'none'; }}
                                    />
                                ) : (
                                    <div className="w-9 h-9 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-sm shrink-0 border border-blue-500/20 shadow-sm">
                                        <Wallet className="w-5 h-5" />
                                    </div>
                                )}
                                <h1 className="text-lg sm:text-xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5 min-w-0 flex-1">
                                    <span className="shrink-0 text-blue-600 dark:text-blue-400">{t('header.appName')}</span>
                                    <span className="text-xs sm:text-sm font-medium text-slate-500 dark:text-slate-400 truncate min-w-0" title={username}>
                                        ({formatDisplayName(username)})
                                    </span>
                                    {/* 統一由 HeaderPlanStatus 處理方案徽章與升級彈窗觸發 */}
                                    <HeaderPlanStatus />
                                </h1>
                            </div>
                        )}
                        <button
                            onClick={() => setIsDarkMode(!isDarkMode)}
                            className={`w-11 h-11 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl transition-all active:scale-90 shrink-0 shadow-sm border ${
                                isDarkMode
                                    ? 'bg-slate-700/80 hover:bg-slate-700 text-yellow-400 border-slate-600'
                                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
                            }`}
                            aria-label={isDarkMode ? t('header.switchLight') : t('header.switchDark')}
                            title={isDarkMode ? t('header.switchLight') : t('header.switchDark')}
                        >
                            {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                        </button>
                    </div>
                </header>

                {/* 2. Main Content Area (Natural Fluid Scroll) */}
                <main className="flex-1 w-full max-w-4xl mx-auto p-4 pb-28 md:pb-8">
                    <div className="w-full">
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

                        {currentView === 'trend' && (
                            <TrendView
                                isDark={isDarkMode}
                                expenses={data.expenses || []}
                            />
                        )}

                        {currentView === 'search' && (
                            <SearchView
                                isDark={isDarkMode}
                                expenses={data.yearlyExpenses}
                                categories={data.categories}
                                onEditExpense={openEditExpense}
                            />
                        )}

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
                                onDeleteAccount={data.handleDeleteAccount}
                            />
                        )}
                    </div>
                </main>

                {/* 3. Bottom Navigation Bar (Fixed Bottom) */}
                <nav
                    className={`fixed bottom-0 left-0 right-0 w-full border-t z-50 transition-colors duration-300 ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200 shadow-upper'}`}
                    style={{
                        paddingBottom: 'max(1rem, env(safe-area-inset-bottom, 34px))',
                        transform: 'translateZ(0)'
                    }}
                >
                    {/* Downward background bleed: physically covers any letterbox gap below nav */}
                    <div
                        className={`absolute top-full left-0 right-0 h-64 pointer-events-none ${isDarkMode ? 'bg-slate-800' : 'bg-white'}`}
                        aria-hidden="true"
                    />
                    <div className="max-w-4xl mx-auto h-14 flex justify-around items-center px-2 relative z-10">
                        {[
                            { id: 'calendar', icon: Calendar, label: t('nav.calendar') },
                            { id: 'stats', icon: PieIcon, label: t('nav.stats') },
                            { id: 'trend', icon: TrendingUp, label: t('nav.trend') },
                            { id: 'search', icon: Search, label: t('nav.search') },
                            { id: 'recurring', icon: Repeat, label: t('nav.recurring') },
                            { id: 'settings', icon: Settings, label: t('nav.settings') },
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
        </PlanProvider>
    );
};

export default BudgetApp;
