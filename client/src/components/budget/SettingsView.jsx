import React, { useState, useEffect } from 'react';
import { Wallet, FileText, X, Power, Download, LogOut, Save } from 'lucide-react';

const SettingsView = ({ isDark, budgets, categories, onUpdateBudget, onAddCategory, onDeleteCategory, onExport, onLogout }) => {
    const [newCategory, setNewCategory] = useState('');

    const [localBudgets, setLocalBudgets] = useState({ monthly: '', yearly: '' });

    useEffect(() => {
        if (budgets) {
            setLocalBudgets({
                monthly: String(budgets.monthly),
                yearly: String(budgets.yearly),
            });
        }
    }, [budgets]);

    const handleAdd = () => {
        if (!newCategory) return;
        onAddCategory(newCategory);
        setNewCategory('');
    };

    const handleSaveBudget = () => {
        const monthlyVal = parseInt(localBudgets.monthly, 10);
        const yearlyVal = parseInt(localBudgets.yearly, 10);

        const MIN_VAL = 1;
        const MAX_VAL = 100000000;

        if (isNaN(monthlyVal) || monthlyVal < MIN_VAL || monthlyVal > MAX_VAL) {
            alert(`月預算輸入錯誤：請輸入 ${MIN_VAL} 至 ${MAX_VAL} 之間的數字`);
            return;
        }
        if (isNaN(yearlyVal) || yearlyVal < MIN_VAL || yearlyVal > MAX_VAL) {
            alert(`年預算輸入錯誤：請輸入 ${MIN_VAL} 至 ${MAX_VAL} 之間的數字`);
            return;
        }

        onUpdateBudget({ monthly: monthlyVal, yearly: yearlyVal });
        setLocalBudgets({
            monthly: String(monthlyVal),
            yearly: String(yearlyVal),
        });
    };

    return (
        <div className="space-y-6">
            {/* Budget Settings */}
            <div className={`p-6 rounded-xl shadow-sm ${isDark ? 'bg-slate-800' : 'bg-white'}`}>
                <div className="flex justify-between items-center mb-4">
                    <h3 className={`font-bold flex items-center gap-2 ${isDark ? 'text-slate-200' : 'text-gray-800'}`}>
                        <Wallet className="w-5 h-5" /> 預算設定
                    </h3>
                    {/* Save button */}
                    <button
                        onClick={handleSaveBudget}
                        className="bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 text-sm flex items-center gap-1"
                    >
                        <Save className="w-4 h-4" /> 儲存
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>月預算目標</label>
                        <input
                            type="number"
                            min="1"
                            max="100000000"
                            value={localBudgets.monthly}
                            onChange={(e) => setLocalBudgets({ ...localBudgets, monthly: e.target.value })}
                            placeholder="請輸入金額"
                            className={`w-full border rounded-lg p-2 outline-none focus:ring-2 focus:ring-blue-500 ${isDark ? 'bg-slate-700 border-slate-600 text-slate-100' : 'bg-white border-gray-200'}`}
                        />
                    </div>
                    <div>
                        <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>年預算目標</label>
                        <input
                            type="number"
                            min="1"
                            max="100000000"
                            value={localBudgets.yearly}
                            onChange={(e) => setLocalBudgets({ ...localBudgets, yearly: e.target.value })}
                            placeholder="請輸入金額"
                            className={`w-full border rounded-lg p-2 outline-none focus:ring-2 focus:ring-blue-500 ${isDark ? 'bg-slate-700 border-slate-600 text-slate-100' : 'bg-white border-gray-200'}`}
                        />
                    </div>
                </div>
            </div>

            {/* Category Settings */}
            <div className={`p-6 rounded-xl shadow-sm ${isDark ? 'bg-slate-800' : 'bg-white'}`}>
                <h3 className={`font-bold mb-4 flex items-center gap-2 ${isDark ? 'text-slate-200' : 'text-gray-800'}`}>
                    <FileText className="w-5 h-5" /> 分類管理
                </h3>
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

            {/* System Options */}
            <div className={`p-6 rounded-xl shadow-sm ${isDark ? 'bg-slate-800' : 'bg-white'}`}>
                <h3 className={`font-bold mb-4 flex items-center gap-2 ${isDark ? 'text-slate-200' : 'text-gray-800'}`}>
                    <Power className="w-5 h-5" /> 系統選項
                </h3>
                <div className="flex flex-col gap-3">
                    <button
                        onClick={onExport}
                        className="flex items-center justify-center gap-2 w-full py-3 rounded-lg bg-green-600 text-white hover:bg-green-700 transition"
                    >
                        <Download className="w-5 h-5" /> 匯出資料 (CSV)
                    </button>
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
