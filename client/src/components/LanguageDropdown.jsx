import React, { useState, useRef, useEffect } from 'react';
import { Globe, Check, ChevronDown } from 'lucide-react';
import { useTranslation } from '../i18n';

/**
 * 頂部導航列專用精緻毛玻璃語言切換器 (LanguageDropdown)
 * 解決非中文使用者登入後無法在首頁快速調整語言的痛點
 */
export default function LanguageDropdown({ isDark = false, className = '' }) {
    const { language, setLanguage, supportedLanguages, currentLanguageMeta } = useTranslation();
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);

    // 點擊外部自動收合
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };

        const handleKeyDown = (event) => {
            if (event.key === 'Escape') {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
            document.addEventListener('keydown', handleKeyDown);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [isOpen]);

    const handleSelectLanguage = (langCode) => {
        setLanguage(langCode);
        setIsOpen(false);
    };

    return (
        <div className={`relative inline-block text-left shrink-0 ${className}`} ref={dropdownRef}>
            {/* 觸發按鈕 (Trigger Button) */}
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className={`h-10 px-3 rounded-xl flex items-center gap-1.5 text-xs font-semibold border transition-all duration-150 active:scale-95 cursor-pointer shadow-xs ${
                    isOpen
                        ? isDark
                            ? 'bg-slate-700 text-white border-blue-500/50 ring-2 ring-blue-500/20'
                            : 'bg-slate-200/80 text-slate-900 border-blue-500/40 ring-2 ring-blue-500/10'
                        : isDark
                            ? 'bg-slate-800/90 hover:bg-slate-700/80 text-slate-200 border-slate-700/80 hover:border-slate-600'
                            : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200/90 hover:border-slate-300'
                }`}
                aria-haspopup="true"
                aria-expanded={isOpen}
                aria-label="Change language"
                title={currentLanguageMeta?.name || 'Change Language'}
            >
                <Globe className="w-4 h-4 shrink-0 text-blue-500 dark:text-blue-400" />
                <span className="tracking-tight font-medium">
                    {currentLanguageMeta?.name || 'Language'}
                </span>
                <ChevronDown
                    className={`w-3.5 h-3.5 opacity-60 transition-transform duration-200 ${
                        isOpen ? 'rotate-180' : ''
                    }`}
                />
            </button>

            {/* 下拉浮層選單 (Dropdown Floating Card) */}
            {isOpen && (
                <div
                    className={`absolute right-0 mt-1.5 w-44 rounded-2xl p-1.5 border shadow-xl z-50 backdrop-blur-xl animate-in fade-in zoom-in-95 duration-150 ${
                        isDark
                            ? 'bg-[#121824]/95 border-white/10 shadow-black/60 text-slate-100'
                            : 'bg-white/95 border-black/[0.08] shadow-slate-900/10 text-slate-800'
                    }`}
                    role="menu"
                    aria-orientation="vertical"
                >
                    <div className="px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 border-b border-black/[0.04] dark:border-white/[0.06] mb-1">
                        Language / 語言
                    </div>

                    <div className="space-y-0.5">
                        {supportedLanguages.map((lang) => {
                            const isSelected = language === lang.code;
                            return (
                                <button
                                    key={lang.code}
                                    type="button"
                                    onClick={() => handleSelectLanguage(lang.code)}
                                    className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-medium transition-all duration-100 active:scale-[0.98] cursor-pointer ${
                                        isSelected
                                            ? isDark
                                                ? 'bg-blue-600/20 text-blue-400 font-bold'
                                                : 'bg-blue-50 text-blue-600 font-bold'
                                            : isDark
                                                ? 'text-slate-300 hover:bg-white/5 hover:text-white'
                                                : 'text-slate-700 hover:bg-slate-100/80 hover:text-slate-900'
                                    }`}
                                    role="menuitem"
                                >
                                    <div className="flex items-center gap-2 min-w-0">
                                        <span className="truncate">{lang.name}</span>
                                        <span className="text-[10px] opacity-60">({lang.shortName})</span>
                                    </div>
                                    {isSelected && <Check className="w-3.5 h-3.5 text-blue-500 shrink-0" />}
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}
