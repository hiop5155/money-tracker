/**
 * Smart Insight Engine
 * Analyzes expense data to provide actionable insights.
 * 
 * Algorithms:
 * 1. Anomaly Detection (Z-Score)
 * 2. Budget Burn Rate Projection
 * 3. Month-over-Month Comparison
 */

export const generateInsights = (expenses = [], budgets = {}, categories = []) => {
    const insights = [];
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth(); // 0-indexed
    const currentDay = today.getDate();

    // Sort expenses by date desc
    const sortedExpenses = [...expenses].sort((a, b) => new Date(b.date) - new Date(a.date));

    // Helper: Get expenses for a specific month (YYYY-MM)
    const getMonthExpenses = (year, month) => {
        const prefix = `${year}-${String(month + 1).padStart(2, '0')}`;
        return sortedExpenses.filter(e => e.date && e.date.startsWith(prefix) && (e.type === 'expense' || !e.type));
    };

    const currentMonthExpenses = getMonthExpenses(currentYear, currentMonth);
    const lastMonthExpenses = getMonthExpenses(currentYear, currentMonth - 1 < 0 ? 11 : currentMonth - 1);

    const currentTotal = currentMonthExpenses.reduce((sum, e) => sum + Number(e.amount), 0);
    const lastMonthTotal = lastMonthExpenses.reduce((sum, e) => sum + Number(e.amount), 0);

    // --- 1. Budget Burn Rate Alert ---
    const monthlyBudget = budgets.monthly || 0;
    if (monthlyBudget > 0) {
        const progress = currentTotal / monthlyBudget;
        const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
        const monthProgress = currentDay / daysInMonth;

        // If spending speed is significantly faster than time passed
        // e.g., Day 10 (33%) but spent 60% budget
        if (progress > monthProgress + 0.2 && progress < 1.0) {
            insights.push({
                type: 'warning',
                title: '預算消耗過快',
                message: `目前才過 ${Math.round(monthProgress * 100)}% 的時間，但您已使用了 ${Math.round(progress * 100)}% 的預算。`,
                priority: 5
            });
        }

        if (progress >= 1.0) {
            insights.push({
                type: 'danger',
                title: '預算超支警報',
                message: `本月支出 $${currentTotal.toLocaleString()} 已超過預算 $${monthlyBudget.toLocaleString()}！`,
                priority: 10
            });
        }
    }

    // --- 2. Anomaly Detection (Category Spike) ---
    // Analyze last 6 months for each category
    const categoryStats = {};
    categories.forEach(cat => {
        // Gather last 6 months category totals
        const history = [];
        for (let i = 1; i <= 6; i++) {
            let y = currentYear;
            let m = currentMonth - i;
            if (m < 0) {
                m += 12;
                y -= 1;
            }
            const monthData = getMonthExpenses(y, m);
            const total = monthData.filter(e => (e.category || '').trim() === cat).reduce((sum, e) => sum + Number(e.amount), 0);
            if (total > 0) history.push(total);
        }

        if (history.length >= 3) { // Need at least 3 months data
            const mean = history.reduce((a, b) => a + b, 0) / history.length;
            const variance = history.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / history.length;
            const stdDev = Math.sqrt(variance);

            const currentCatTotal = currentMonthExpenses.filter(e => (e.category || '').trim() === cat).reduce((sum, e) => sum + Number(e.amount), 0);

            // Threshold: Mean + 1.5 SD (Mild Anomaly)
            if (currentCatTotal > mean + 1.5 * stdDev && currentCatTotal > 1000) { // Should be meaningful amount
                const percent = Math.round(((currentCatTotal - mean) / mean) * 100);
                insights.push({
                    type: 'warning',
                    title: `「${cat}」支出異常`,
                    message: `本月已花費 $${currentCatTotal.toLocaleString()}，比過去半年平均高出 ${percent}%。`,
                    priority: 8
                });
            }
        }
    });

    // --- 3. Month-over-Month Improvement ---
    // Only check if we are past mid-month to make comparison fair
    if (currentDay > 15) {
        // Compare same timeframe if possible, or simplified total comparison
        // Here we do simple total check if last month exists
        if (lastMonthTotal > 0 && currentTotal < lastMonthTotal * 0.8) {
            insights.push({
                type: 'success',
                title: '支出控制良好',
                message: `本月目前支出比上個月少了 ${Math.round((1 - currentTotal / lastMonthTotal) * 100)}%，繼續保持！`,
                priority: 3
            });
        }
    }

    // Sort by priority desc
    return insights.sort((a, b) => b.priority - a.priority);
};
