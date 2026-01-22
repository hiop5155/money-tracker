import React from 'react';
import { Repeat, Plus, Edit, Trash2, Loader2 } from 'lucide-react';

const RecurringView = ({ isDark, recurringRules, onAddRule, onEditRule, onDeleteRule, deletingId }) => {
    return (
        <div className="h-full flex flex-col gap-4 overflow-hidden animate-in fade-in zoom-in-95 duration-300">
            {/* Fixed Header */}
            <div className={`flex-none p-4 rounded-xl shadow-sm flex justify-between items-center shrink-0 ${isDark ? 'bg-slate-800' : 'bg-white'}`}>
                <h3 className={`font-bold flex items-center gap-2 ${isDark ? 'text-slate-200' : 'text-gray-800'}`}>
                    <Repeat className="w-5 h-5" /> 固定支出管理
                </h3>
                <button
                    onClick={onAddRule}
                    className="bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 text-sm flex items-center gap-1"
                >
                    <Plus className="w-4 h-4" /> 新增規則
                </button>
            </div>

            {/* Scrollable List */}
            <div className={`flex-1 overflow-y-auto p-4 rounded-xl shadow-sm min-h-0 custom-scrollbar ${isDark ? 'bg-slate-800' : 'bg-white'}`}>
                <div className="space-y-4">
                    {recurringRules.length === 0 ? (
                        <p className={`text-center py-8 ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>目前沒有固定支出設定</p>
                    ) : (
                        recurringRules.map((rule) => (
                            <div
                                key={rule._id}
                                className={`p-4 rounded-lg border ${isDark ? 'bg-slate-700/50 border-slate-600' : 'bg-gray-50 border-gray-100'}`}
                            >
                                <div className="flex justify-between items-start">
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className={`font-bold text-lg ${isDark ? 'text-slate-200' : 'text-gray-800'}`}>{rule.title}</span>
                                            <span
                                                className={`text-xs px-2 py-0.5 rounded-full ${rule.frequency === 'monthly' ? 'bg-green-100 text-green-700' : 'bg-purple-100 text-purple-700'}`}
                                            >
                                                {rule.frequency === 'monthly' ? '每月' : '每年'}
                                            </span>
                                        </div>
                                        <p className={`text-sm mb-2 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                                            ${rule.amount} · {rule.category}
                                        </p>
                                        <p className="text-xs text-gray-400">
                                            {new Date(rule.startDate).toLocaleDateString()} ~ {new Date(rule.endDate).toLocaleDateString()}
                                        </p>
                                    </div>
                                    <div className="flex gap-2">
                                        <button onClick={() => onEditRule(rule)} className="p-2 text-gray-400 hover:text-blue-500 transition-colors">
                                            <Edit className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => onDeleteRule(rule._id)}
                                            className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                                        >
                                            {deletingId === rule._id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

export default RecurringView;
