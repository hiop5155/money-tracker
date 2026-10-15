import React, { useState, useEffect, useRef } from 'react';
import {
    Wallet,
    Upload,
    Download,
    LogOut,
    Trash2,
    Layers,
    FileSpreadsheet,
    Check,
    Crown,
    Sparkles,
    ShieldCheck,
    Lock,
    Globe,
    Sliders,
} from 'lucide-react';
import { getCalcUrl } from '../../utils/calcUrl';
import { usePlan } from '../../context/PlanContext';
import { useTranslation, LanguageToggle } from '../../i18n';

const SettingsView = ({
    isDark,
    budgets,
    categories = [],
    onUpdateBudget = () => {},
    onAddCategory = () => {},
    onDeleteCategory = () => {},
    onExport = () => {},
    onImport = () => {},
    onLogout = () => {},
    onDeleteAccount = () => {},
}) => {
    // 方案權限直接由金流模組取得 (無須 Props Drilling)
    const { isPro, userPlan, openUpgradeModal, onOpenUpgrade, requirePro } = usePlan();
    const { t } = useTranslation();

    const [newCategory, setNewCategory] = useState('');
    const [localBudgets, setLocalBudgets] = useState({ monthly: '', yearly: '', categoryLimits: [] });
    const [selectedCategory, setSelectedCategory] = useState(null);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [deletingCategory, setDeletingCategory] = useState(null);
    const [showSavedToast, setShowSavedToast] = useState(false);
    const fileInputRef = useRef(null);

    // Initialize local state when data is loaded
    useEffect(() => {
        if (budgets) {
            const currentLimits = budgets.categoryLimits || [];
            const mergedLimits = categories.map((catName) => {
                const saved = currentLimits.find((l) => l.name === catName);
                return {
                    name: catName,
                    monthly: saved ? String(saved.monthly) : '',
                    yearly: saved ? String(saved.yearly) : '',
                };
            });

            setLocalBudgets({
                monthly: String(budgets.monthly || ''),
                yearly: String(budgets.yearly || ''),
                categoryLimits: mergedLimits,
            });
            if (categories.length > 0 && !selectedCategory) {
                setSelectedCategory(categories[0]);
            }
        }
    }, [budgets, categories]);

    const handleAdd = () => {
        if (!newCategory.trim()) return;
        onAddCategory(newCategory.trim());
        setSelectedCategory(newCategory.trim());
        setNewCategory('');
    };

    // Auto-save on Enter or Blur
    const triggerSave = (customBudgets = localBudgets) => {
        const monthlyVal = parseInt(customBudgets.monthly || 0, 10);
        const yearlyVal = parseInt(customBudgets.yearly || 0, 10);
        const cleanLimits = customBudgets.categoryLimits.map((item) => ({
            name: item.name,
            monthly: parseInt(item.monthly || 0, 10) || 0,
            yearly: parseInt(item.yearly || 0, 10) || 0,
        }));
        onUpdateBudget({ monthly: monthlyVal, yearly: yearlyVal, categoryLimits: cleanLimits });
        setShowSavedToast(true);
        setTimeout(() => setShowSavedToast(false), 2000);
    };

    const handleMonthlyChange = (valStr) => {
        const valNum = parseInt(valStr || 0, 10);
        let newYearly = localBudgets.yearly;
        const currentYearlyNum = parseInt(localBudgets.yearly || 0, 10);
        if (currentYearlyNum < valNum * 12) {
            newYearly = String(valNum * 12);
        }
        setLocalBudgets({ ...localBudgets, monthly: valStr, yearly: newYearly });
    };

    const handleLimitChange = (catName, field, value) => {
        const idx = localBudgets.categoryLimits.findIndex((l) => l.name === catName);
        if (idx !== -1) {
            const newLimits = [...localBudgets.categoryLimits];
            newLimits[idx] = { ...newLimits[idx], [field]: value };
            const updated = { ...localBudgets, categoryLimits: newLimits };
            setLocalBudgets(updated);
            return updated;
        }
        return localBudgets;
    };

    const totalCatMonthly = localBudgets.categoryLimits.reduce((sum, item) => sum + parseInt(item.monthly || 0, 10), 0);
    const monthlyBudgetNum = parseInt(localBudgets.monthly || 0, 10);
    const allocationPercent = monthlyBudgetNum > 0 ? Math.round((totalCatMonthly / monthlyBudgetNum) * 100) : 0;
    const isMonthlyOverAllocated = monthlyBudgetNum > 0 && totalCatMonthly > monthlyBudgetNum;

    const currentCatObj = localBudgets.categoryLimits.find((l) => l.name === selectedCategory) || { monthly: '', yearly: '' };

    return (
        <div className="w-full max-w-4xl mx-auto space-y-4 px-1 pt-2 pb-32 animate-in fade-in duration-150">
            {/* Auto-saved Floating Toast */}
            {showSavedToast && (
                <div className="fixed top-4 right-4 z-50 bg-emerald-600 text-white text-xs font-medium px-3 py-1.5 rounded-full shadow-lg flex items-center gap-1.5 animate-in fade-in slide-in-from-top-2 duration-200">
                    <Check className="w-3.5 h-3.5" />
                    <span>{t('settings.savedChanges')}</span>
                </div>
            )}

            {/* 0. 會員與 Pro 方案狀態 */}
            <div
                className={`p-5 rounded-2xl border shadow-sm flex flex-col justify-between sm:flex-row sm:items-center gap-4 ${
                    isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'
                }`}
            >
                <div className="space-y-1">
                    <div className="flex items-center gap-2">
                        <Crown className={`w-4 h-4 ${isPro ? 'text-amber-500' : 'text-slate-400'}`} />
                        <h3 className="font-bold text-sm">{t('settings.membership')}</h3>
                        {isPro ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                                {t('common.pro')}
                            </span>
                        ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400">
                                {t('common.free')}
                            </span>
                        )}
                    </div>
                    <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                        {isPro ? t('settings.membershipDescPro') : t('settings.membershipDescFree')}
                    </p>
                </div>

                <div>
                    {isPro ? (
                        <div className="flex items-center gap-2">
                            <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 select-none">
                                <ShieldCheck className="w-3.5 h-3.5" />
                                <span>{t('settings.activeBadge')}</span>
                            </span>
                            <button
                                onClick={openUpgradeModal || onOpenUpgrade}
                                className="py-1.5 px-3 rounded-xl text-xs font-medium border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition-colors duration-150 active:scale-[0.98] cursor-pointer select-none touch-manipulation flex items-center gap-1"
                            >
                                <Sliders className="w-3.5 h-3.5 text-slate-400" />
                                <span>{t('settings.manageSubscription')}</span>
                            </button>
                        </div>
                    ) : (
                        <button
                            onClick={onOpenUpgrade}
                            className="py-2 px-3.5 rounded-xl text-xs font-semibold bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 transition-colors duration-150 active:scale-[0.98] shadow-xs cursor-pointer flex items-center gap-1.5 select-none touch-manipulation"
                        >
                            <Crown className="w-3.5 h-3.5 text-amber-500" />
                            <span>{t('settings.upgradeButton')}</span>
                        </button>
                    )}
                </div>
            </div>

            {/* 1. 年度與月份預算 */}
            <div className={`p-5 rounded-2xl border shadow-sm space-y-4 ${
                isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'
            }`}>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Wallet className="w-4 h-4 text-blue-500" />
                        <h3 className="font-bold text-sm">{t('settings.annualMonthlyBudget')}</h3>
                    </div>
                    <span className={`text-xs font-mono font-medium ${isMonthlyOverAllocated ? 'text-red-500' : 'text-blue-500'}`}>
                        {t('settings.allocationRate')} {allocationPercent}%
                    </span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <div className={`p-3 rounded-xl border ${isDark ? 'bg-slate-700/40 border-slate-600' : 'bg-gray-50 border-gray-200'}`}>
                        <span className="text-xs text-gray-400 block mb-1">{t('settings.monthlyTarget')}</span>
                        <div className="flex items-center font-mono">
                            <span className="text-gray-400 mr-1">$</span>
                            <input
                                type="number"
                                value={localBudgets.monthly}
                                onChange={(e) => handleMonthlyChange(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && (e.target.blur(), triggerSave())}
                                onBlur={() => triggerSave()}
                                placeholder="0"
                                className="w-full bg-transparent font-bold text-base outline-none"
                            />
                        </div>
                    </div>

                    <div className={`p-3 rounded-xl border ${isDark ? 'bg-slate-700/40 border-slate-600' : 'bg-gray-50 border-gray-200'}`}>
                        <span className="text-xs text-gray-400 block mb-1">{t('settings.yearlyTarget')}</span>
                        <div className="flex items-center font-mono">
                            <span className="text-gray-400 mr-1">$</span>
                            <input
                                type="number"
                                value={localBudgets.yearly}
                                onChange={(e) => setLocalBudgets({ ...localBudgets, yearly: e.target.value })}
                                onKeyDown={(e) => e.key === 'Enter' && (e.target.blur(), triggerSave())}
                                onBlur={() => triggerSave()}
                                placeholder="0"
                                className="w-full bg-transparent font-bold text-base outline-none"
                            />
                        </div>
                    </div>
                </div>

                {/* Progress Bar & Allocation Status */}
                <div className="space-y-1.5">
                    <div className="flex justify-between text-xs text-gray-400 flex-wrap gap-1">
                        <span>{t('settings.categoryMonthlyTotal', { total: totalCatMonthly.toLocaleString() })}</span>
                        <span>{isMonthlyOverAllocated ? t('settings.overAllocated') : t('settings.remainingAllocated', { amount: Math.max(0, monthlyBudgetNum - totalCatMonthly).toLocaleString() })}</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-gray-100 dark:bg-slate-700 overflow-hidden">
                        <div
                            className={`h-full rounded-full transition-all duration-300 ${isMonthlyOverAllocated ? 'bg-red-500' : 'bg-blue-500'}`}
                            style={{ width: `${Math.min(100, allocationPercent)}%` }}
                        />
                    </div>
                </div>
            </div>

            {/* 2. 分類預算 */}
            <div className={`p-5 rounded-2xl border shadow-sm space-y-4 ${
                isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'
            }`}>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                    <div className="flex items-center gap-2">
                        <Layers className="w-4 h-4 text-indigo-500" />
                        <h3 className="font-bold text-sm">{t('settings.categoryBudgetSetting')}</h3>
                    </div>

                    {/* Quick Add */}
                    <div className="flex gap-2">
                        <input
                            type="text"
                            placeholder={t('settings.addNewCategory')}
                            value={newCategory}
                            onChange={(e) => setNewCategory(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                            className={`w-36 px-2.5 py-1 text-xs border rounded-lg outline-none focus:ring-1 focus:ring-blue-500 ${
                                isDark ? 'bg-slate-700 border-slate-600 text-white' : 'bg-gray-50 border-gray-300'
                            }`}
                        />
                        <button
                            onClick={handleAdd}
                            disabled={!newCategory.trim()}
                            className="px-3 py-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-xs font-medium active:scale-[0.97]"
                        >
                            {t('common.add')}
                        </button>
                    </div>
                </div>

                {/* Category Chips Matrix */}
                <div className="flex flex-wrap gap-2">
                    {categories.map((catName) => {
                        const isSelected = selectedCategory === catName;
                        const catObj = localBudgets.categoryLimits.find((l) => l.name === catName);
                        const monthlyVal = parseInt(catObj?.monthly || 0, 10);
                        const yearlyVal = parseInt(catObj?.yearly || 0, 10);
                        const hasMonthly = monthlyVal > 0;
                        const hasYearly = yearlyVal > 0;

                        // 斜線簡約格式：月 / 年 (例如 2,000 / 24,000)
                        let budgetText = null;
                        if (hasMonthly && hasYearly) {
                            budgetText = `${monthlyVal.toLocaleString()} / ${yearlyVal.toLocaleString()}`;
                        } else if (hasYearly) {
                            budgetText = `- / ${yearlyVal.toLocaleString()}`;
                        } else if (hasMonthly) {
                            budgetText = `${monthlyVal.toLocaleString()}`;
                        }

                        return (
                            <button
                                key={catName}
                                onClick={() => setSelectedCategory(catName)}
                                className={`px-3 py-1.5 rounded-xl text-xs font-medium border flex items-center gap-2 transition-all active:scale-[0.97] ${
                                    isSelected
                                        ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                                        : isDark
                                        ? 'bg-slate-700/50 border-slate-600 text-slate-200 hover:bg-slate-700'
                                        : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'
                                }`}
                            >
                                <span>{catName}</span>
                                {budgetText && (
                                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono whitespace-nowrap ${
                                        isSelected ? 'bg-white/20 text-white' : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                                    }`}>
                                        {budgetText}
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </div>

                {/* Selected Category Editor Drawer (Responsive 2-col Grid) */}
                {selectedCategory && (
                    <div className={`p-4 rounded-xl border flex flex-col gap-3 animate-in fade-in duration-200 ${
                        isDark ? 'bg-slate-700/30 border-slate-600' : 'bg-blue-50/50 border-blue-100'
                    }`}>
                        <div className="flex items-center justify-between w-full">
                            <span className="font-bold text-sm">
                                {t('settings.categoryBudgetLimitTitle', { category: selectedCategory })}
                            </span>

                            {deletingCategory === selectedCategory ? (
                                <div className="flex items-center gap-1.5 animate-in fade-in">
                                    <button
                                        onClick={() => {
                                            onDeleteCategory(selectedCategory);
                                            setDeletingCategory(null);
                                            const remaining = categories.filter((c) => c !== selectedCategory);
                                            setSelectedCategory(remaining[0] || null);
                                        }}
                                        className="px-2 py-1 rounded text-xs font-semibold bg-red-600 text-white active:scale-[0.97]"
                                    >
                                        {t('settings.confirmDeleteCategory')}
                                    </button>
                                    <button
                                        onClick={() => setDeletingCategory(null)}
                                        className={`px-2 py-1 rounded text-xs border active:scale-[0.97] ${
                                            isDark ? 'border-slate-600 text-slate-300' : 'border-gray-300 text-gray-600'
                                        }`}
                                    >
                                        {t('common.cancel')}
                                    </button>
                                </div>
                            ) : (
                                <button
                                    onClick={() => setDeletingCategory(selectedCategory)}
                                    className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors active:scale-[0.95]"
                                    title={t('settings.deleteCategoryTooltip')}
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            )}
                        </div>

                        <div className="grid grid-cols-2 gap-3 w-full">
                            <div>
                                <label className="block text-[11px] font-medium text-gray-500 dark:text-gray-400 mb-1 whitespace-nowrap">
                                    {t('settings.monthlyLimit')}
                                </label>
                                <div className="relative">
                                    <span className="absolute left-2.5 top-1.5 text-gray-400 text-xs">$</span>
                                    <input
                                        type="number"
                                        placeholder={t('settings.noLimitPlaceholder')}
                                        value={currentCatObj.monthly || ''}
                                        onChange={(e) => {
                                            handleLimitChange(selectedCategory, 'monthly', e.target.value);
                                        }}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                e.target.blur();
                                                const updated = handleLimitChange(selectedCategory, 'monthly', e.target.value);
                                                triggerSave(updated);
                                            }
                                        }}
                                        onBlur={(e) => {
                                            const updated = handleLimitChange(selectedCategory, 'monthly', e.target.value);
                                            triggerSave(updated);
                                        }}
                                        className={`w-full pl-6 pr-2.5 py-1.5 border rounded-lg text-xs font-mono outline-none focus:ring-1 focus:ring-blue-500 ${
                                            isDark ? 'bg-slate-600 border-slate-500 text-white' : 'bg-white border-gray-300'
                                        }`}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-[11px] font-medium text-gray-500 dark:text-gray-400 mb-1 whitespace-nowrap">
                                    {t('settings.yearlyLimit')}
                                </label>
                                <div className="relative">
                                    <span className="absolute left-2.5 top-1.5 text-gray-400 text-xs">$</span>
                                    <input
                                        type="number"
                                        placeholder={t('settings.noLimitPlaceholder')}
                                        value={currentCatObj.yearly || ''}
                                        onChange={(e) => {
                                            handleLimitChange(selectedCategory, 'yearly', e.target.value);
                                        }}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                e.target.blur();
                                                const updated = handleLimitChange(selectedCategory, 'yearly', e.target.value);
                                                triggerSave(updated);
                                            }
                                        }}
                                        onBlur={(e) => {
                                            const updated = handleLimitChange(selectedCategory, 'yearly', e.target.value);
                                            triggerSave(updated);
                                        }}
                                        className={`w-full pl-6 pr-2.5 py-1.5 border rounded-lg text-xs font-mono outline-none focus:ring-1 focus:ring-blue-500 ${
                                            isDark ? 'bg-slate-600 border-slate-500 text-white' : 'bg-white border-gray-300'
                                        }`}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* 3. 數據備份中心 (Pro 專屬功能) */}
            <div className={`p-5 rounded-2xl border shadow-sm flex flex-col justify-between sm:flex-row sm:items-center gap-4 ${
                isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'
            }`}>
                <div className="space-y-1">
                    <div className="flex items-center gap-2">
                        <FileSpreadsheet className="w-4 h-4 text-emerald-500" />
                        <h3 className="font-bold text-sm">{t('settings.backupCenter')}</h3>
                        {isPro ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                                <Check className="w-2.5 h-2.5" /> {t('settings.proUnlocked')}
                            </span>
                        ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 flex items-center gap-1">
                                <Crown className="w-2.5 h-2.5" /> {t('settings.proExclusive')}
                            </span>
                        )}
                    </div>
                    <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                        {t('settings.backupCenterDesc')}
                    </p>
                </div>

                <input type="file" ref={fileInputRef} onChange={(e) => {
                    const file = e.target.files[0];
                    if (file) { onImport(file, onOpenUpgrade); e.target.value = null; }
                }} accept=".csv" className="hidden" />

                <div className="flex items-center gap-2">
                    <button
                        onClick={() => {
                            if (!isPro) {
                                onOpenUpgrade();
                            } else {
                                fileInputRef.current?.click();
                            }
                        }}
                        className={`flex-1 sm:flex-initial py-2 px-4 rounded-xl text-xs font-semibold border flex items-center justify-center gap-1.5 transition-colors active:scale-[0.97] cursor-pointer ${
                            isDark ? 'border-slate-600 hover:bg-slate-700 text-slate-200' : 'border-gray-200 hover:bg-gray-100 text-gray-700'
                        }`}
                    >
                        {!isPro ? <Lock className="w-3.5 h-3.5 text-amber-500" /> : <Upload className="w-3.5 h-3.5" />}
                        <span>{t('settings.importCsv')}</span>
                    </button>
                    <button
                        onClick={() => {
                            if (!isPro) {
                                onOpenUpgrade();
                            } else {
                                onExport(onOpenUpgrade);
                            }
                        }}
                        className={`flex-1 sm:flex-initial py-2 px-4 rounded-xl text-xs font-semibold border flex items-center justify-center gap-1.5 transition-colors active:scale-[0.97] cursor-pointer ${
                            isDark ? 'border-slate-600 hover:bg-slate-700 text-slate-200' : 'border-gray-200 hover:bg-gray-100 text-gray-700'
                        }`}
                    >
                        {!isPro ? <Lock className="w-3.5 h-3.5 text-amber-500" /> : <Download className="w-3.5 h-3.5" />}
                        <span>{t('settings.exportCsv')}</span>
                    </button>
                </div>
            </div>

            {/* 4. 語言設定 (Language) */}
            <div className={`p-5 rounded-2xl border shadow-sm flex flex-col justify-between sm:flex-row sm:items-center gap-4 ${
                isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'
            }`}>
                <div className="space-y-1">
                    <div className="flex items-center gap-2">
                        <Globe className="w-4 h-4 text-blue-500" />
                        <h3 className="font-bold text-sm">{t('settings.language')}</h3>
                    </div>
                    <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                        {t('settings.languageDesc')}
                    </p>
                </div>

                <div>
                    <LanguageToggle />
                </div>
            </div>

            {/* 5. 登出 與 刪除帳號 Block (與前三塊卡片等寬) */}
            <div className={`p-5 rounded-2xl border shadow-sm flex flex-col justify-between sm:flex-row sm:items-center gap-4 ${
                isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'
            }`}>
                <div className="space-y-1">
                    <div className="flex items-center gap-2">
                        <LogOut className="w-4 h-4 text-slate-500" />
                        <h3 className="font-bold text-sm">{t('settings.accountSecurity')}</h3>
                    </div>
                    <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                        {t('settings.accountSecurityDesc')}
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    <button
                        onClick={onLogout}
                        className={`py-2 px-4 rounded-xl text-xs font-semibold border flex items-center justify-center gap-1.5 transition-colors active:scale-[0.97] cursor-pointer ${
                            isDark ? 'border-slate-600 hover:bg-slate-700 text-slate-200' : 'border-gray-200 hover:bg-gray-100 text-gray-700'
                        }`}
                    >
                        <LogOut className="w-3.5 h-3.5" />
                        <span>{t('settings.logout')}</span>
                    </button>

                    {showDeleteConfirm ? (
                        <div className="flex items-center gap-1.5 animate-in fade-in">
                            <span className="text-[11px] text-red-500 font-medium hidden sm:inline">{t('settings.confirmDeleteAccount')}</span>
                            <button
                                onClick={onDeleteAccount}
                                className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-semibold active:scale-[0.97] transition-colors cursor-pointer"
                            >
                                {t('common.confirm')}
                            </button>
                            <button
                                onClick={() => setShowDeleteConfirm(false)}
                                className={`px-2.5 py-2 border rounded-xl text-xs active:scale-[0.97] transition-colors cursor-pointer ${
                                    isDark ? 'border-slate-600 text-slate-300 hover:bg-slate-700' : 'border-gray-300 text-gray-600 hover:bg-gray-100'
                                }`}
                            >
                                {t('common.cancel')}
                            </button>
                        </div>
                    ) : (
                        <button
                            onClick={() => setShowDeleteConfirm(true)}
                            className="py-2 px-3 text-xs text-red-500/80 hover:text-red-600 hover:bg-red-500/10 rounded-xl transition-colors active:scale-[0.97] cursor-pointer"
                        >
                            {t('settings.deleteAccount')}
                        </button>
                    )}
                </div>
            </div>

            {/* Footer */}
            <footer className="text-center py-6 border-t border-gray-200 dark:border-slate-700">
                <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm mb-3">
                    <a href="/" className={`hover:text-blue-500 transition-colors ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                        {t('footer.appName')}
                    </a>
                    <a href={getCalcUrl()} className={`hover:text-blue-500 transition-colors ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                        {t('footer.calcTool')}
                    </a>
                    <a href="/blog/" className={`hover:text-blue-500 transition-colors ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                        {t('footer.knowledge')}
                    </a>
                    <a href="/blog/privacy.html" className={`hover:text-blue-500 transition-colors ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                        {t('footer.privacy')}
                    </a>
                </div>
                <div className={`text-xs ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
                    {t('footer.copyright', { year: new Date().getFullYear() })}
                </div>
            </footer>
        </div>
    );
};

export default SettingsView;
