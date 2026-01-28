import React, { useState, useEffect, useRef } from 'react';
import { Wallet, FileText, X, Power, Download, LogOut, Save, Upload, ChevronDown, ChevronUp, Settings as SettingsIcon } from 'lucide-react';

const SettingsView = ({ isDark, budgets, categories, onUpdateBudget, onAddCategory, onDeleteCategory, onExport, onImport, onLogout, onDeleteAccount }) => {
    const [newCategory, setNewCategory] = useState('');
    // State to hold local changes before saving
    const [localBudgets, setLocalBudgets] = useState({ monthly: '', yearly: '', categoryLimits: [] });
    // State to track which category is expanded for editing
    const [expandedCategory, setExpandedCategory] = useState(null);
    const fileInputRef = useRef(null);

    // Initialize local state when data is loaded
    useEffect(() => {
        if (budgets) {
            const currentLimits = budgets.categoryLimits || [];

            // Merge existing categories with saved limits
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
        }
    }, [budgets, categories]);

    const handleAdd = () => {
        if (!newCategory) return;
        onAddCategory(newCategory);
        setNewCategory('');
    };

    // Monthly budget input linkage logic ---
    const handleGlobalMonthlyChange = (e) => {
        const valStr = e.target.value;
        const valNum = parseInt(valStr || 0, 10);

        let newYearly = localBudgets.yearly;
        const currentYearlyNum = parseInt(localBudgets.yearly || 0, 10);

        // Budget check
        if (currentYearlyNum < valNum * 12) {
            newYearly = String(valNum * 12);
        }

        setLocalBudgets({
            ...localBudgets,
            monthly: valStr,
            yearly: newYearly,
        });
    };

    // Handle changes in category limit inputs
    const handleCategoryLimitChange = (index, field, value) => {
        const newLimits = [...localBudgets.categoryLimits];
        newLimits[index] = { ...newLimits[index], [field]: value };
        setLocalBudgets({ ...localBudgets, categoryLimits: newLimits });
    };

    // Save all budget settings
    const handleSaveBudget = () => {
        // Use || 0 to ensure empty string converts to 0
        const monthlyVal = parseInt(localBudgets.monthly || 0, 10);
        const yearlyVal = parseInt(localBudgets.yearly || 0, 10);

        const MIN_VAL = 0;
        const MAX_VAL = 100000000;

        if (isNaN(monthlyVal) || monthlyVal < MIN_VAL || monthlyVal > MAX_VAL) {
            alert('總月預算輸入錯誤：請輸入有效的數字');
            return;
        }
        if (isNaN(yearlyVal) || yearlyVal < MIN_VAL || yearlyVal > MAX_VAL) {
            alert('總年預算輸入錯誤：請輸入有效的數字');
            return;
        }

        // Convert strings back to numbers for the API
        const cleanLimits = localBudgets.categoryLimits.map((item) => {
            const m = parseInt(item.monthly || 0, 10);
            const y = parseInt(item.yearly || 0, 10);
            return {
                name: item.name,
                monthly: isNaN(m) ? 0 : m,
                yearly: isNaN(y) ? 0 : y,
            };
        });

        onUpdateBudget({
            monthly: monthlyVal,
            yearly: yearlyVal,
            categoryLimits: cleanLimits,
        });
    };

    // Handle CSV file import
    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            if (window.confirm(`Are you sure you want to import ${file.name}?\nThis will add data to your account.`)) {
                onImport(file);
            }
            e.target.value = null;
        }
    };

    const triggerImport = () => {
        fileInputRef.current.click();
    };

    // Calculate category sums (for display)
    const totalCatMonthly = localBudgets.categoryLimits.reduce((sum, item) => sum + parseInt(item.monthly || 0, 10), 0);
    const totalCatYearly = localBudgets.categoryLimits.reduce((sum, item) => sum + parseInt(item.yearly || 0, 10), 0);

    return (
        <div className="h-full overflow-y-auto space-y-6 animate-in fade-in zoom-in-95 duration-300 custom-scrollbar pb-32">
            {/* 1. Global Budget Settings */}
            <div className={`p-6 rounded-xl shadow-sm ${isDark ? 'bg-slate-800' : 'bg-white'}`}>
                <div className="flex justify-between items-center mb-4">
                    <h3 className={`font-bold flex items-center gap-2 ${isDark ? 'text-slate-200' : 'text-gray-800'}`}>
                        <Wallet className="w-5 h-5" /> 總預算設定
                    </h3>
                    {/* Save button */}
                    <button
                        onClick={handleSaveBudget}
                        className="bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 text-sm flex items-center gap-1"
                    >
                        <Save className="w-4 h-4" /> 儲存全部
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>月總預算</label>
                        <input
                            type="number"
                            min="0"
                            max="100000000"
                            value={localBudgets.monthly}
                            onChange={handleGlobalMonthlyChange}
                            placeholder="請輸入金額"
                            className={`w-full border rounded-lg p-2 outline-none focus:ring-2 focus:ring-blue-500 ${isDark ? 'bg-slate-700 border-slate-600 text-slate-100' : 'bg-white border-gray-200'}`}
                        />
                    </div>
                    <div>
                        <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>年總預算</label>
                        <input
                            type="number"
                            min="0"
                            max="100000000"
                            value={localBudgets.yearly}
                            onChange={(e) => setLocalBudgets({ ...localBudgets, yearly: e.target.value })}
                            placeholder="請輸入金額"
                            className={`w-full border rounded-lg p-2 outline-none focus:ring-2 focus:ring-blue-500 ${isDark ? 'bg-slate-700 border-slate-600 text-slate-100' : 'bg-white border-gray-200'}`}
                        />
                    </div>
                </div>
            </div>

            {/* 2. Category Budget Settings */}
            <div className={`p-6 rounded-xl shadow-sm ${isDark ? 'bg-slate-800' : 'bg-white'}`}>
                <div className="flex justify-between items-center mb-4">
                    <h3 className={`font-bold flex items-center gap-2 ${isDark ? 'text-slate-200' : 'text-gray-800'}`}>
                        <FileText className="w-5 h-5" /> 分類預算詳情
                    </h3>
                    <button
                        onClick={handleSaveBudget}
                        className="bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 text-sm flex items-center gap-1"
                    >
                        <Save className="w-4 h-4" /> 儲存設定
                    </button>
                </div>

                {/* Category list area */}
                <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar mb-4">
                    {localBudgets.categoryLimits.map((item, index) => (
                        <div
                            key={item.name}
                            className={`border rounded-lg p-3 ${isDark ? 'border-slate-600 bg-slate-700/50' : 'border-gray-200 bg-gray-50'}`}
                        >
                            {/* Header row - Click to expand */}
                            <div
                                className="flex justify-between items-center cursor-pointer select-none"
                                onClick={() => setExpandedCategory(expandedCategory === index ? null : index)}
                            >
                                <span className="font-medium">{item.name}</span>
                                <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                                    <span>
                                        月: {item.monthly || 0} / 年: {item.yearly || 0}
                                    </span>
                                    {expandedCategory === index ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                </div>
                            </div>

                            {/* Expandable edit area */}
                            {expandedCategory === index && (
                                <div className="mt-3 grid grid-cols-2 gap-3 pt-3 border-t border-dashed border-gray-300 dark:border-slate-500 animate-in fade-in slide-in-from-top-1">
                                    <div>
                                        <label className="text-xs text-gray-500 mb-1 block">月限額</label>
                                        <input
                                            type="number"
                                            value={item.monthly}
                                            onChange={(e) => handleCategoryLimitChange(index, 'monthly', e.target.value)}
                                            placeholder="無限制"
                                            className={`w-full text-sm border rounded p-1.5 outline-none focus:ring-1 focus:ring-blue-500 ${isDark ? 'bg-slate-600 border-slate-500 text-white' : 'bg-white border-gray-300'}`}
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs text-gray-500 mb-1 block">年限額</label>
                                        <input
                                            type="number"
                                            value={item.yearly}
                                            onChange={(e) => handleCategoryLimitChange(index, 'yearly', e.target.value)}
                                            placeholder="無限制"
                                            className={`w-full text-sm border rounded p-1.5 outline-none focus:ring-1 focus:ring-blue-500 ${isDark ? 'bg-slate-600 border-slate-500 text-white' : 'bg-white border-gray-300'}`}
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                    {localBudgets.categoryLimits.length === 0 && <p className="text-sm text-gray-400 text-center py-4">尚無分類，請先新增分類</p>}
                </div>

                {/* Summary row (displayed below the list) */}
                <div className={`mt-2 p-3 rounded-lg border-t-2 ${isDark ? 'bg-slate-700/80 border-slate-500' : 'bg-gray-100 border-gray-300'}`}>
                    <div className="flex justify-between items-center">
                        <span className={`font-bold ${isDark ? 'text-slate-200' : 'text-gray-700'}`}>分類總計 (Total)</span>
                        <div className="flex flex-col sm:flex-row gap-2 sm:gap-6 text-sm font-mono text-right">
                            <span
                                className={
                                    totalCatMonthly > parseInt(localBudgets.monthly || 0) ? 'text-red-500 font-bold' : 'text-green-600 font-bold'
                                }
                            >
                                月: {totalCatMonthly.toLocaleString()}
                                <span className="text-xs font-normal text-gray-400 ml-1">
                                    / {parseInt(localBudgets.monthly || 0).toLocaleString()}
                                </span>
                            </span>
                            <span
                                className={
                                    totalCatYearly > parseInt(localBudgets.yearly || 0) ? 'text-red-500 font-bold' : 'text-green-600 font-bold'
                                }
                            >
                                年: {totalCatYearly.toLocaleString()}
                                <span className="text-xs font-normal text-gray-400 ml-1">
                                    / {parseInt(localBudgets.yearly || 0).toLocaleString()}
                                </span>
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* 3. Category Management */}
            <div className={`p-6 rounded-xl shadow-sm ${isDark ? 'bg-slate-800' : 'bg-white'}`}>
                <h3 className="font-bold mb-4 text-sm text-gray-500 uppercase tracking-wider">新增/刪除分類</h3>
                <div className="flex gap-2 mb-4">
                    <input
                        type="text"
                        placeholder="輸入新分類名稱"
                        value={newCategory}
                        onChange={(e) => setNewCategory(e.target.value)}
                        className={`flex-1 border rounded-lg p-2 outline-none focus:ring-2 focus:ring-blue-500 ${isDark ? 'bg-slate-700 border-slate-600 text-slate-100 placeholder-slate-400' : 'bg-white border-gray-200'}`}
                    />
                    <button onClick={handleAdd} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
                        新增
                    </button>
                </div>
                <div className="flex flex-wrap gap-2">
                    {categories.map((cat) => (
                        <div
                            key={cat}
                            className={`pl-3 pr-2 py-1 rounded-full text-sm border flex items-center gap-2 group ${isDark ? 'bg-slate-700 text-slate-200 border-slate-600' : 'bg-gray-100 text-gray-700 border-gray-200'}`}
                        >
                            {cat}
                            <button
                                onClick={() => onDeleteCategory(cat)}
                                className="p-0.5 rounded-full hover:bg-red-500 hover:text-white text-gray-400 transition-colors"
                                title="刪除分類"
                            >
                                <X className="w-3 h-3" />
                            </button>
                        </div>
                    ))}
                </div>
            </div>

            {/* 4. System Options */}
            <div className={`p-6 rounded-xl shadow-sm ${isDark ? 'bg-slate-800' : 'bg-white'}`}>
                <h3 className={`font-bold mb-4 flex items-center gap-2 ${isDark ? 'text-slate-200' : 'text-gray-800'}`}>
                    <Power className="w-5 h-5" /> 系統選項
                </h3>
                <div className="flex flex-col gap-3">
                    {/* Hidden file input */}
                    <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".csv" className="hidden" />

                    {/* Import Button */}
                    <button
                        onClick={triggerImport}
                        className="flex items-center justify-center gap-2 w-full py-3 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition"
                    >
                        <Upload className="w-5 h-5" /> 匯入天天記帳資料 (CSV)
                    </button>

                    <button
                        onClick={onExport}
                        className="flex items-center justify-center gap-2 w-full py-3 rounded-lg bg-green-600 text-white hover:bg-green-700 transition"
                    >
                        <Download className="w-5 h-5" /> 匯出資料 (CSV)
                    </button>

                    {/* Account Management Button (Toggle) */}
                    <button
                        onClick={() => setExpandedCategory(expandedCategory === 'account_mgmt' ? null : 'account_mgmt')}
                        className="flex items-center justify-center gap-2 w-full py-3 rounded-lg bg-gray-500 text-white hover:bg-gray-600 transition"
                    >
                        <SettingsIcon className="w-5 h-5" /> 帳號管理
                    </button>

                    {/* Account Management Sub-section */}
                    {expandedCategory === 'account_mgmt' && (
                        <div className={`mt-2 p-4 rounded-lg border ${isDark ? 'border-red-800 bg-red-900/20' : 'border-red-100 bg-red-50'}`}>
                            <h4 className={`font-bold mb-2 ${isDark ? 'text-red-400' : 'text-red-600'}`}></h4>
                            <p className="text-sm text-gray-500 mb-4">刪除帳號將無法登入，所有資料將被刪除。</p>
                            <button
                                onClick={() => {
                                    if (window.confirm('確定要刪除帳號嗎？此動作將使您無法再登入此帳號。')) {
                                        onDeleteAccount();
                                    }
                                }}
                                className="flex items-center justify-center gap-2 w-full py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 transition"
                            >
                                <LogOut className="w-4 h-4" /> 確認刪除帳號
                            </button>
                        </div>
                    )}

                    <button
                        onClick={onLogout}
                        className="flex items-center justify-center gap-2 w-full py-3 rounded-lg bg-red-500 text-white hover:bg-red-600 transition"
                    >
                        <LogOut className="w-5 h-5" /> 登出帳號
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SettingsView;
