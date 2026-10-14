import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Sun,
    Moon,
    Sparkles,
    Bot,
    TrendingUp,
    ShieldCheck,
    ArrowUpRight,
    Mail,
    CheckCircle2,
    Zap,
} from 'lucide-react';
import { GoogleLogin } from '@react-oauth/google';
import LoadingOverlay from '../components/LoadingOverlay';
import { API_URL } from '../config';

function AuthPage({ onLogin, isDarkMode, toggleTheme }) {
    const navigate = useNavigate();
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleGoogleSuccess = async (credentialResponse) => {
        setIsLoading(true);
        setError('');
        try {
            const res = await fetch(`${API_URL}/auth/google`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ credential: credentialResponse.credential }),
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Google 登入失敗');

            onLogin(data.token, data.name || data.email, data.avatar || '');
            navigate('/');
        } catch (err) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleGoogleError = () => {
        setError('Google 授權失敗或已取消');
    };

    return (
        <>
            <LoadingOverlay isVisible={isLoading} />
            <div className="w-full min-h-screen min-h-[100dvh] flex flex-col justify-between" style={{ backgroundColor: 'var(--bg-body)', color: 'var(--text-main)' }}>
                {/* Top Navigation */}
                <header className="w-full border-b px-6 py-3 flex items-center justify-between sticky top-0 z-20 shadow-sm"
                    style={{ borderColor: isDarkMode ? '#2d3748' : '#e2e8f0', backgroundColor: isDarkMode ? '#18191a' : '#ffffff' }}>
                    <div className="flex items-center gap-3">
                        <span className="text-2xl">💰</span>
                        <span className="font-bold text-xl tracking-tight">Money Tracker</span>
                    </div>

                    <div className="flex items-center gap-4">
                        <a
                            href="/calc/"
                            className="hidden md:inline-flex items-center gap-1 text-sm font-medium hover:text-blue-500 transition-colors"
                        >
                            <span>台股 ETF 試算</span>
                            <ArrowUpRight size={14} />
                        </a>
                        <a
                            href="/blog"
                            className="hidden md:inline-flex items-center gap-1 text-sm font-medium hover:text-blue-500 transition-colors"
                        >
                            <span>財經專欄</span>
                        </a>
                        <button
                            onClick={toggleTheme}
                            className="p-2 rounded-full border transition-colors hover:bg-black/5 dark:hover:bg-white/10"
                            style={{ borderColor: isDarkMode ? '#4a5568' : '#cbd5e1' }}
                            title={isDarkMode ? '切換至淺色模式' : '切換至深色模式'}
                        >
                            {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
                        </button>
                    </div>
                </header>

                {/* Hero & Login Section */}
                <main className="flex-1 max-w-6xl w-full mx-auto px-6 py-10 md:py-16 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
                    {/* Left: Product Value Proposition */}
                    <div className="lg:col-span-7 flex flex-col gap-6">
                        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold w-fit bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                            <Zap size={14} />
                            <span>個人財務決策與記帳平台</span>
                        </div>

                        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight leading-tight">
                            讓每一分收支清清楚楚，
                            <br />
                            <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">
                                掌控你的個人資產與預算
                            </span>
                        </h1>

                        <p className="text-base sm:text-lg opacity-80 leading-relaxed" style={{ color: 'var(--text-sub)' }}>
                            不再只是繁瑣記帳。Money Tracker 結合直覺的收支管理與財務統計分析，即時洞悉消費趨勢、預警預算透支，協助你輕鬆管理個人資產。
                        </p>

                        {/* 3 Feature Highlights */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                            <div className="p-4 rounded-xl border flex flex-col gap-2 transition-transform hover:-translate-y-1"
                                style={{ backgroundColor: 'var(--bg-card)', borderColor: isDarkMode ? '#3a3b3c' : '#e2e8f0' }}>
                                <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-purple-500/15 text-purple-600 dark:text-purple-300">
                                    <TrendingUp size={20} />
                                </div>
                                <h3 className="font-bold text-sm">清晰收支儀表板</h3>
                                <p className="text-xs opacity-75" style={{ color: 'var(--text-sub)' }}>
                                    圖表即時掌握消費趨勢，月度與年度收支一目了然。
                                </p>
                            </div>

                            <div className="p-4 rounded-xl border flex flex-col gap-2 transition-transform hover:-translate-y-1"
                                style={{ backgroundColor: 'var(--bg-card)', borderColor: isDarkMode ? '#3a3b3c' : '#e2e8f0' }}>
                                <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-blue-500/15 text-blue-600 dark:text-blue-300">
                                    <Sparkles size={20} />
                                </div>
                                <h3 className="font-bold text-sm">極速直覺記帳</h3>
                                <p className="text-xs opacity-75" style={{ color: 'var(--text-sub)' }}>
                                    免去複雜表單，簡潔介面輕鬆記錄金額、分類與備註。
                                </p>
                            </div>

                            <div className="p-4 rounded-xl border flex flex-col gap-2 transition-transform hover:-translate-y-1"
                                style={{ backgroundColor: 'var(--bg-card)', borderColor: isDarkMode ? '#3a3b3c' : '#e2e8f0' }}>
                                <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-emerald-500/15 text-emerald-600 dark:text-emerald-300">
                                    <ShieldCheck size={20} />
                                </div>
                                <h3 className="font-bold text-sm">預算超支警報</h3>
                                <p className="text-xs opacity-75" style={{ color: 'var(--text-sub)' }}>
                                    動態追蹤預算使用進度，提前警示月底透支風險。
                                </p>
                            </div>
                        </div>

                        {/* Trust items */}
                        <div className="flex flex-wrap items-center gap-4 text-xs opacity-80 pt-2" style={{ color: 'var(--text-sub)' }}>
                            <div className="flex items-center gap-1.5">
                                <CheckCircle2 size={14} className="text-emerald-500" />
                                <span>個人資料嚴格隔離</span>
                            </div>
                        </div>
                    </div >

                    {/* Right: Login Card */}
                    < div className="lg:col-span-5 flex justify-center" >
                        <div className="w-full max-w-md p-8 rounded-2xl border shadow-xl flex flex-col items-center text-center relative"
                            style={{ backgroundColor: 'var(--bg-card)', borderColor: isDarkMode ? '#3a3b3c' : '#e2e8f0' }}>

                            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-500 to-purple-600 flex items-center justify-center text-2xl text-white shadow-lg shadow-blue-500/20 mb-4">
                                💰
                            </div>

                            <h2 className="text-2xl font-bold tracking-tight mb-1">歡迎體驗 Money Tracker</h2>
                            <p className="text-sm mb-6" style={{ color: 'var(--text-sub)' }}>
                                免信用卡，一鍵開始你的智慧財務管理旅程
                            </p>

                            <div className="w-full py-2 flex flex-col items-center">
                                <GoogleLogin
                                    onSuccess={handleGoogleSuccess}
                                    onError={handleGoogleError}
                                    theme={isDarkMode ? 'filled_black' : 'outline'}
                                    shape="pill"
                                    size="large"
                                    text="continue_with"
                                    locale="zh-TW"
                                />
                            </div>

                            {error && (
                                <div className="w-full mt-4 p-3 rounded-lg text-sm bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 text-left">
                                    {error}
                                </div>
                            )}

                            <div className="w-full mt-6 pt-6 border-t text-xs flex flex-col gap-2 opacity-75"
                                style={{ borderColor: isDarkMode ? '#3a3b3c' : '#edf2f7', color: 'var(--text-sub)' }}>
                                <div className="flex items-center justify-center gap-1.5 flex-wrap">
                                    <ShieldCheck size={14} className="text-blue-500 shrink-0" />
                                    <span>登入即代表同意</span>
                                    <a href="/terms.html" className="underline hover:text-blue-500 transition-colors">服務條款</a>
                                    <span>與</span>
                                    <a href="/privacy.html" className="underline hover:text-blue-500 transition-colors">隱私權政策</a>
                                </div>
                            </div>
                        </div>
                    </div >
                </main >

                {/* Professional Startup Footer */}
                < footer className="w-full border-t px-6 py-8 mt-12 text-xs"
                    style={{ borderColor: isDarkMode ? '#2d3748' : '#e2e8f0', color: 'var(--text-sub)' }
                    }>
                    <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
                        <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4">
                            <span className="font-semibold text-sm" style={{ color: 'var(--text-main)' }}>Money Tracker AI Studio</span>
                            <span>© 2026 All rights reserved.</span>
                        </div>

                        <div className="flex flex-wrap items-center justify-center gap-6">
                            <a
                                href="mailto:contact@money-tracker.xyz"
                                className="inline-flex items-center gap-1.5 hover:text-blue-500 transition-colors"
                            >
                                <Mail size={13} />
                                <span>contact@money-tracker.xyz</span>
                            </a>
                            <a href="/terms.html" className="hover:text-blue-500 transition-colors">
                                服務條款
                            </a>
                            <a href="/privacy.html" className="hover:text-blue-500 transition-colors">
                                隱私權政策
                            </a>
                            <a href="/blog" className="hover:text-blue-500 transition-colors">
                                官方部落格
                            </a>
                            <a href="/calc/" className="hover:text-blue-500 transition-colors">
                                ETF 退休模擬器
                            </a>
                        </div>
                    </div>
                </footer >
            </div >
        </>
    );
}

export default AuthPage;
