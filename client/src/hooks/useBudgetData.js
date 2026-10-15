import { useState, useMemo, useEffect, useCallback } from 'react';
import { useApi } from './useApi';
import { useTranslation } from '../i18n';

export const useBudgetData = (token, onLogout) => {
    const { t } = useTranslation();
    const { isApiLoading, execute: api } = useApi(token, onLogout);

    // --- State ---
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [isInitialLoading, setIsInitialLoading] = useState(true);
    const [deletingId, setDeletingId] = useState(null);

    // Data
    const [expenses, setExpenses] = useState([]);
    const [recurringRules, setRecurringRules] = useState([]);
    const [categories, setCategories] = useState([]);
    const [budgets, setBudgets] = useState({ monthly: 10000, yearly: 120000 });
    const [userPlan, setUserPlan] = useState(() => localStorage.getItem('local_dev_user_plan') || 'free');
    const [planExpiresAt, setPlanExpiresAt] = useState(null);
    const [isAutoRenewing, setIsAutoRenewing] = useState(false);

    // --- Effects (Fetch Data) ---
    const refreshData = useCallback(async () => {
        const res = await api('/data');
        if (res?.ok) {
            const data = await res.json();
            setExpenses(data.expenses || []);
            setCategories(data.categories || []);
            if (data.budget) setBudgets(data.budget);
            if (data.userPlan) {
                setUserPlan(data.userPlan);
                localStorage.setItem('local_dev_user_plan', data.userPlan);
            }
            if (data.planExpiresAt !== undefined) setPlanExpiresAt(data.planExpiresAt);
            return data;
        }
    }, [api]);

    const refreshUserPlan = useCallback(async () => {
        try {
            const res = await api('/payment/status');
            if (res?.ok) {
                const data = await res.json();
                setUserPlan(data.planType || 'free');
                setPlanExpiresAt(data.planExpiresAt || null);
                if (data.isAutoRenewing !== undefined) {
                    setIsAutoRenewing(Boolean(data.isAutoRenewing));
                }
                localStorage.setItem('local_dev_user_plan', data.planType || 'free');
                return {
                    isPro: !!data.isPro,
                    planType: data.planType,
                    planExpiresAt: data.planExpiresAt,
                    isAutoRenewing: Boolean(data.isAutoRenewing),
                    userId: data.userId,
                    email: data.email,
                };
            }
        } catch (error) {
            console.error('Failed to refresh user plan:', error);
        }
        return { isPro: false, planType: 'free' };
    }, [api]);

    useEffect(() => {
        const init = async () => {
            try {
                const [data, recurringRes, planRes] = await Promise.all([
                    refreshData(),
                    api('/recurring'),
                    refreshUserPlan(),
                ]);
                if (recurringRes?.ok) {
                    setRecurringRules((await recurringRes.json()) || []);
                }
            } catch (error) {
                console.error('Error fetching data:', error);
            } finally {
                setIsInitialLoading(false);
            }
        };
        init();
    }, [api, refreshData, refreshUserPlan]);

    // --- Pro Plan State & Helpers ---
    const isPro = useMemo(() => {
        if (userPlan === 'pro_lifetime' || userPlan === 'lifetime') return true;
        if (planExpiresAt) {
            return new Date(planExpiresAt) > new Date();
        }
        if (userPlan === 'pro') return true;
        return false;
    }, [userPlan, planExpiresAt]);

    const simulateUpgrade = useCallback(async (planType = 'pro_monthly') => {
        let expiresAt = null;
        let isRenewing = false;
        if (planType === 'pro_monthly') {
            const d = new Date();
            d.setDate(d.getDate() + 32);
            expiresAt = d.toISOString();
            isRenewing = true;
        } else if (planType === 'pro_yearly') {
            const d = new Date();
            d.setDate(d.getDate() + 370);
            expiresAt = d.toISOString();
            isRenewing = true;
        }

        // 1. 本地立即更新 state 與 localStorage，確保前端 100% 響應測試
        setUserPlan(planType);
        setPlanExpiresAt(expiresAt);
        setIsAutoRenewing(isRenewing);
        localStorage.setItem('local_dev_user_plan', planType);

        let result = {
            success: true,
            isPro: planType !== 'free',
            planType,
            planExpiresAt: expiresAt,
            isAutoRenewing: isRenewing,
            message: planType === 'free' ? t('pro.simFreeSuccess') : t('pro.simSwitchSuccess', { plan: planType }),
        };

        // 2. 同步發送到後端 API
        try {
            const res = await api('/payment/simulate-upgrade', {
                method: 'POST',
                body: JSON.stringify({ planType }),
            });
            if (res?.ok) {
                const apiRes = await res.json();
                result = apiRes;
                setUserPlan(apiRes.planType);
                setPlanExpiresAt(apiRes.planExpiresAt);
                localStorage.setItem('local_dev_user_plan', apiRes.planType);
            }
        } catch (error) {
            console.warn('Backend simulate API call skipped or errored, using local state fallback:', error);
        }
        return result;
    }, [api, t]);

    const cancelSubscription = useCallback(async () => {
        try {
            const res = await api('/payment/cancel', { method: 'POST' });
            if (res?.ok) {
                const data = await res.json();
                const newPlan = data.planType || 'free';
                const newExpiresAt = data.planExpiresAt || null;
                setUserPlan(newPlan);
                setPlanExpiresAt(newExpiresAt);
                setIsAutoRenewing(false);
                if (newPlan === 'free' && (!newExpiresAt || new Date(newExpiresAt) <= new Date())) {
                    localStorage.removeItem('local_dev_user_plan');
                } else {
                    localStorage.setItem('local_dev_user_plan', newPlan);
                }
                const localizedMsg = data.code === 'AUTO_RENEW_CANCELLED'
                    ? t('pro.cancelSuccess')
                    : t('pro.simFreeSuccess');
                return {
                    success: true,
                    message: localizedMsg,
                    ...data,
                };
            }
        } catch (error) {
            console.warn('Backend cancel subscription call skipped or errored:', error);
        }
        setIsAutoRenewing(false);
        return { success: false, message: t('pro.cancelFailed') };
    }, [api, t]);

    // --- Calculations (Memos) ---
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth();

    const monthlyExpenses = useMemo(() => {
        const prefix = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`;
        return expenses.filter((e) => e.date && e.date.startsWith(prefix));
    }, [expenses, currentYear, currentMonth]);

    const yearlyExpenses = useMemo(() => {
        return expenses.filter((e) => e.date && e.date.startsWith(String(currentYear)));
    }, [expenses, currentYear]);

    const selectedDateExpenses = useMemo(() => {
        const dateStr = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`;
        return expenses.filter((e) => e.date === dateStr);
    }, [expenses, selectedDate]);

    // Separate Income and Expenses
    const monthlyStats = useMemo(() => {
        return monthlyExpenses.reduce(
            (acc, curr) => {
                const amount = Number(curr.amount);
                if (curr.type === 'income') {
                    acc.income += amount;
                } else {
                    acc.expense += amount;
                }
                return acc;
            },
            { income: 0, expense: 0 }
        );
    }, [monthlyExpenses]);

    const yearlyStats = useMemo(() => {
        return yearlyExpenses.reduce(
            (acc, curr) => {
                const amount = Number(curr.amount);
                if (curr.type === 'income') {
                    acc.income += amount;
                } else {
                    acc.expense += amount;
                }
                return acc;
            },
            { income: 0, expense: 0 }
        );
    }, [yearlyExpenses]);

    const monthlyTotal = monthlyStats.expense;
    const monthlyIncome = monthlyStats.income;
    const yearlyTotal = yearlyStats.expense;
    const yearlyIncome = yearlyStats.income;

    // Expenses
    const handleSaveExpense = async (formData, editingId) => {
        const dateStr = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`;
        // --- Ensure type is sent ---
        const payload = {
            date: formData.date || dateStr, // Support date selection in Modal
            category: formData.category,
            amount: Number(formData.amount),
            note: formData.note,
            type: formData.type || 'expense',
        };

        try {
            if (editingId) {
                const res = await api(`/expenses/${editingId}`, { method: 'PUT', body: JSON.stringify(payload) });
                if (res.ok) {
                    const updated = await res.json();
                    setExpenses((prev) => prev.map((e) => (e.id === editingId ? updated : e)));
                }
            } else {
                const res = await api('/expenses', { method: 'POST', body: JSON.stringify(payload) });
                if (res.ok) {
                    const saved = await res.json();
                    setExpenses((prev) => [...prev, saved]);
                }
            }
            return true; // Success
        } catch (error) {
            alert(t('alerts.saveFailed'));
            return false;
        }
    };

    const handleDeleteExpense = async (id) => {
        if (window.confirm(t('alerts.confirmDeleteExpense'))) {
            setDeletingId(id);
            try {
                const res = await api(`/expenses/${id}`, { method: 'DELETE' });
                if (res.ok) setExpenses((prev) => prev.filter((e) => e.id !== id));
            } catch (error) {
                alert(t('alerts.deleteFailed'));
            } finally {
                setDeletingId(null);
            }
        }
    };

    // Recurring
    const handleSaveRecurring = async (formData, editingId) => {
        try {
            let res;
            if (editingId) {
                res = await api(`/recurring/${editingId}`, { method: 'PUT', body: JSON.stringify(formData) });
            } else {
                res = await api('/recurring', { method: 'POST', body: JSON.stringify(formData) });
            }

            if (res.ok) {
                const savedRule = await res.json();
                setRecurringRules((prev) => (editingId ? prev.map((r) => (r._id === savedRule._id ? savedRule : r)) : [...prev, savedRule]));
                await refreshData(); // Sync expenses
                return true;
            }
        } catch (error) {
            alert(t('alerts.saveRecurringFailed'));
            return false;
        }
    };

    const handleDeleteRecurring = async (id) => {
        if (window.confirm(t('alerts.confirmDeleteRecurring'))) {
            setDeletingId(id);
            try {
                const res = await api(`/recurring/${id}`, { method: 'DELETE' });
                if (res.ok) {
                    setRecurringRules((prev) => prev.filter((r) => r._id !== id));
                    await refreshData();
                }
            } catch (error) {
                alert(t('alerts.deleteFailed'));
            } finally {
                setDeletingId(null);
            }
        }
    };

    // Settings
    const handleAddCategory = async (name) => {
        if (name && !categories.includes(name)) {
            try {
                const res = await api('/categories', { method: 'POST', body: JSON.stringify({ name }) });
                if (res.ok) setCategories([...categories, name]);
            } catch (error) {
                alert(t('alerts.addCategoryFailed'));
            }
        }
    };

    const handleDeleteCategory = async (catToDelete) => {
        if (window.confirm(t('alerts.confirmDeleteCategory', { category: catToDelete }))) {
            try {
                const res = await api(`/categories/${catToDelete}`, { method: 'DELETE' });
                if (res.ok) setCategories(categories.filter((c) => c !== catToDelete));
            } catch (error) {
                alert(t('alerts.deleteFailed'));
            }
        }
    };

    const handleUpdateBudget = async (newBudgets) => {
        setBudgets(newBudgets);
        try {
            await api('/budget', { method: 'PUT', body: JSON.stringify(newBudgets) });
        } catch (error) {
            console.error(error);
        }
    };

    // CSV Export (Pro Gated)
    const exportToCSV = (onRequirePro) => {
        if (!isPro) {
            if (typeof onRequirePro === 'function') {
                onRequirePro();
            } else {
                alert(t('alerts.upgradeRequiredExport'));
            }
            return false;
        }
        const headers = Array.isArray(t('alerts.csvExportHeaders')) ? t('alerts.csvExportHeaders') : ['日期', '分類', '金額', '備註', '類型'];
        const rows = expenses.map((e) => [e.date, e.category, e.amount, `"${e.note || ''}"`, e.type || 'expense']);
        const csvContent = ['\uFEFF' + headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `${t('alerts.csvExportFilename')}_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        return true;
    };

    // CSV Import (Pro Gated)
    const handleImportCSV = async (file, onRequirePro) => {
        if (!isPro) {
            if (typeof onRequirePro === 'function') {
                onRequirePro();
            } else {
                alert(t('alerts.upgradeRequiredImport'));
            }
            return false;
        }
        if (!file) return false;

        const formData = new FormData();
        formData.append('file', file);

        try {
            const baseUrl = import.meta.env.VITE_API_URL || '/api';
            const res = await fetch(`${baseUrl}/import/csv`, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${token}`,
                },
                body: formData,
            });

            if (res.ok) {
                const result = await res.json();
                alert(result.message || t('alerts.importSuccess'));
                await refreshData();
                return true;
            } else {
                const err = await res.json();
                if (err.error === 'UPGRADE_REQUIRED' && typeof onRequirePro === 'function') {
                    onRequirePro();
                    return false;
                }
                alert(t('alerts.importFailed', { error: err.error || err.message || 'Error' }));
                return false;
            }
        } catch (error) {
            console.error('Import error:', error);
            alert(t('alerts.importError'));
            return false;
        }
    };

    const handleDeleteAccount = async () => {
        try {
            const res = await api('/auth/delete', { method: 'PUT' });
            if (res.ok) {
                onLogout(); // Logout on success
                return true;
            } else {
                const err = await res.json();
                alert(t('alerts.deleteFailed') + ': ' + (err.error || 'Unknown error'));
            }
        } catch (error) {
            console.error(error);
            alert(t('alerts.deleteAccountError'));
        }
    };

    return {
        isApiLoading,
        isInitialLoading,
        deletingId,
        currentDate,
        selectedDate,
        expenses,
        recurringRules,
        categories,
        budgets,
        currentYear,
        currentMonth,
        monthlyExpenses,
        yearlyExpenses,
        selectedDateExpenses,
        monthlyTotal,
        yearlyTotal,
        monthlyIncome,
        yearlyIncome,
        setCurrentDate,
        setSelectedDate,
        handleSaveExpense,
        handleDeleteExpense,
        handleSaveRecurring,
        handleDeleteRecurring,
        handleAddCategory,
        handleDeleteCategory,
        handleUpdateBudget,
        exportToCSV,
        handleImportCSV,
        handleDeleteAccount,
        userPlan,
        planExpiresAt,
        isPro,
        isAutoRenewing,
        refreshUserPlan,
        simulateUpgrade,
        cancelSubscription,
    };
};
