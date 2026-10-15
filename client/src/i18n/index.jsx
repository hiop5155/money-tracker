import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import zhTW from './locales/zh-TW';
import enUS from './locales/en-US';
import jaJP from './locales/ja-JP';
import koKR from './locales/ko-KR';
import {
    SUPPORTED_LANGUAGES,
    DEFAULT_LANGUAGE,
    FALLBACK_LANGUAGE,
    detectBrowserLanguage,
    registerLanguageConfig,
} from './languages';

// 預設內建字典表 (支援動態擴充更多外部語系)
const activeDictionaries = {
    'zh-TW': zhTW,
    'en-US': enUS,
    'ja-JP': jaJP,
    'ko-KR': koKR,
};

// 訂閱事件用於通知 React 元件有新語言動態載入
const localeChangeListeners = new Set();

// 語言註冊表（允許外部、微前端或非同步載入第三方新語系）
export const registerLocale = (code, dictionary, meta = null) => {
    activeDictionaries[code] = dictionary;
    if (meta) {
        registerLanguageConfig({ code, ...meta });
    }
    localeChangeListeners.forEach((fn) => fn());
};

export { SUPPORTED_LANGUAGES, DEFAULT_LANGUAGE, FALLBACK_LANGUAGE };

const I18nContext = createContext({
    language: DEFAULT_LANGUAGE,
    setLanguage: () => {},
    t: (key) => key,
    formatCurrency: (amount) => `$${amount}`,
    supportedLanguages: SUPPORTED_LANGUAGES,
    currentLanguageMeta: SUPPORTED_LANGUAGES[0],
});

export const I18nProvider = ({ children, initialLanguage = null }) => {
    const [language, setLanguageState] = useState(() => initialLanguage || detectBrowserLanguage());
    const [, setRegistryVersion] = useState(0);

    // 監聽動態註冊新語系，觸發重新渲染
    useEffect(() => {
        const handleRegister = () => setRegistryVersion((v) => v + 1);
        localeChangeListeners.add(handleRegister);
        return () => localeChangeListeners.delete(handleRegister);
    }, []);

    const currentLanguageMeta = useMemo(() => {
        return (
            SUPPORTED_LANGUAGES.find((lang) => lang.code === language) ||
            SUPPORTED_LANGUAGES.find((lang) => lang.code === DEFAULT_LANGUAGE) ||
            SUPPORTED_LANGUAGES[0]
        );
    }, [language]);

    const setLanguage = useCallback((newLang) => {
        if (activeDictionaries[newLang] || SUPPORTED_LANGUAGES.some((l) => l.code === newLang)) {
            setLanguageState(newLang);
            try {
                localStorage.setItem('app_language', newLang);
            } catch (e) {
                // Ignore storage error
            }
        }
    }, []);

    // 動態設定 HTML 標籤屬性 (lang 與 dir)
    useEffect(() => {
        if (typeof document !== 'undefined') {
            document.documentElement.lang = currentLanguageMeta.htmlLang || 'zh-Hant';
            document.documentElement.dir = currentLanguageMeta.direction || 'ltr';
        }
    }, [currentLanguageMeta]);

    // 支援深層點記號、參數替換與自動回退鏈 (Fallback Chain)
    const t = useCallback(
        (path, params = {}) => {
            if (!path || typeof path !== 'string') return '';
            const keys = path.split('.');

            // 1. 查找目前選擇的語言
            let current = activeDictionaries[language];
            let found = true;
            for (const key of keys) {
                if (current && typeof current === 'object' && key in current) {
                    current = current[key];
                } else {
                    found = false;
                    break;
                }
            }

            // 2. 若缺少則回退至預設語言 (Fallback Language)
            if (!found) {
                let fallback = activeDictionaries[FALLBACK_LANGUAGE];
                let fallbackFound = true;
                for (const fbKey of keys) {
                    if (fallback && typeof fallback === 'object' && fbKey in fallback) {
                        fallback = fallback[fbKey];
                    } else {
                        fallbackFound = false;
                        break;
                    }
                }
                if (fallbackFound) {
                    current = fallback;
                    found = true;
                }
            }

            // 3. 處理字串參數替換
            if (found && typeof current === 'string') {
                return current.replace(/\{(\w+)\}/g, (_, k) => (k in params ? params[k] : `{${k}}`));
            }

            // 若回傳為陣列或物件（如 weekdays）直接返回
            if (found && current !== undefined) {
                return current;
            }

            // 4. 若完全找不到則返回 path
            return path;
        },
        [language]
    );

    const formatCurrency = useCallback(
        (amount, currency = 'TWD') => {
            try {
                return new Intl.NumberFormat(language, {
                    style: 'currency',
                    currency: currency,
                    maximumFractionDigits: 0,
                }).format(amount);
            } catch {
                return `$${Number(amount || 0).toLocaleString()}`;
            }
        },
        [language]
    );

    const contextValue = useMemo(
        () => ({
            language,
            setLanguage,
            t,
            formatCurrency,
            supportedLanguages: [...SUPPORTED_LANGUAGES],
            currentLanguageMeta,
        }),
        [language, setLanguage, t, formatCurrency, currentLanguageMeta]
    );

    return <I18nContext.Provider value={contextValue}>{children}</I18nContext.Provider>;
};

export const useTranslation = () => useContext(I18nContext);

/**
 * 語言切換按鈕群（可隨 SUPPORTED_LANGUAGES 自動動態擴充）
 */
export const LanguageToggle = ({ className = '' }) => {
    const { language, setLanguage, supportedLanguages } = useTranslation();

    return (
        <div
            role="group"
            aria-label="Language selection"
            className={`inline-flex items-center p-0.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100/80 dark:bg-slate-800/80 text-xs font-semibold ${className}`}
        >
            {supportedLanguages.map((lang) => {
                const isActive = language === lang.code;
                return (
                    <button
                        key={lang.code}
                        type="button"
                        onClick={() => setLanguage(lang.code)}
                        className={`px-2.5 py-1 rounded-lg transition-all active:scale-95 ${
                            isActive
                                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs font-bold'
                                : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                        }`}
                        title={lang.englishName}
                    >
                        {lang.shortName || lang.name}
                    </button>
                );
            })}
        </div>
    );
};

/**
 * 適用於多語言擴充的下拉選單 (Language Select)
 */
export const LanguageSelect = ({ className = '' }) => {
    const { language, setLanguage, supportedLanguages } = useTranslation();

    return (
        <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className={`px-3 py-1.5 rounded-xl border text-xs font-medium cursor-pointer transition-colors bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 outline-none focus:ring-1 focus:ring-blue-500 ${className}`}
        >
            {supportedLanguages.map((lang) => (
                <option key={lang.code} value={lang.code}>
                    {lang.name} ({lang.shortName})
                </option>
            ))}
        </select>
    );
};

export default I18nContext;
