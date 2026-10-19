import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import CalendarView from '../components/budget/CalendarView';
import SettingsView from '../components/budget/SettingsView';
import { I18nProvider } from '../i18n';

const renderWithI18n = (ui) => render(<I18nProvider initialLanguage="zh-TW">{ui}</I18nProvider>);

describe('CalendarView 破壞性防禦測試 (break-ui)', () => {
    const mockBudgets = { monthly: 50000, yearly: 600000, categoryLimits: [] };

    it('極端數據：億級金額具備千分位逗號，超長無空格備註正確渲染且不崩潰', () => {
        const extremeExpense = {
            id: 'ext-1',
            category: '超長分類名稱測試用防爆版食品與高級餐飲',
            amount: 125000000,
            type: 'expense',
            date: '2026-10-13',
            note: 'https://example.com/very/long/unbroken/url/path/that/used/to/break/flexbox/layouts?query=test'
        };

        renderWithI18n(
            <CalendarView
                isDark={false}
                currentDate={new Date(2026, 9, 13)}
                selectedDate={new Date(2026, 9, 13)}
                monthlyExpenses={[extremeExpense]}
                selectedDateExpenses={[extremeExpense]}
                monthlyTotal={125000000}
                yearlyTotal={125000000}
                monthlyIncome={0}
                yearlyIncome={0}
                budgets={mockBudgets}
                expenses={[extremeExpense]}
                categories={['超長分類名稱測試用防爆版食品與高級餐飲']}
                onPrevMonth={vi.fn()}
                onNextMonth={vi.fn()}
                onDateChange={vi.fn()}
                onDateClick={vi.fn()}
                onAddExpense={vi.fn()}
                onEditExpense={vi.fn()}
                onDeleteExpense={vi.fn()}
                deletingId={null}
            />
        );

        // 金額應正確格式化為千分位
        expect(screen.getByText('-$125,000,000')).toBeInTheDocument();
        // 備註存在且具備 break-all line-clamp-2 樣式
        const noteEl = screen.getByText(extremeExpense.note);
        expect(noteEl).toBeInTheDocument();
        expect(noteEl.className).toContain('break-all');
        expect(noteEl.className).toContain('line-clamp-2');
    });

    it('空狀態 (Empty State)：當日無紀錄時展示優雅 Empty State 插畫與指引文案', () => {
        renderWithI18n(
            <CalendarView
                isDark={false}
                currentDate={new Date(2026, 9, 13)}
                selectedDate={new Date(2026, 9, 13)}
                monthlyExpenses={[]}
                selectedDateExpenses={[]}
                monthlyTotal={0}
                yearlyTotal={0}
                monthlyIncome={0}
                yearlyIncome={0}
                budgets={mockBudgets}
                expenses={[]}
                categories={[]}
                onPrevMonth={vi.fn()}
                onNextMonth={vi.fn()}
                onDateChange={vi.fn()}
                onDateClick={vi.fn()}
                onAddExpense={vi.fn()}
                onEditExpense={vi.fn()}
                onDeleteExpense={vi.fn()}
                deletingId={null}
            />
        );

        expect(screen.getByText('本日尚無收支記錄')).toBeInTheDocument();
        expect(screen.getByText('點擊右上角 ＋ 記錄一筆')).toBeInTheDocument();
    });
});

describe('SettingsView 手感與動畫測試 (emil-design-eng)', () => {
    const mockBudgets = {
        monthly: 30000,
        yearly: 360000,
        categoryLimits: [{ name: '餐飲', monthly: 10000, yearly: 120000 }]
    };

    it('支出分類矩陣：點擊標籤膠囊切換選中分類，抽屜即時顯示月與年預算欄位', () => {
        renderWithI18n(
            <SettingsView
                isDark={false}
                budgets={mockBudgets}
                categories={['餐飲', '娛樂']}
                onUpdateBudget={vi.fn()}
                onAddCategory={vi.fn()}
                onDeleteCategory={vi.fn()}
                onExport={vi.fn()}
                onImport={vi.fn()}
                onLogout={vi.fn()}
                onDeleteAccount={vi.fn()}
            />
        );

        // 應看見分類標籤「娛樂」
        const entertainmentChip = screen.getByText('娛樂');
        expect(entertainmentChip).toBeInTheDocument();

        // 點擊「娛樂」切換
        fireEvent.click(entertainmentChip);

        // 抽屜標題應切換為「設定「娛樂」預算上限」
        expect(screen.getByText('設定「娛樂」預算上限')).toBeInTheDocument();
        expect(screen.getByText('每月上限 (TWD)')).toBeInTheDocument();
        expect(screen.getByText('每年上限 (TWD)')).toBeInTheDocument();
    });

    it('行內防呆 (Inline Confirmation)：點擊刪除按鈕應切換為確定刪除，絕不呼叫原生 window.confirm', () => {
        const onDeleteMock = vi.fn();
        const confirmSpy = vi.spyOn(window, 'confirm');

        renderWithI18n(
            <SettingsView
                isDark={false}
                budgets={mockBudgets}
                categories={['餐飲']}
                onUpdateBudget={vi.fn()}
                onAddCategory={vi.fn()}
                onDeleteCategory={onDeleteMock}
                onExport={vi.fn()}
                onImport={vi.fn()}
                onLogout={vi.fn()}
                onDeleteAccount={vi.fn()}
            />
        );

        // 找到垃圾桶按鈕
        const trashBtn = screen.getByTitle('刪除此分類');
        fireEvent.click(trashBtn);

        // 不應彈出 window.confirm
        expect(confirmSpy).not.toHaveBeenCalled();

        // 應出現行內「確定刪除」按鈕
        const inlineConfirmBtn = screen.getByText('確定刪除');
        expect(inlineConfirmBtn).toBeInTheDocument();

        // 點擊確定刪除後才觸發 callback
        fireEvent.click(inlineConfirmBtn);
        expect(onDeleteMock).toHaveBeenCalledWith('餐飲');

        confirmSpy.mockRestore();
    });

    it('即時儲存：欄位修改後按下 Enter 鍵自動往後端送 (onUpdateBudget)', () => {
        const onUpdateMock = vi.fn();
        renderWithI18n(
            <SettingsView
                isDark={false}
                budgets={mockBudgets}
                categories={['餐飲']}
                onUpdateBudget={onUpdateMock}
                onAddCategory={vi.fn()}
                onDeleteCategory={vi.fn()}
                onExport={vi.fn()}
                onImport={vi.fn()}
                onLogout={vi.fn()}
                onDeleteAccount={vi.fn()}
            />
        );

        // 修改月總預算並按下 Enter
        const monthlyInput = screen.getAllByPlaceholderText('0')[0];
        fireEvent.change(monthlyInput, { target: { value: '45000' } });
        fireEvent.keyDown(monthlyInput, { key: 'Enter', code: 'Enter' });

        // 應自動觸發 onUpdateBudget
        expect(onUpdateMock).toHaveBeenCalledWith(
            expect.objectContaining({
                monthly: 45000
            })
        );
    });

    it('排版順序驗證：兩大預算區塊相鄰，依序為 年度與月份預算 -> 分類預算 -> 數據備份中心 -> 登出 -> 刪除帳號', () => {
        const { container } = renderWithI18n(
            <SettingsView
                isDark={false}
                budgets={mockBudgets}
                categories={['餐飲']}
                onUpdateBudget={vi.fn()}
                onAddCategory={vi.fn()}
                onDeleteCategory={vi.fn()}
                onExport={vi.fn()}
                onImport={vi.fn()}
                onLogout={vi.fn()}
                onDeleteAccount={vi.fn()}
            />
        );

        const html = container.innerHTML;
        const posBudget1 = html.indexOf('年度與月份預算');
        const posBudget2 = html.indexOf('分類預算');
        const posBackup = html.indexOf('數據備份中心');
        const posLogout = html.indexOf('登出');
        const posDelete = html.indexOf('刪除帳號');

        expect(posBudget1).toBeGreaterThan(-1);
        expect(posBudget2).toBeGreaterThan(posBudget1);
        expect(posBackup).toBeGreaterThan(posBudget2);
        expect(posLogout).toBeGreaterThan(posBackup);
        expect(posDelete).toBeGreaterThan(posLogout);
    });

    it('分類膠囊縮圖預覽：純年預算分類', () => {
        const budgetsWithPureYearly = {
            monthly: 50000,
            yearly: 600000,
            categoryLimits: [
                { name: 'test！', monthly: '', yearly: 100000 },
                { name: '午餐', monthly: 2500, yearly: 30000 }
            ]
        };

        renderWithI18n(
            <SettingsView
                isDark={false}
                budgets={budgetsWithPureYearly}
                categories={['午餐', 'test！']}
                onUpdateBudget={vi.fn()}
                onAddCategory={vi.fn()}
                onDeleteCategory={vi.fn()}
                onExport={vi.fn()}
                onImport={vi.fn()}
                onLogout={vi.fn()}
                onDeleteAccount={vi.fn()}
            />
        );

        // 午餐應顯示「2,500 / 30,000」（月 / 年）
        expect(screen.getByText('2,500 / 30,000')).toBeInTheDocument();

        // 玩！只設年預算，應能在縮圖上直接看見「- / 100,000」
        expect(screen.getByText('- / 100,000')).toBeInTheDocument();
    });
});

