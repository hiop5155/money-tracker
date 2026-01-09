import React, { useState, useEffect } from 'react';

const ExpenseModal = ({ isOpen, onClose, onSave, initialData, selectedDate, categories, isDark }) => {
    const [formData, setFormData] = useState({ amount: '', category: '', note: '' });

    useEffect(() => {
        if (initialData) {
            setFormData({
                amount: initialData.amount,
                category: initialData.category,
                note: initialData.note || '',
            });
        } else {
            setFormData({
                amount: '',
                category: categories[0] || '',
                note: '',
            });
        }
    }, [initialData, categories, isOpen]);

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave(formData);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <div
                className={`rounded-xl shadow-xl max-w-md w-full p-6 animate-in fade-in zoom-in duration-200 ${isDark ? 'bg-slate-800 text-slate-100' : 'bg-white text-gray-800'}`}
            >
                <h2 className="text-xl font-bold mb-4">{initialData ? '編輯支出' : '新增支出'}</h2>
                <p className={`text-sm mb-4 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>日期: {selectedDate.toLocaleDateString()}</p>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>金額</label>
                        <input
                            type="number"
                            required
                            autoFocus
                            placeholder="0"
                            value={formData.amount}
                            onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                            className={`w-full border rounded-lg p-2 text-lg font-bold outline-none focus:ring-2 focus:ring-blue-500 ${isDark ? 'bg-slate-700 border-slate-600 text-slate-100' : 'bg-white border-gray-200 text-gray-800'}`}
                        />
                    </div>
                    <div>
                        <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>分類</label>
                        <select
                            value={formData.category}
                            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                            className={`w-full border rounded-lg p-2 outline-none focus:ring-2 focus:ring-blue-500 ${isDark ? 'bg-slate-700 border-slate-600 text-slate-100' : 'bg-white border-gray-200'}`}
                        >
                            {categories.map((c) => (
                                <option key={c} value={c}>
                                    {c}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>備註 (選填)</label>
                        <input
                            type="text"
                            placeholder="例如: 牛肉麵"
                            value={formData.note}
                            onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                            className={`w-full border rounded-lg p-2 outline-none focus:ring-2 focus:ring-blue-500 ${isDark ? 'bg-slate-700 border-slate-600 text-slate-100 placeholder-slate-400' : 'bg-white border-gray-200'}`}
                        />
                    </div>
                    <div className="flex gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className={`flex-1 py-2 rounded-lg border ${isDark ? 'border-slate-600 text-slate-300 hover:bg-slate-700' : 'border-gray-300 text-gray-600 hover:bg-gray-50'}`}
                        >
                            取消
                        </button>
                        <button type="submit" className="flex-1 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700">
                            儲存
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ExpenseModal;
