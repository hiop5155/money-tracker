import React, { useState, useEffect, useRef } from 'react';
import {
    Wallet,
    Upload,
    Download,
    LogOut,
    Trash2,
    Layers,
    FileSpreadsheet,
    Check
} from 'lucide-react';
import { getCalcUrl } from '../../utils/calcUrl';

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
                    <span>已儲存變更</span>
                </div>
            )}

            {/* 1. 年度與月份預算 */}
            <div className={`p-5 rounded-2xl border shadow-sm space-y-4 ${
                isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'
            }`}>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Wallet className="w-4 h-4 text-blue-500" />
                        <h3 className="font-bold text-sm">年度與月份預算</h3>
                    </div>
                    <span className={`text-xs font-mono font-medium ${isMonthlyOverAllocated ? 'text-red-500' : 'text-blue-500'}`}>
                        分配率 {allocationPercent}%
                    </span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <div className={`p-3 rounded-xl border ${isDark ? 'bg-slate-700/40 border-slate-600' : 'bg-gray-50 border-gray-200'}`}>
                        <span className="text-xs text-gray-400 block mb-1">月度總目標 (TWD)</span>
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
                        <span className="text-xs text-gray-400 block mb-1">年度總目標 (TWD)</span>
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
                        <span>各項分類月預算加總: ${totalCatMonthly.toLocaleString()}</span>
                        <span>{isMonthlyOverAllocated ? '⚠️ 超出月預算' : `剩餘可分配: $${Math.max(0, monthlyBudgetNum - totalCatMonthly).toLocaleString()}`}</span>
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
                        <h3 className="font-bold text-sm">分類預算</h3>
                    </div>

                    {/* Quick Add */}
                    <div className="flex gap-2">
                        <input
                            type="text"
                            placeholder="新分類名稱..."
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
                            新增
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
                                設定「{selectedCategory}」預算上限
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
                                        確定刪除
                                    </button>
                                    <button
                                        onClick={() => setDeletingCategory(null)}
                                        className={`px-2 py-1 rounded text-xs border active:scale-[0.97] ${
                                            isDark ? 'border-slate-600 text-slate-300' : 'border-gray-300 text-gray-600'
                                        }`}
                                    >
                                        取消
                                    </button>
                                </div>
                            ) : (
                                <button
                                    onClick={() => setDeletingCategory(selectedCategory)}
                                    className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors active:scale-[0.95]"
                                    title="刪除此分類"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            )}
                        </div>

                        <div className="grid grid-cols-2 gap-3 w-full">
                            <div>
                                <label className="block text-[11px] font-medium text-gray-500 dark:text-gray-400 mb-1 whitespace-nowrap">
                                    每月上限 (TWD)
                                </label>
                                <div className="relative">
                                    <span className="absolute left-2.5 top-1.5 text-gray-400 text-xs">$</span>
                                    <input
                                        type="number"
                                        placeholder="不設上限"
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
                                    每年上限 (TWD)
                                </label>
                                <div className="relative">
                                    <span className="absolute left-2.5 top-1.5 text-gray-400 text-xs">$</span>
                                    <input
                                        type="number"
                                        placeholder="不設上限"
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

            {/* 3. 數據備份中心 */}
            <div className={`p-5 rounded-2xl border shadow-sm flex flex-col justify-between sm:flex-row sm:items-center gap-4 ${
                isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'
            }`}>
                <div className="space-y-1">
                    <div className="flex items-center gap-2">
                        <FileSpreadsheet className="w-4 h-4 text-green-500" />
                        <h3 className="font-bold text-sm">數據備份中心</h3>
                    </div>
                    <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                        備份完整帳本或從天天記帳 CSV 無縫轉移
                    </p>
                </div>

                <input type="file" ref={fileInputRef} onChange={(e) => {
                    const file = e.target.files[0];
                    if (file) { onImport(file); e.target.value = null; }
                }} accept=".csv" className="hidden" />

                <div className="flex items-center gap-2">
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        className={`flex-1 sm:flex-initial py-2 px-4 rounded-xl text-xs font-semibold border flex items-center justify-center gap-1.5 transition-colors active:scale-[0.97] ${
                            isDark ? 'border-slate-600 hover:bg-slate-700 text-slate-200' : 'border-gray-200 hover:bg-gray-100 text-gray-700'
                        }`}
                    >
                        <Upload className="w-3.5 h-3.5" />
                        <span>匯入 CSV</span>
                    </button>
                    <button
                        onClick={onExport}
                        className={`flex-1 sm:flex-initial py-2 px-4 rounded-xl text-xs font-semibold border flex items-center justify-center gap-1.5 transition-colors active:scale-[0.97] ${
                            isDark ? 'border-slate-600 hover:bg-slate-700 text-slate-200' : 'border-gray-200 hover:bg-gray-100 text-gray-700'
                        }`}
                    >
                        <Download className="w-3.5 h-3.5" />
                        <span>匯出 CSV</span>
                    </button>
                </div>
            </div>

            {/* 4. 登出 與 刪除帳號 Block (與前三塊卡片等寬) */}
            <div className={`p-5 rounded-2xl border shadow-sm flex flex-col justify-between sm:flex-row sm:items-center gap-4 ${
                isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'
            }`}>
                <div className="space-y-1">
                    <div className="flex items-center gap-2">
                        <LogOut className="w-4 h-4 text-slate-500" />
                        <h3 className="font-bold text-sm">帳號與安全</h3>
                    </div>
                    <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                        管理目前登入狀態或清除帳號所有資料
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    <button
                        onClick={onLogout}
                        className={`py-2 px-4 rounded-xl text-xs font-semibold border flex items-center justify-center gap-1.5 transition-colors active:scale-[0.97] ${
                            isDark ? 'border-slate-600 hover:bg-slate-700 text-slate-200' : 'border-gray-200 hover:bg-gray-100 text-gray-700'
                        }`}
                    >
                        <LogOut className="w-3.5 h-3.5" />
                        <span>登出</span>
                    </button>

                    {showDeleteConfirm ? (
                        <div className="flex items-center gap-1.5 animate-in fade-in">
                            <span className="text-[11px] text-red-500 font-medium hidden sm:inline">確認刪除帳號？</span>
                            <button
                                onClick={onDeleteAccount}
                                className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-semibold active:scale-[0.97] transition-colors"
                            >
                                確認刪除
                            </button>
                            <button
                                onClick={() => setShowDeleteConfirm(false)}
                                className={`px-2.5 py-2 border rounded-xl text-xs active:scale-[0.97] transition-colors ${
                                    isDark ? 'border-slate-600 text-slate-300 hover:bg-slate-700' : 'border-gray-300 text-gray-600 hover:bg-gray-100'
                                }`}
                            >
                                取消
                            </button>
                        </div>
                    ) : (
                        <button
                            onClick={() => setShowDeleteConfirm(true)}
                            className="py-2 px-3 text-xs text-red-500/80 hover:text-red-600 hover:bg-red-500/10 rounded-xl transition-colors active:scale-[0.97]"
                        >
                            刪除帳號與所有資料
                        </button>
                    )}
                </div>
            </div>

            {/* Footer */}
            <footer className="text-center py-6 border-t border-gray-200 dark:border-slate-700">
                <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm mb-3">
                    <a href="/" className={`hover:text-blue-500 transition-colors ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                        記帳助手 App
                    </a>
                    <a href={getCalcUrl()} className={`hover:text-blue-500 transition-colors ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                        資產計算器
                    </a>
                    <a href="/blog/" className={`hover:text-blue-500 transition-colors ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                        理財知識庫
                    </a>
                    <a href="/blog/privacy.html" className={`hover:text-blue-500 transition-colors ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                        隱私權政策
                    </a>
                </div>
                <div className={`text-xs ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
                    &copy; {new Date().getFullYear()} 記帳助手 Money Tracker.
                </div>
            </footer>
        </div>
    );
};

export default SettingsView;
