/**
 * 會員方案與付費身份管理模組
 * 說明：
 * 1. 程式碼中絕不寫死任何特定用戶 Email，避免客戶端抓包洩漏。
 * 2. 支援從伺服器端私有環境變數 PRO_ADMIN_EMAILS 自動同步會員資格。
 * 3. 一旦匹配，直接更新資料庫為合法的 'pro_lifetime' 正式付費會員，
 *    使該用戶在全系統所有模組與回傳數據中，皆為標準、合法的付費會員。
 */

/**
 * 取得伺服器端環境變數中的特權名單 (僅存於伺服器環境變數，絕不暴露給前端)
 */
function getAdminEmails() {
    const raw = process.env.PRO_ADMIN_EMAILS || '';
    return raw
        .split(',')
        .map((e) => e.trim().toLowerCase())
        .filter(Boolean);
}

/**
 * 檢查該用戶是否為環境變數指定的永久 Pro 用戶
 */
function isConfiguredAdminEmail(email) {
    if (!email) return false;
    const adminEmails = getAdminEmails();
    return adminEmails.includes(email.toLowerCase().trim());
}

/**
 * 自動同步並確保特權用戶在資料庫中為合法的付費會員 (pro_lifetime)
 * @param {Object} user Mongoose User Document
 * @returns {Promise<Object>} 更新後的 user 物件
 */
async function syncUserProStatus(user) {
    if (!user || !user.email) return user;

    // 若該 Email 列於伺服器環境變數 PRO_ADMIN_EMAILS 中，且資料庫中尚未是 pro_lifetime
    if (isConfiguredAdminEmail(user.email)) {
        if (user.plan_type !== 'pro_lifetime' || user.plan_expires_at !== null) {
            user.plan_type = 'pro_lifetime';
            user.plan_expires_at = null;
            try {
                await user.save();
                console.log(`[PlanSync] 使用者 ${user.email} 已自動同步為合法永久 Pro 會員 (pro_lifetime)`);
            } catch (err) {
                console.error(`[PlanSync] 同步使用者 ${user.email} 失敗:`, err.message);
            }
        }
    }

    return user;
}

/**
 * 標準的 Pro 付費會員判定 (全系統所有模組通用，絕無任何特例 bypass)
 */
function isUserPro(user) {
    if (!user) return false;

    const planType = user.plan_type || 'free';
    if (planType === 'pro_lifetime' || planType === 'lifetime') {
        return true;
    }

    // 若有設定到期日，以到期日為準 (到期日在未來即為有效 Pro 會員)
    if (user.plan_expires_at) {
        return new Date(user.plan_expires_at) > new Date();
    }

    if (planType === 'pro') {
        return true;
    }

    return false;
}

module.exports = {
    isConfiguredAdminEmail,
    syncUserProStatus,
    isUserPro,
};
