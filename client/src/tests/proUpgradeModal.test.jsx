import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import ProUpgradeModal from '../components/budget/ProUpgradeModal';
import SettingsView from '../components/budget/SettingsView';
import { PlanProvider, usePlan } from '../context/PlanContext';
import { I18nProvider } from '../i18n';

describe('ProUpgradeModal 渲染與互動測試', () => {
    it('非 Pro 會員時正常渲染升級彈窗，無任何未定義變數或崩潰', () => {
        const mockOnClose = vi.fn();
        const mockOnRefreshPlan = vi.fn();
        const mockOnSimulateUpgrade = vi.fn();

        render(
            <I18nProvider initialLanguage="zh-TW">
                <ProUpgradeModal
                    isOpen={true}
                    onClose={mockOnClose}
                    isDark={false}
                    userPlan="free"
                    isPro={false}
                    planExpiresAt={null}
                    onRefreshPlan={mockOnRefreshPlan}
                    onSimulateUpgrade={mockOnSimulateUpgrade}
                    userEmail="test@example.com"
                    userId="u-123"
                />
            </I18nProvider>
        );

        // 應展示升級彈窗標題
        expect(screen.getByText('PRO EDITION')).toBeInTheDocument();
        // 應展示三種方案
        expect(screen.getByText(/月度訂閱/)).toBeInTheDocument();
        expect(screen.getByText(/年度訂閱/)).toBeInTheDocument();
        expect(screen.getByText(/終身買斷/)).toBeInTheDocument();
        // 應展示前往付款按鈕
        expect(screen.getByText(/前往付款/)).toBeInTheDocument();

        // 點擊關閉按鈕，應觸發 onClose
        const closeBtn = screen.getByLabelText('關閉');
        fireEvent.click(closeBtn);
        expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('已是 Pro 會員時正常渲染訂閱管理視圖，且可正常關閉', () => {
        const mockOnClose = vi.fn();
        const mockOnCancel = vi.fn();

        render(
            <I18nProvider initialLanguage="zh-TW">
                <ProUpgradeModal
                    isOpen={true}
                    onClose={mockOnClose}
                    isDark={false}
                    userPlan="pro_yearly"
                    isPro={true}
                    planExpiresAt="2027-10-15T00:00:00.000Z"
                    onCancelSubscription={mockOnCancel}
                    userEmail="pro@example.com"
                    userId="u-456"
                />
            </I18nProvider>
        );

        // 應展示訂閱會員標題
        expect(screen.getByText('ACTIVE SUBSCRIBER')).toBeInTheDocument();
        expect(screen.getByText('PRO 年度訂閱會員')).toBeInTheDocument();

        // 點擊關閉視窗按鈕
        const closeButtons = screen.getAllByRole('button', { name: /關閉視窗/ });
        expect(closeButtons.length).toBeGreaterThan(0);
        fireEvent.click(closeButtons[0]);
        expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('點擊背景遮罩層時可正確關閉彈窗', () => {
        const mockOnClose = vi.fn();

        const { container } = render(
            <I18nProvider initialLanguage="zh-TW">
                <ProUpgradeModal
                    isOpen={true}
                    onClose={mockOnClose}
                    isPro={false}
                />
            </I18nProvider>
        );

        const overlay = container.querySelector('.fixed.inset-0');
        expect(overlay).toBeTruthy();
        fireEvent.click(overlay);
        expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('透過 PlanProvider 的 openUpgradeModal 觸發開啟並關閉', () => {
        const TestConsumer = () => {
            const { openUpgradeModal } = usePlan();
            return (
                <button onClick={openUpgradeModal}>
                    開啟PRO彈窗
                </button>
            );
        };

        render(
            <I18nProvider initialLanguage="zh-TW">
                <PlanProvider value={{ isPro: false, userPlan: 'free' }}>
                    <TestConsumer />
                </PlanProvider>
            </I18nProvider>
        );

        // 初始狀態彈窗應未打開
        expect(screen.queryByText('PRO EDITION')).not.toBeInTheDocument();

        // 點擊觸發按鈕
        fireEvent.click(screen.getByText('開啟PRO彈窗'));

        // 彈窗成功掛載
        expect(screen.getByText('PRO EDITION')).toBeInTheDocument();

        // 點擊關閉
        const closeBtn = screen.getByLabelText('關閉');
        fireEvent.click(closeBtn);

        // 彈窗成功卸載
        expect(screen.queryByText('PRO EDITION')).not.toBeInTheDocument();
    });

    it('Pro 會員進入 SettingsView 時正常渲染，包含「管理方案與訂閱」按鈕且不崩潰', () => {
        render(
            <I18nProvider initialLanguage="zh-TW">
                <PlanProvider value={{ isPro: true, userPlan: 'pro_monthly' }}>
                    <SettingsView
                        isDark={false}
                        budgets={{ monthly: 10000, yearly: 120000, categoryLimits: [] }}
                        categories={['餐飲', '交通']}
                    />
                </PlanProvider>
            </I18nProvider>
        );

        // 應展示「PRO 會員」徽章
        expect(screen.getByText('PRO 會員')).toBeInTheDocument();
        // 應展示「管理方案與訂閱」按鈕
        expect(screen.getByText('管理方案與訂閱')).toBeInTheDocument();
    });

    it('已終止定期續約但仍在效期內的用戶，彈窗應展示已終止續約標籤且不重複出現取消訂閱按鈕', () => {
        const mockOnClose = vi.fn();
        const futureDate = new Date(Date.now() + 15 * 86400000).toISOString();

        render(
            <I18nProvider initialLanguage="zh-TW">
                <ProUpgradeModal
                    isOpen={true}
                    onClose={mockOnClose}
                    isDark={false}
                    userPlan="pro_monthly"
                    isPro={true}
                    planExpiresAt={futureDate}
                    isAutoRenewing={false}
                />
            </I18nProvider>
        );

        // 應展示「ACTIVE SUBSCRIBER」
        expect(screen.getByText('ACTIVE SUBSCRIBER')).toBeInTheDocument();
        // 扣款狀態應為「已終止續約（有效至到期日）」
        expect(screen.getByText('已終止續約（有效至到期日）')).toBeInTheDocument();
        // 應提示「已終止下期自動扣款...」
        expect(screen.getByText(/已終止下期自動扣款/)).toBeInTheDocument();
        // 不應重複出現「取消定期訂閱」按鈕
        expect(screen.queryByText('取消定期訂閱')).not.toBeInTheDocument();
        // 應有「關閉視窗」按鈕
        expect(screen.getByText('關閉視窗')).toBeInTheDocument();
    });
});
