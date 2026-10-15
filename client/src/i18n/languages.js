/**
 * 支援語系定義與配置清單 (Extensible Languages Registry)
 * 未來接入新語言（如日文 ja-JP、法文 fr-FR 等）只需在此清單加入配置，
 * 並在 locales/ 目錄建立對應字典檔案即可，無需修改核心 Provider 邏輯。
 */
export const SUPPORTED_LANGUAGES = [
    {
        code: 'zh-TW',
        name: '繁體中文',
        shortName: '繁中',
        englishName: 'Traditional Chinese',
        htmlLang: 'zh-Hant',
        direction: 'ltr',
    },
    {
        code: 'en-US',
        name: 'English',
        shortName: 'EN',
        englishName: 'English',
        htmlLang: 'en',
        direction: 'ltr',
    },
    {
        code: 'ja-JP',
        name: '日本語',
        shortName: '日本語',
        englishName: 'Japanese',
        htmlLang: 'ja',
        direction: 'ltr',
    },
    {
        code: 'ko-KR',
        name: '한국어',
        shortName: '한국어',
        englishName: 'Korean',
        htmlLang: 'ko',
        direction: 'ltr',
    },
];

/**
 * 允許第三方或外掛在運行期動態註冊新語言配置
 */
export const registerLanguageConfig = (config) => {
    if (!config || !config.code) return;
    const exists = SUPPORTED_LANGUAGES.some((lang) => lang.code === config.code);
    if (!exists) {
        SUPPORTED_LANGUAGES.push({
            direction: 'ltr',
            htmlLang: config.code.split('-')[0],
            shortName: config.name || config.code,
            englishName: config.name || config.code,
            ...config,
        });
    }
};

export const DEFAULT_LANGUAGE = 'zh-TW';
export const FALLBACK_LANGUAGE = 'zh-TW';

/**
 * 根據瀏覽器設定或偏好偵測最相符的語言代碼
 */
export const detectBrowserLanguage = () => {
    try {
        if (typeof window !== 'undefined' && window.location) {
            const urlLang = new URLSearchParams(window.location.search).get('lang');
            if (urlLang && SUPPORTED_LANGUAGES.some((lang) => lang.code === urlLang)) {
                return urlLang;
            }
        }

        const saved = localStorage.getItem('app_language');
        if (saved && SUPPORTED_LANGUAGES.some((lang) => lang.code === saved)) {
            return saved;
        }

        const navLangs = navigator.languages || [navigator.language || navigator.userLanguage || ''];
        for (const navLang of navLangs) {
            if (!navLang) continue;
            // 優先完全比對 (例如 zh-TW)
            const exact = SUPPORTED_LANGUAGES.find((lang) => lang.code.toLowerCase() === navLang.toLowerCase());
            if (exact) return exact.code;

            // 次之比對前綴 (例如 zh -> zh-TW, en -> en-US)
            const prefix = navLang.split('-')[0].toLowerCase();
            const matchedPrefix = SUPPORTED_LANGUAGES.find((lang) => lang.code.toLowerCase().startsWith(prefix));
            if (matchedPrefix) return matchedPrefix.code;
        }
    } catch (e) {
        // Fallback silently
    }
    return DEFAULT_LANGUAGE;
};
