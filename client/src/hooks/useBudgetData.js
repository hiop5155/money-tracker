import { useState, useMemo, useEffect, useCallback } from 'react';
import { useApi } from './useApi';

export const useBudgetData = (token, onLogout) => {
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

    // --- Effects (Fetch Data) ---
    const refreshData = useCallback(async () => {
        const res = await api('/data');
        if (res?.ok) {
            const data = await res.json();
            setExpenses(data.expenses || []);
            setCategories(data.categories || []);
            if (data.budget) setBudgets(data.budget);
            return data;
        }
    }, [api]);

    useEffect(() => {
        const init = async () => {
            try {
                const [data, recurringRes] = await Promise.all([refreshData(), api('/recurring')]);
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
    }, [api, refreshData]);

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
            alert('儲存失敗');
            return false;
        }
    };

    const handleDeleteExpense = async (id) => {
        if (window.confirm('確定要刪除這筆支出嗎？')) {
            setDeletingId(id);
            try {
                const res = await api(`/expenses/${id}`, { method: 'DELETE' });
                if (res.ok) setExpenses((prev) => prev.filter((e) => e.id !== id));
            } catch (error) {
                alert('刪除失敗');
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
            alert('儲存固定支出失敗');
            return false;
        }
    };

    const handleDeleteRecurring = async (id) => {
        if (window.confirm('刪除固定支出會一併刪除相關記帳資料，確定嗎？')) {
            setDeletingId(id);
            try {
                const res = await api(`/recurring/${id}`, { method: 'DELETE' });
                if (res.ok) {
                    setRecurringRules((prev) => prev.filter((r) => r._id !== id));
                    await refreshData();
                }
            } catch (error) {
                alert('刪除失敗');
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
                alert('新增分類失敗');
            }
        }
    };

    const handleDeleteCategory = async (catToDelete) => {
        if (window.confirm(`確定要刪除分類「${catToDelete}」嗎？`)) {
            try {
                const res = await api(`/categories/${catToDelete}`, { method: 'DELETE' });
                if (res.ok) setCategories(categories.filter((c) => c !== catToDelete));
            } catch (error) {
                alert('刪除失敗');
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

    // CSV Export
    const exportToCSV = () => {
        const headers = ['日期', '分類', '金額', '備註', '類型'];
        const rows = expenses.map((e) => [e.date, e.category, e.amount, `"${e.note || ''}"`, e.type || 'expense']);
        const csvContent = ['\uFEFF' + headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `記帳資料_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // CSV Import
    const handleImportCSV = async (file) => {
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
                alert(result.message);
                await refreshData();
                return true;
            } else {
                const err = await res.json();
                alert('Import Failed: ' + (err.error || 'Unknown error'));
                return false;
            }
        } catch (error) {
            console.error('Import error:', error);
            alert('An error occurred during import.');
            return false;
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
    };
};
