import React, { useState, useEffect, useMemo } from 'react';
import { Lightbulb, AlertTriangle, TrendingDown, TrendingUp, X } from 'lucide-react';
import { generateInsights } from '../../utils/insightEngine';

const InsightCard = ({ expenses, budgets, categories, isDark }) => {
    const [isVisible, setIsVisible] = useState(true);
    const [topInsight, setTopInsight] = useState(null);

    useEffect(() => {
        // Run analysis when data changes
        if (expenses && expenses.length > 0) {
            const results = generateInsights(expenses, budgets, categories);
            if (results.length > 0) {
                setTopInsight(results[0]); // Show highest priority only
                setIsVisible(true);
            } else {
                setTopInsight(null);
            }
        }
    }, [expenses, budgets, categories]);

    if (!topInsight || !isVisible) return null;

    // Style config based on type
    const styles = {
        warning: {
            bg: isDark ? 'bg-amber-900/30' : 'bg-amber-50',
            border: isDark ? 'border-amber-700/50' : 'border-amber-200',
            iconColor: 'text-amber-500',
            textColor: isDark ? 'text-amber-200' : 'text-amber-800',
            Icon: AlertTriangle
        },
        danger: {
            bg: isDark ? 'bg-red-900/30' : 'bg-red-50',
            border: isDark ? 'border-red-700/50' : 'border-red-200',
            iconColor: 'text-red-500',
            textColor: isDark ? 'text-red-200' : 'text-red-800',
            Icon: TrendingUp
        },
        success: {
            bg: isDark ? 'bg-emerald-900/30' : 'bg-emerald-50',
            border: isDark ? 'border-emerald-700/50' : 'border-emerald-200',
            iconColor: 'text-emerald-500',
            textColor: isDark ? 'text-emerald-200' : 'text-emerald-800',
            Icon: Lightbulb // or TrendingDown for cost reduction
        }
    };

    const config = styles[topInsight.type] || styles.warning;
    const Icon = config.Icon;

    return (
        <div className={`mb-6 rounded-xl border p-4 flex items-start gap-4 shadow-sm animate-in slide-in-from-top-2 duration-300 ${config.bg} ${config.border}`}>
            <div className={`p-2 rounded-full bg-white/50 dark:bg-black/20 shrink-0 ${config.iconColor}`}>
                <Icon className="w-5 h-5" />
            </div>

            <div className="flex-1">
                <h4 className={`font-bold text-sm mb-1 ${config.textColor}`}>
                    {topInsight.title}
                </h4>
                <p className={`text-sm opacity-90 ${config.textColor}`}>
                    {topInsight.message}
                </p>
            </div>

            <button
                onClick={() => setIsVisible(false)}
                className={`p-1 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors ${config.textColor}`}
            >
                <X className="w-4 h-4" />
            </button>
        </div>
    );
};

export default InsightCard;
