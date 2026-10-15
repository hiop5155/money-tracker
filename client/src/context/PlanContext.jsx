import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import ProUpgradeModal from '../components/budget/ProUpgradeModal';
import { Crown, Lock, Sparkles } from 'lucide-react';
import { useTranslation } from '../i18n';

const PlanContext = createContext({
    isPro: false,
    userPlan: 'free',
    planExpiresAt: null,
    isUpgradeModalOpen: false,
    openUpgradeModal: () => {},
    closeUpgradeModal: () => {},
    onOpenUpgrade: () => {}, // 向後相容
    refreshUserPlan: async () => {},
    simulateUpgrade: async () => {},
    requirePro: () => false,
});

/**
 * 金流與會員方案 Provider (Single Source of Truth)
 * 自動整合方案狀態、開關控制、測試模擬與 ProUpgradeModal 彈窗渲染
 */
export const PlanProvider = ({
    children,
    value = null,
    userEmail = '',
    userId = '',
    isDark = false,
}) => {
    // 獨立管理彈窗開關狀態 (支援 URL ?modal=pro 參數測試)
    const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(() => {
        if (typeof window !== 'undefined') {
            return new URLSearchParams(window.location.search).get('modal') === 'pro';
        }
        return false;
    });

    const openUpgradeModal = useCallback(() => setIsUpgradeModalOpen(true), []);
    const closeUpgradeModal = useCallback(() => setIsUpgradeModalOpen(false), []);

    // 支援受控 value (來自 useBudgetData) 或自主 fallback
    const userPlan = value?.userPlan || 'free';
    const planExpiresAt = value?.planExpiresAt || null;
    const isAutoRenewing = value?.isAutoRenewing ?? (userPlan === 'pro_monthly' || userPlan === 'pro_yearly');

    // 計算 isPro (以到期日為最準確依據，未過期者一律為 Pro)
    const isPro = useMemo(() => {
        if (value?.isPro !== undefined) return Boolean(value.isPro);
        if (userPlan === 'pro_lifetime' || userPlan === 'lifetime') return true;
        if (planExpiresAt) {
            return new Date(planExpiresAt) > new Date();
        }
        if (userPlan === 'pro') return true;
        return false;
    }, [value?.isPro, userPlan, planExpiresAt]);

    const refreshUserPlan = useCallback(async () => {
        if (value?.refreshUserPlan) {
            return await value.refreshUserPlan();
        }
        return { isPro, planType: userPlan, isAutoRenewing };
    }, [value?.refreshUserPlan, isPro, userPlan, isAutoRenewing]);

    const simulateUpgrade = useCallback(async (planType = 'pro_monthly') => {
        if (value?.simulateUpgrade) {
            return await value.simulateUpgrade(planType);
        }
        return { success: true, planType };
    }, [value?.simulateUpgrade]);

    /**
     * 高階權限守門輔助器：
     * 若為 Pro 則執行 actionCallback；
     * 若非 Pro 則自動叫出升級彈窗並攔截執行。
     */
    const requirePro = useCallback((actionCallback, onDenied) => {
        if (isPro) {
            return typeof actionCallback === 'function' ? actionCallback() : true;
        }
        openUpgradeModal();
        if (typeof onDenied === 'function') {
            onDenied();
        }
        return false;
    }, [isPro, openUpgradeModal]);

    const contextValue = useMemo(() => ({
        isPro,
        userPlan,
        planExpiresAt,
        isAutoRenewing,
        isUpgradeModalOpen,
        openUpgradeModal,
        closeUpgradeModal,
        onOpenUpgrade: openUpgradeModal, // 相容既有代碼
        refreshUserPlan,
        simulateUpgrade,
        requirePro,
    }), [
        isPro,
        userPlan,
        planExpiresAt,
        isAutoRenewing,
        isUpgradeModalOpen,
        openUpgradeModal,
        closeUpgradeModal,
        refreshUserPlan,
        simulateUpgrade,
        requirePro,
    ]);

    return (
        <PlanContext.Provider value={contextValue}>
            {children}
            {/* 全域自動掛載升級彈窗，底層視圖無需再手動宣告 */}
            <ProUpgradeModal
                isOpen={isUpgradeModalOpen}
                onClose={closeUpgradeModal}
                isDark={isDark}
                userPlan={userPlan}
                isPro={isPro}
                planExpiresAt={planExpiresAt}
                isAutoRenewing={isAutoRenewing}
                onRefreshPlan={refreshUserPlan}
                onSimulateUpgrade={simulateUpgrade}
                onCancelSubscription={value?.cancelSubscription}
                userEmail={userEmail}
                userId={userId}
            />
        </PlanContext.Provider>
    );
};

/**
 * 取得金流與會員方案 Hook
 */
export const usePlan = () => useContext(PlanContext);

/**
 * 聲明式 Pro 權限守門元件
 * @example
 * <ProGate fallback={<UpgradeNotice />}>
 *     <AdvancedFeature />
 * </ProGate>
 */
export const ProGate = ({ children, fallback = null, showLockOverlay = false }) => {
    const { isPro, openUpgradeModal } = usePlan();
    const { t } = useTranslation();

    if (isPro) {
        return children;
    }

    if (fallback) {
        return fallback;
    }

    if (showLockOverlay) {
        return (
            <div
                onClick={openUpgradeModal}
                role="button"
                tabIndex={0}
                className="relative cursor-pointer group rounded-xl overflow-hidden select-none touch-manipulation active:scale-[0.99] transition-transform duration-150 ease-out"
            >
                <div className="filter blur-xs opacity-40 pointer-events-none select-none">
                    {children}
                </div>
                <div className="absolute inset-0 bg-slate-900/10 dark:bg-black/50 backdrop-blur-[3px] flex flex-col items-center justify-center p-4 text-center transition-colors duration-200">
                    <div className="w-9 h-9 rounded-full bg-white dark:bg-slate-800 shadow-sm border border-slate-200/50 dark:border-slate-700/50 flex items-center justify-center text-slate-800 dark:text-slate-100 mb-2 transition-transform duration-150 ease-out group-active:scale-95">
                        <Lock className="w-4 h-4 text-amber-500 dark:text-amber-400" />
                    </div>
                    <span className="text-xs font-semibold text-slate-800 dark:text-slate-100 tracking-wide">
                        {t('pro.gateTitle')}
                    </span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                        {t('pro.gateSubtitle')}
                    </span>
                </div>
            </div>
        );
    }

    return null;
};

/**
 * 統一風格的 Pro 會員徽章
 */
export const ProBadge = ({ className = '', onClick }) => {
    const { isPro, openUpgradeModal } = usePlan();

    if (!isPro) return null;

    return (
        <span
            onClick={onClick || openUpgradeModal}
            role="button"
            className={`px-1.5 py-0.5 rounded text-[10px] font-semibold tracking-wide bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 shrink-0 cursor-pointer select-none touch-manipulation active:scale-95 transition-transform duration-100 ease-out ${className}`}
        >
            PRO
        </span>
    );
};

export default PlanContext;
