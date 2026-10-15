import React, { useState } from 'react';
import {
    Check,
    X,
    ShieldCheck,
    Download,
    Upload,
    Sparkles,
    RefreshCw,
    ExternalLink,
    CheckCircle2,
    Sliders,
} from 'lucide-react';
import { useTranslation } from '../../i18n';

const HELIO_MONTHLY_PAYLINK = import.meta.env.VITE_HELIO_MONTHLY_PAYLINK || 'https://app.helio.co/pay/monthly-60-demo';
const HELIO_YEARLY_PAYLINK = import.meta.env.VITE_HELIO_YEARLY_PAYLINK || 'https://app.helio.co/pay/yearly-600-demo';
const HELIO_LIFETIME_PAYLINK = import.meta.env.VITE_HELIO_LIFETIME_PAYLINK || 'https://app.helio.co/pay/lifetime-1200-demo';
const enableDevPreview = import.meta.env.VITE_ENABLE_DEV_PREVIEW === 'true';

const ProUpgradeModal = ({
    isOpen,
    onClose,
    isDark = false,
    userPlan = 'free',
    isPro = false,
    planExpiresAt = null,
    isAutoRenewing = true,
    onRefreshPlan = async () => {},
    onSimulateUpgrade = async () => {},
    userEmail = '',
    userId = '',
    onCancelSubscription = async () => {},
}) => {
    const { t } = useTranslation();
    const [selectedPlan, setSelectedPlan] = useState('yearly'); // 'monthly' | 'yearly' | 'lifetime'
    const [isCancelling, setIsCancelling] = useState(false);
    const [showCancelConfirm, setShowCancelConfirm] = useState(false);
    const [isChecking, setIsChecking] = useState(false);
    const [checkMessage, setCheckMessage] = useState(null);
    const [isSimulating, setIsSimulating] = useState(false);

    if (!isOpen) return null;

    const isLifetime = userPlan === 'pro_lifetime' || userPlan === 'lifetime';
    const isSubscription = isPro && !isLifetime;

    const plans = [
        {
            id: 'monthly',
            planKey: 'pro_monthly',
            title: t('pro.monthlyTitle'),
            price: t('pro.monthlyPrice'),
            period: t('pro.monthlyPeriod'),
            desc: t('pro.monthlyDesc'),
            paylink: HELIO_MONTHLY_PAYLINK,
        },
        {
            id: 'yearly',
            planKey: 'pro_yearly',
            title: t('pro.yearlyTitle'),
            price: t('pro.yearlyPrice'),
            period: t('pro.yearlyPeriod'),
            desc: t('pro.yearlyDesc'),
            badge: t('pro.yearlyBadge'),
            paylink: HELIO_YEARLY_PAYLINK,
        },
        {
            id: 'lifetime',
            planKey: 'pro_lifetime',
            title: t('pro.lifetimeTitle'),
            price: t('pro.lifetimePrice'),
            period: t('pro.lifetimePeriod'),
            desc: t('pro.lifetimeDesc'),
            badge: t('pro.lifetimeBadge'),
            paylink: HELIO_LIFETIME_PAYLINK,
        },
    ];

    const currentPlanConfig = plans.find((p) => p.id === selectedPlan) || plans[1];

    const handlePayNow = () => {
        const baseUrl = currentPlanConfig.paylink;
        try {
            const url = new URL(baseUrl);
            if (userEmail) url.searchParams.set('customerEmail', userEmail);
            if (userId) {
                url.searchParams.set('userId', userId);
                url.searchParams.set('customMeta', JSON.stringify({ userId, plan: selectedPlan }));
            }
            window.open(url.toString(), '_blank', 'noopener,noreferrer');
        } catch {
            window.open(baseUrl, '_blank', 'noopener,noreferrer');
        }
    };

    const handleCheckPaymentStatus = async () => {
        setIsChecking(true);
        setCheckMessage(null);
        try {
            const result = await onRefreshPlan();
            if (result && result.isPro) {
                setCheckMessage({ type: 'success', text: t('pro.unlockedSuccess') });
                setTimeout(() => {
                    onClose();
                }, 1200);
            } else {
                setCheckMessage({
                    type: 'info',
                    text: t('pro.notDetected'),
                });
            }
        } catch (e) {
            setCheckMessage({ type: 'error', text: t('pro.checkError') });
        } finally {
            setIsChecking(false);
        }
    };

    const handleCancelSubscription = async () => {
        setIsCancelling(true);
        setCheckMessage(null);
        try {
            const res = await onCancelSubscription();
            if (res && res.success) {
                setCheckMessage({ type: 'success', text: t('pro.cancelSuccess') });
                await onRefreshPlan();
                setTimeout(() => {
                    onClose();
                }, 1200);
            } else {
                setCheckMessage({ type: 'error', text: t('pro.cancelFailed') });
            }
        } catch (err) {
            setCheckMessage({ type: 'error', text: t('pro.cancelError') });
        } finally {
            setIsCancelling(false);
            setShowCancelConfirm(false);
        }
    };

    const handleSimulate = async (planType) => {
        setIsSimulating(true);
        try {
            const res = await onSimulateUpgrade(planType);
            if (res) {
                setCheckMessage({
                    type: 'success',
                    text: planType === 'free' ? t('pro.simFree') : t('pro.unlockedSuccess'),
                });
                if (planType !== 'free') {
                    setTimeout(() => {
                        onClose();
                    }, 1000);
                }
            }
        } finally {
            setIsSimulating(false);
        }
    };

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200 ease-out"
            onClick={(e) => {
                if (e.target === e.currentTarget) onClose();
            }}
        >
            {/* Modal Dialog Card */}
            <div
                className={`relative w-full max-w-md max-h-[90dvh] overflow-y-auto overscroll-contain rounded-2xl border p-6 shadow-2xl transition-transform duration-200 ease-out animate-in fade-in zoom-in-95 ${
                    isDark
                        ? 'bg-slate-900 border-slate-800 text-slate-100 shadow-black/60'
                        : 'bg-white border-slate-200 text-slate-900 shadow-slate-300/50'
                }`}
            >
                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors duration-150 active:scale-95 select-none touch-manipulation cursor-pointer"
                    aria-label={t('common.close')}
                >
                    <X className="w-4 h-4" />
                </button>

                {/* --- 情況 A：已是 PRO 會員（方案管理狀態） --- */}
                {isPro ? (
                    <div className="space-y-4">
                        {/* Header */}
                        <div className="text-center space-y-1">
                            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                                <Sparkles className="w-3 h-3 text-blue-500" />
                                <span>{isLifetime ? 'LIFETIME PRO' : 'ACTIVE SUBSCRIBER'}</span>
                            </div>
                            <h2 className="text-xl font-bold tracking-tight">
                                {isLifetime ? t('pro.memberTitleLifetime') : userPlan === 'pro_yearly' ? t('pro.memberTitleYearly') : t('pro.memberTitleMonthly')}
                            </h2>
                            <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'} leading-relaxed`}>
                                {isLifetime
                                    ? t('pro.memberDescLifetime')
                                    : t('pro.memberDescSubscribed')}
                            </p>
                        </div>

                        {/* Subscription Detail Info Card */}
                        <div
                            className={`rounded-xl p-3.5 border text-xs space-y-2 ${
                                isDark ? 'bg-slate-800/40 border-slate-800' : 'bg-slate-50 border-slate-200'
                            }`}
                        >
                            <div className="flex items-center justify-between">
                                <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>{t('pro.currentPlan')}</span>
                                <span className="font-semibold text-blue-600 dark:text-blue-400">
                                    {isLifetime ? t('pro.planLifetimeText') : userPlan === 'pro_yearly' ? t('pro.planYearlyRate') : t('pro.planMonthlyRate')}
                                </span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>
                                    {isLifetime ? t('pro.billingStatus') : isAutoRenewing ? t('pro.nextBillingDate') : t('pro.expirationDate')}
                                </span>
                                <span className="font-mono font-medium">
                                    {isLifetime
                                        ? t('pro.lifetimePermanent')
                                        : planExpiresAt
                                          ? new Date(planExpiresAt).toLocaleDateString()
                                          : t('pro.autoRenewing')}
                                </span>
                            </div>
                            {!isLifetime && (
                                <div className="flex items-center justify-between">
                                    <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>{t('pro.recurringBillingLabel')}</span>
                                    {isAutoRenewing ? (
                                        <span className="font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                                            <CheckCircle2 className="w-3.5 h-3.5" />
                                            <span>{t('pro.recurringActiveStatus')}</span>
                                        </span>
                                    ) : (
                                        <span className="font-medium text-amber-600 dark:text-amber-400 flex items-center gap-1">
                                            <ShieldCheck className="w-3.5 h-3.5" />
                                            <span>{t('pro.recurringCancelledStatus')}</span>
                                        </span>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Notice for cancelled auto-renewal */}
                        {!isLifetime && !isAutoRenewing && (
                            <div
                                className={`p-3 rounded-xl border text-xs leading-relaxed flex items-start gap-2 ${
                                    isDark ? 'bg-amber-500/10 border-amber-500/20 text-amber-300' : 'bg-amber-50 border-amber-200 text-amber-800'
                                }`}
                            >
                                <ShieldCheck className="w-4 h-4 shrink-0 text-amber-500 mt-0.5" />
                                <span>{t('pro.autoRenewCancelledNotice')}</span>
                            </div>
                        )}

                        {/* Features Checklist */}
                        <div
                            className={`rounded-xl p-3 space-y-2 border text-xs ${
                                isDark ? 'bg-slate-800/20 border-slate-800 text-slate-300' : 'bg-slate-50/50 border-slate-200 text-slate-700'
                            }`}
                        >
                            <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-medium">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>{t('pro.benefitSyncUnlocked')}</span>
                            </div>
                            <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-medium">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>{t('pro.benefitCsvUnlocked')}</span>
                            </div>
                            <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-medium">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>{t('pro.benefitAnalyticsUnlocked')}</span>
                            </div>
                        </div>

                        {/* Feedback Message */}
                        {checkMessage && (
                            <div
                                className={`p-2.5 rounded-xl text-xs flex items-center gap-2 animate-in fade-in duration-150 ${
                                    checkMessage.type === 'success'
                                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                                        : checkMessage.type === 'error'
                                          ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
                                          : 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20'
                                }`}
                            >
                                <Check className="w-3.5 h-3.5 shrink-0" />
                                <span>{checkMessage.text}</span>
                            </div>
                        )}

                        {/* Actions for Subscribed Members */}
                        {isSubscription && (
                            <div className="pt-1 space-y-2">
                                {isAutoRenewing ? (
                                    showCancelConfirm ? (
                                        <div className="p-3 rounded-xl border border-rose-500/30 bg-rose-500/10 text-xs space-y-2.5 animate-in fade-in">
                                            <p className="font-semibold text-rose-600 dark:text-rose-400">
                                                {t('pro.cancelConfirmTitle')}
                                            </p>
                                            <p className="text-slate-600 dark:text-slate-300 leading-relaxed text-[11px]">
                                                {t('pro.cancelConfirmDesc')}
                                            </p>
                                            <div className="flex gap-2 pt-1">
                                                <button
                                                    onClick={handleCancelSubscription}
                                                    disabled={isCancelling}
                                                    className="flex-1 py-2 px-3 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs active:scale-[0.98] transition-colors duration-150 select-none touch-manipulation cursor-pointer flex items-center justify-center gap-1.5"
                                                >
                                                    {isCancelling && <RefreshCw className="w-3 h-3 animate-spin" />}
                                                    <span>{t('pro.confirmCancelBtn')}</span>
                                                </button>
                                                <button
                                                    onClick={() => setShowCancelConfirm(false)}
                                                    disabled={isCancelling}
                                                    className="py-2 px-3 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs transition-colors duration-150 active:scale-[0.98] select-none touch-manipulation cursor-pointer"
                                                >
                                                    {t('pro.keepSubscriptionBtn')}
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col gap-2">
                                            <button
                                                onClick={onClose}
                                                className="w-full py-2.5 px-4 rounded-xl font-semibold text-xs bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 shadow-sm active:scale-[0.98] transition-colors duration-150 select-none touch-manipulation cursor-pointer"
                                            >
                                                {t('pro.closeModalBtn')}
                                            </button>
                                            <button
                                                onClick={() => setShowCancelConfirm(true)}
                                                className="w-full py-2 px-4 rounded-xl text-xs text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 transition-colors duration-150 active:scale-[0.98] select-none touch-manipulation cursor-pointer"
                                            >
                                                {t('pro.cancelSubscriptionBtn')}
                                            </button>
                                        </div>
                                    )
                                ) : (
                                    <button
                                        onClick={onClose}
                                        className="w-full py-2.5 px-4 rounded-xl font-semibold text-xs bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 shadow-sm active:scale-[0.98] transition-colors duration-150 select-none touch-manipulation cursor-pointer"
                                    >
                                        {t('pro.closeModalBtn')}
                                    </button>
                                )}
                            </div>
                        )}

                        {isLifetime && (
                            <button
                                onClick={onClose}
                                className="w-full py-2.5 px-4 rounded-xl font-semibold text-xs bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 shadow-sm active:scale-[0.98] transition-colors duration-150 select-none touch-manipulation cursor-pointer"
                            >
                                {t('pro.closeModalBtn')}
                            </button>
                        )}
                    </div>
                ) : (
                    /* --- 情況 B：非 PRO 會員（前往付款升級視圖） --- */
                    <>
                        {/* Header */}
                        <div className="text-center space-y-1 mb-5">
                            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                                <Sparkles className="w-3 h-3 text-blue-500" />
                                <span>PRO EDITION</span>
                            </div>
                            <h2 className="text-xl font-bold tracking-tight">
                                {t('pro.modalTitle')}
                            </h2>
                            <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'} leading-relaxed max-w-xs mx-auto`}>
                                {t('pro.modalSubtitle')}
                            </p>
                        </div>

                        {/* 3 Pricing Plans Stack */}
                        <div className="space-y-2.5 mb-5">
                            {plans.map((plan) => {
                                const isSelected = selectedPlan === plan.id;
                                return (
                                    <div
                                        key={plan.id}
                                        onClick={() => setSelectedPlan(plan.id)}
                                        className={`relative p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between active:scale-[0.99] ${
                                            isSelected
                                                ? isDark
                                                    ? 'border-blue-500 bg-blue-950/20 ring-1 ring-blue-500/50'
                                                    : 'border-blue-600 bg-blue-50/40 ring-1 ring-blue-600/30'
                                                : isDark
                                                  ? 'border-slate-800 bg-slate-800/40 hover:border-slate-700'
                                                  : 'border-slate-200 bg-slate-50/50 hover:border-slate-300'
                                        }`}
                                    >
                                        <div className="space-y-0.5">
                                            <div className="flex items-center gap-2">
                                                <span className="font-semibold text-sm">
                                                    {plan.title}
                                                </span>
                                                {plan.badge && (
                                                    <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                                                        {plan.badge}
                                                    </span>
                                                )}
                                            </div>
                                            <p className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                                                {plan.desc}
                                            </p>
                                        </div>

                                        <div className="text-right pl-3 shrink-0 flex items-center gap-2.5">
                                            <div>
                                                <div className="font-bold font-mono text-base tracking-tight">
                                                    {plan.price}
                                                </div>
                                                <div className={`text-[10px] ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                                                    {plan.period}
                                                </div>
                                            </div>
                                            <div
                                                className={`w-4 h-4 rounded-full border flex items-center justify-center transition-colors ${
                                                    isSelected
                                                        ? 'border-blue-600 bg-blue-600 text-white'
                                                        : isDark
                                                          ? 'border-slate-700 bg-slate-800'
                                                          : 'border-slate-300 bg-white'
                                                }`}
                                            >
                                                {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Features Checklist */}
                        <div
                            className={`rounded-xl p-3 mb-5 space-y-2 border text-xs ${
                                isDark ? 'bg-slate-800/40 border-slate-800 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-700'
                            }`}
                        >
                            <div className="flex items-start gap-2">
                                <CheckCircle2 className="w-3.5 h-3.5 text-blue-500 mt-0.5 shrink-0" />
                                <div>
                                    <span className="font-medium">{t('pro.benefitBackup')}</span>
                                    <span className={`block text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                                        {t('pro.benefitBackupDesc')}
                                    </span>
                                </div>
                            </div>

                            <div className="flex items-start gap-2">
                                <CheckCircle2 className="w-3.5 h-3.5 text-blue-500 mt-0.5 shrink-0" />
                                <div>
                                    <span className="font-medium">{t('pro.benefitImport')}</span>
                                    <span className={`block text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                                        {t('pro.benefitImportDesc')}
                                    </span>
                                </div>
                            </div>

                            <div className="flex items-start gap-2">
                                <CheckCircle2 className="w-3.5 h-3.5 text-blue-500 mt-0.5 shrink-0" />
                                <div>
                                    <span className="font-medium">{t('pro.benefitAnalytics')}</span>
                                    <span className={`block text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                                        {t('pro.benefitAnalyticsDesc')}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Feedback Message */}
                        {checkMessage && (
                            <div
                                className={`mb-3.5 p-2.5 rounded-xl text-xs flex items-center gap-2 animate-in fade-in duration-150 ${
                                    checkMessage.type === 'success'
                                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                                        : checkMessage.type === 'error'
                                          ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
                                          : 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20'
                                }`}
                            >
                                {checkMessage.type === 'success' ? (
                                    <Check className="w-3.5 h-3.5 shrink-0" />
                                ) : (
                                    <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                                )}
                                <span>{checkMessage.text}</span>
                            </div>
                        )}

                        {/* Main Action Button */}
                        <button
                            onClick={handlePayNow}
                            className="w-full py-3 px-4 rounded-xl font-semibold text-sm bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 shadow-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-colors duration-150 mb-3 select-none touch-manipulation cursor-pointer"
                        >
                            <span>
                                {t('pro.payButton')} ({currentPlanConfig.price})
                            </span>
                            <ExternalLink className="w-3.5 h-3.5" />
                        </button>
                    </>
                )}

                {/* Status Check & Test Mode Toggle Footer */}
                <div className={`flex items-center text-xs px-1 ${enableDevPreview ? 'justify-between' : 'justify-center'}`}>
                    <button
                        onClick={handleCheckPaymentStatus}
                        disabled={isChecking}
                        className={`inline-flex items-center gap-1.5 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 transition-colors ${
                            isChecking ? 'opacity-70 cursor-not-allowed' : ''
                        }`}
                    >
                        <RefreshCw className={`w-3.5 h-3.5 ${isChecking ? 'animate-spin' : ''}`} />
                        <span>{isChecking ? t('pro.checking') : t('pro.checkPayment')}</span>
                    </button>

                    {enableDevPreview && (
                        <button
                            onClick={() => setShowDevTools(!showDevTools)}
                            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 text-[11px] transition-colors flex items-center gap-1 cursor-pointer"
                        >
                            <Sliders className="w-3 h-3" />
                            <span>{t('pro.testMode')}</span>
                        </button>
                    )}
                </div>

                {/* Restrained, Minimalist Test Simulation Drawer */}
                {enableDevPreview && showDevTools && (
                    <div
                        className={`mt-3 pt-3 border-t rounded-xl p-2.5 text-left space-y-2 animate-in fade-in duration-150 ${
                            isDark ? 'bg-slate-800/60 border-slate-800' : 'bg-slate-100/80 border-slate-200'
                        }`}
                    >
                        <div className="flex items-center justify-between text-[11px]">
                            <span className="font-semibold text-slate-600 dark:text-slate-400">
                                {t('pro.testToolTitle')}
                            </span>
                            <span className="text-slate-400 text-[10px]">
                                {t('pro.currentPlanLabel')}: <strong className="font-mono">{userPlan}</strong>
                            </span>
                        </div>
                        <div className="grid grid-cols-2 gap-1.5">
                            <button
                                onClick={() => handleSimulate('pro_monthly')}
                                disabled={isSimulating}
                                className="py-1.5 px-2 rounded-lg text-[10px] font-medium bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 transition-colors active:scale-95 cursor-pointer"
                            >
                                {t('pro.simMonthly')}
                            </button>
                            <button
                                onClick={() => handleSimulate('pro_yearly')}
                                disabled={isSimulating}
                                className="py-1.5 px-2 rounded-lg text-[10px] font-medium bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 transition-colors active:scale-95 cursor-pointer"
                            >
                                {t('pro.simYearly')}
                            </button>
                            <button
                                onClick={() => handleSimulate('pro_lifetime')}
                                disabled={isSimulating}
                                className="py-1.5 px-2 rounded-lg text-[10px] font-medium bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 transition-colors active:scale-95 cursor-pointer"
                            >
                                {t('pro.simLifetime')}
                            </button>
                            <button
                                onClick={() => handleSimulate('free')}
                                disabled={isSimulating}
                                className="py-1.5 px-2 rounded-lg text-[10px] font-medium bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-rose-600 dark:text-rose-400 transition-colors active:scale-95 cursor-pointer"
                            >
                                {t('pro.simFree')}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ProUpgradeModal;
