import React, { useState, useMemo } from 'react';
import { Search, Filter, X, Tag, Pencil } from 'lucide-react';
import { getCalcUrl } from '../../utils/calcUrl';

import { usePlan } from '../../context/PlanContext';
import { useTranslation } from '../../i18n';

const SearchView = ({
    isDark,
    expenses,
    categories,
    onEditExpense,
}) => {
    const { t, formatCurrency } = useTranslation();
    // 方案權限直接由金流模組取得
    const { isPro, userPlan, openUpgradeModal } = usePlan();

    // --- Search Condition State ---
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('');
    const [minAmount, setMinAmount] = useState('');
    const [maxAmount, setMaxAmount] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    // --- Core Filtering Logic (Optimized with useMemo) ---
    const filteredExpenses = useMemo(() => {
        // Ensure expenses is an array
        if (!Array.isArray(expenses)) return [];

        return expenses.filter((item) => {
            // 1. Keyword Search (Search in note or category name)
            // If no keyword is entered, consider it a match (true)
            const matchTerm = searchTerm
                ? (item.note || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                (item.category || '').toLowerCase().includes(searchTerm.toLowerCase())
                : true;

            // 2. Category Filtering
            const matchCategory = selectedCategory ? item.category === selectedCategory : true;

            // 3. Amount Range
            const amount = Number(item.amount);
            const matchMin = minAmount ? amount >= Number(minAmount) : true;
            const matchMax = maxAmount ? amount <= Number(maxAmount) : true;

            // 4. Date Range
            // item.date assumed to be ISO string or Date object
            const itemDate = new Date(item.date);
            // Eliminate time difference, compare only date (set to 00:00:00)
            itemDate.setHours(0, 0, 0, 0);

            let matchStartDate = true;
            if (startDate) {
                const start = new Date(startDate);
                start.setHours(0, 0, 0, 0);
                matchStartDate = itemDate >= start;
            }

            let matchEndDate = true;
            if (endDate) {
                const end = new Date(endDate);
                end.setHours(0, 0, 0, 0);
                matchEndDate = itemDate <= end;
            }

            // All conditions must be true
            return matchTerm && matchCategory && matchMin && matchMax && matchStartDate && matchEndDate;
        });
    }, [expenses, searchTerm, selectedCategory, minAmount, maxAmount, startDate, endDate]);

    // --- Clear All Conditions ---
    const handleClearFilters = () => {
        setSearchTerm('');
        setSelectedCategory('');
        setMinAmount('');
        setMaxAmount('');
        setStartDate('');
        setEndDate('');
    };

    // Calculate total amount
    const totalAmount = filteredExpenses.reduce((sum, item) => sum + Number(item.amount), 0);

    return (
        <div className="w-full flex flex-col gap-4 animate-fade-in md:h-full md:overflow-hidden">
            {/* Fixed Search Control Panel */}
            <div className={`flex-none p-4 rounded-lg shadow-sm transition-colors shrink-0 ${isDark ? 'bg-slate-800' : 'bg-white'}`}>
                <div className="flex justify-between items-center mb-4">
                    <h3 className={`font-bold flex items-center gap-2 ${isDark ? 'text-slate-200' : 'text-gray-800'}`}>
                        <Search className="w-5 h-5" /> {t('search.title')}
                    </h3>
                    <button
                        onClick={handleClearFilters}
                        className="text-sm text-blue-500 hover:text-blue-600 hover:underline flex items-center gap-1"
                    >
                        <X className="w-3 h-3" /> {t('search.clearFilters')}
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {/* 1. Keyword */}
                    <div className="col-span-1 md:col-span-2 lg:col-span-3">
                        <div className="relative">
                            <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                            <input
                                type="text"
                                placeholder={t('search.placeholder')}
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className={`w-full pl-9 pr-4 py-2 rounded border focus:ring-2 focus:ring-blue-500 outline-none ${isDark ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-gray-300'
                                    }`}
                            />
                        </div>
                    </div>

                    {/* 2. Category */}
                    <div>
                        <label className="text-xs text-gray-500 mb-1 block">{t('search.category')}</label>
                        <div className="relative">
                            <Tag className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                            <select
                                value={selectedCategory}
                                onChange={(e) => setSelectedCategory(e.target.value)}
                                className={`w-full pl-9 pr-4 py-2 rounded border focus:ring-2 focus:ring-blue-500 outline-none appearance-none ${isDark ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-gray-300'
                                    }`}
                            >
                                <option value="">{t('search.allCategories')}</option>
                                {categories.map((cat) => (
                                    <option key={cat} value={cat}>
                                        {cat}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* 3. Amount Range (Min - Max) */}
                    <div className="grid grid-cols-2 gap-2 w-full min-w-0">
                        <div className="min-w-0">
                            <label className="text-xs text-gray-500 mb-1 block">{t('search.minAmount')}</label>
                            <input
                                type="number"
                                placeholder={t('search.minPlaceholder')}
                                value={minAmount}
                                onChange={(e) => setMinAmount(e.target.value)}
                                className={`w-full h-10 px-3 py-2 rounded-lg border text-sm focus:ring-2 focus:ring-blue-500 outline-none box-border ${isDark ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400' : 'bg-white border-gray-300'
                                    }`}
                            />
                        </div>
                        <div className="min-w-0">
                            <label className="text-xs text-gray-500 mb-1 block">{t('search.maxAmount')}</label>
                            <input
                                type="number"
                                placeholder={t('search.maxPlaceholder')}
                                value={maxAmount}
                                onChange={(e) => setMaxAmount(e.target.value)}
                                className={`w-full h-10 px-3 py-2 rounded-lg border text-sm focus:ring-2 focus:ring-blue-500 outline-none box-border ${isDark ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400' : 'bg-white border-gray-300'
                                    }`}
                            />
                        </div>
                    </div>

                    {/* 4. Date Range */}
                    <div className="grid grid-cols-2 gap-2 w-full min-w-0">
                        <div className="min-w-0">
                            <label className="text-xs text-gray-500 mb-1 block">{t('search.startDate')}</label>
                            <input
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                style={{ WebkitAppearance: 'none', appearance: 'none', minHeight: '40px', maxWidth: '100%', minWidth: '0' }}
                                className={`w-full block min-w-0 max-w-full h-10 px-2 sm:px-3 py-2 rounded-lg border text-xs sm:text-sm focus:ring-2 focus:ring-blue-500 outline-none box-border ${isDark ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-gray-300'
                                    }`}
                            />
                        </div>
                        <div className="min-w-0">
                            <label className="text-xs text-gray-500 mb-1 block">{t('search.endDate')}</label>
                            <input
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                style={{ WebkitAppearance: 'none', appearance: 'none', minHeight: '40px', maxWidth: '100%', minWidth: '0' }}
                                className={`w-full block min-w-0 max-w-full h-10 px-2 sm:px-3 py-2 rounded-lg border text-xs sm:text-sm focus:ring-2 focus:ring-blue-500 outline-none box-border ${isDark ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-gray-300'
                                    }`}
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Scrollable Results List */}
            <div
                className={`p-4 pb-32 rounded-lg shadow-sm transition-colors shrink-0 custom-scrollbar md:min-h-0 md:flex-1 md:overflow-y-auto ${isDark ? 'bg-slate-800' : 'bg-white'}`}
            >
                <div className="flex justify-between items-center mb-4 border-b pb-2 border-gray-200 dark:border-slate-700 shrink-0 sticky top-0 bg-inherit z-10">
                    <h4 className={`font-bold ${isDark ? 'text-slate-200' : 'text-gray-800'}`}>{t('search.resultsCount', { count: filteredExpenses.length })}</h4>
                    <span className="font-mono font-bold text-blue-600 dark:text-blue-400">{t('search.totalAmount', { amount: totalAmount.toLocaleString() })}</span>
                </div>

                {filteredExpenses.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                                    <th className="p-2">{t('search.colDate')}</th>
                                    <th className="p-2">{t('search.colCategory')}</th>
                                    <th className="p-2">{t('search.colNote')}</th>
                                    <th className="p-2 text-right">{t('search.colAmount')}</th>
                                    {onEditExpense && <th className="p-2 w-8"></th>}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                                {filteredExpenses.map((item) => (
                                    <tr
                                        key={item.id || item._id}
                                        className={`group ${onEditExpense ? 'cursor-pointer' : ''} hover:bg-gray-50 dark:hover:bg-slate-700/50`}
                                        onClick={() => onEditExpense && onEditExpense(item)}
                                    >
                                        <td className={`p-2 text-sm ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
                                            {new Date(item.date).toLocaleDateString()}
                                        </td>
                                        <td className="p-2">
                                            <span
                                                className={`px-2 py-0.5 rounded text-xs ${isDark ? 'bg-slate-600 text-slate-200' : 'bg-gray-100 text-gray-600'}`}
                                            >
                                                {item.category || t('common.uncategorized')}
                                            </span>
                                        </td>
                                        <td className={`p-2 text-sm ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>{item.note || ''}</td>
                                        <td
                                            className={`p-2 text-right font-mono font-medium ${item.type === 'income' ? 'text-green-500' : 'text-red-500'
                                                }`}
                                        >
                                            {item.type === 'income' ? '+' : '-'}
                                            {Number(item.amount).toLocaleString()}
                                        </td>
                                        {onEditExpense && (
                                            <td className="p-2 text-center">
                                                <Pencil className="w-3.5 h-3.5 opacity-0 group-hover:opacity-50 transition-opacity inline-block" />
                                            </td>
                                        )}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="text-center py-10 text-gray-400">
                        <Filter className="w-12 h-12 mx-auto mb-2 opacity-20" />
                        <p>{t('search.noResults')}</p>
                    </div>
                )}

            </div>

            {/* Footer */}
            <footer className="text-center py-8 border-t border-gray-200 dark:border-slate-700 mt-2 shrink-0">
                <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm mb-4">
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

export default SearchView;
