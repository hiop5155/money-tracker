/**
 * 管理員腳本：設定使用者 Cloudflare D1 會員方案權限 (100% Cloudflare D1 專用)
 * 
 * 支援模式切換：
 *   1. free     (免費版，清空到期日)
 *   2. month    (月度訂閱: pro_monthly, 自動計算 1 個月效期: datetime('now', '+1 month'))
 *   3. year     (年度訂閱: pro_yearly, 自動計算 1 年效期: datetime('now', '+1 year'))
 *   4. life     (終身買斷: pro_lifetime, 永久有效)
 *
 * 用法：
 *   node scripts/set_user_pro.js <email> [mode] [--local] [--account-id <id>]
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

// 自動清除損壞的 npx 臨時目錄以防止 ENOTEMPTY 錯誤
try {
    const npxCache = path.join(os.homedir(), '.npm', '_npx');
    if (fs.existsSync(npxCache)) {
        fs.rmSync(npxCache, { recursive: true, force: true });
    }
} catch {}

const DB_NAME = 'money-tracker-db';

// 模式對照表（使用 SQLite 標準日期函數：+1 month 與 +1 year）
const PLAN_CONFIG = {
    free: {
        planType: 'free',
        label: '免費版 (Free)',
        expiresSql: 'NULL',
        helioCustomerId: 'NULL',
        desc: '已重設為免費版用戶 (plan_type = free, plan_expires_at = NULL, helio_customer_id = NULL)',
    },
    reset: {
        planType: 'free',
        label: '免費版 (Free)',
        expiresSql: 'NULL',
        helioCustomerId: 'NULL',
        desc: '已重設為免費版用戶 (plan_type = free, plan_expires_at = NULL, helio_customer_id = NULL)',
    },
    clear: {
        planType: 'free',
        label: '免費版 (Free)',
        expiresSql: 'NULL',
        helioCustomerId: 'NULL',
        desc: '已重設為免費版用戶 (plan_type = free, plan_expires_at = NULL, helio_customer_id = NULL)',
    },
    month: {
        planType: 'pro_monthly',
        label: '月度訂閱 (Month)',
        expiresSql: "datetime('now', '+1 month')",
        helioCustomerId: "'sub_active_simulated'",
        desc: '享有 Pro 權益，效期至下個月同日 (1 個月)，自動定期續約扣款中',
    },
    monthly: {
        planType: 'pro_monthly',
        label: '月度訂閱 (Month)',
        expiresSql: "datetime('now', '+1 month')",
        helioCustomerId: "'sub_active_simulated'",
        desc: '享有 Pro 權益，效期至下個月同日 (1 個月)，自動定期續約扣款中',
    },
    pro_monthly: {
        planType: 'pro_monthly',
        label: '月度訂閱 (Month)',
        expiresSql: "datetime('now', '+1 month')",
        helioCustomerId: "'sub_active_simulated'",
        desc: '享有 Pro 權益，效期至下個月同日 (1 個月)，自動定期續約扣款中',
    },
    year: {
        planType: 'pro_yearly',
        label: '年度訂閱 (Year)',
        expiresSql: "datetime('now', '+1 year')",
        helioCustomerId: "'sub_active_simulated'",
        desc: '享有 Pro 權益，效期至明年同日 (1 年)，自動定期續約扣款中',
    },
    yearly: {
        planType: 'pro_yearly',
        label: '年度訂閱 (Year)',
        expiresSql: "datetime('now', '+1 year')",
        helioCustomerId: "'sub_active_simulated'",
        desc: '享有 Pro 權益，效期至明年同日 (1 年)，自動定期續約扣款中',
    },
    pro_yearly: {
        planType: 'pro_yearly',
        label: '年度訂閱 (Year)',
        expiresSql: "datetime('now', '+1 year')",
        helioCustomerId: "'sub_active_simulated'",
        desc: '享有 Pro 權益，效期至明年同日 (1 年)，自動定期續約扣款中',
    },
    life: {
        planType: 'pro_lifetime',
        label: '終身買斷 (Life)',
        expiresSql: 'NULL',
        helioCustomerId: 'NULL',
        desc: '⭐ 永久享有 Pro 完整特權 (永不到期)',
    },
    lifetime: {
        planType: 'pro_lifetime',
        label: '終身買斷 (Life)',
        expiresSql: 'NULL',
        helioCustomerId: 'NULL',
        desc: '⭐ 永久享有 Pro 完整特權 (永不到期)',
    },
    pro_lifetime: {
        planType: 'pro_lifetime',
        label: '終身買斷 (Life)',
        expiresSql: 'NULL',
        helioCustomerId: 'NULL',
        desc: '⭐ 永久享有 Pro 完整特權 (永不到期)',
    },
};

function executeD1(email, config, isLocal, accountId) {
    const targetFlag = isLocal ? '--local' : '--remote';
    const cleanEmail = email.toLowerCase().trim().replace(/'/g, "''");
    const accountFlag = accountId ? `--account-id ${accountId}` : '';

    const updateSql = `UPDATE users SET plan_type = '${config.planType}', plan_expires_at = ${config.expiresSql}, helio_customer_id = ${config.helioCustomerId}, updated_at = CURRENT_TIMESTAMP WHERE lower(email) = '${cleanEmail}';`;
    const verifySql = `SELECT id, email, name, plan_type, plan_expires_at, helio_customer_id FROM users WHERE lower(email) = '${cleanEmail}';`;

    const localWrangler = path.join(__dirname, '../node_modules/.bin/wrangler');
    const wranglerBin = fs.existsSync(localWrangler) ? localWrangler : 'npx -y wrangler';

    const updateCmd = `${wranglerBin} d1 execute ${DB_NAME} ${targetFlag} ${accountFlag} --command "${updateSql}"`.trim();
    const verifyCmd = `${wranglerBin} d1 execute ${DB_NAME} ${targetFlag} ${accountFlag} --command "${verifySql}"`.trim();

    console.log(`[執行指令] ${updateCmd}\n`);

    try {
        execSync(updateCmd, { stdio: 'inherit' });
        console.log(`\n🔍 正在驗證 Cloudflare D1 寫入結果...`);
        execSync(verifyCmd, { stdio: 'inherit' });
        return true;
    } catch (err) {
        console.error(`\n❌ Cloudflare D1 執行失敗！`);
        console.error(`錯誤原因: ${err.message}`);
        console.error(`\n💡 常見排錯指引：`);
        console.error(`1. 錯誤碼 7403 (Account not valid or not authorized)：`);
        console.error(`   - 您的 Wrangler 登入狀態可能已過期，請於終端執行: npx wrangler login 重新授權`);
        console.error(`   - 若您擁有多個 Cloudflare 帳號，請執行: npx wrangler whoami 檢查當前帳號`);
        console.error(`   - 若需指定特定 Account ID，請執行: node scripts/set_user_pro.js ${email} ${config.planType} --account-id <你的AccountID>`);
        console.error(`2. 遠端資料庫名稱不符：請確認 Cloudflare 控制台上的 D1 名稱是否為 "${DB_NAME}"`);
        return false;
    }
}

function main() {
    const args = process.argv.slice(2);
    const email = args[0];
    const rawMode = (args[1] || 'life').toLowerCase().trim();
    const isLocal = args.includes('--local');

    // 取得自訂 Account ID (若有傳入)
    let accountId = process.env.CLOUDFLARE_ACCOUNT_ID || '';
    const accIdx = args.indexOf('--account-id');
    if (accIdx !== -1 && args[accIdx + 1]) {
        accountId = args[accIdx + 1];
    }

    if (!email || email.startsWith('--')) {
        console.error('❌ 請提供使用者 Email！');
        console.log('\n用法範例:');
        console.log('  node scripts/set_user_pro.js <email> free   # 切換為免費版');
        console.log('  node scripts/set_user_pro.js <email> month  # 切換為月訂閱 (1個月)');
        console.log('  node scripts/set_user_pro.js <email> year   # 切換為年訂閱 (1年)');
        console.log('  node scripts/set_user_pro.js <email> life   # 切換為永久買斷 (預設)');
        process.exit(1);
    }

    const config = PLAN_CONFIG[rawMode];
    if (!config) {
        console.error(`❌ 不支援的模式: "${rawMode}"`);
        console.log('支援的四種模式: free, month, year, life');
        process.exit(1);
    }

    console.log(`\n==========================================`);
    console.log(`🚀 開始同步 Cloudflare D1 使用者會員方案...`);
    console.log(`   目標用戶: ${email}`);
    console.log(`   目標方案: ${config.label} [${config.planType}]`);
    console.log(`   資料庫:   ${isLocal ? '本地 Local D1' : '雲端 Remote D1: ' + DB_NAME}`);
    if (accountId) console.log(`   Account ID: ${accountId}`);
    console.log(`==========================================\n`);

    const isSuccess = executeD1(email, config, isLocal, accountId);

    if (!isSuccess) {
        console.error('\n💥 操作失敗：Cloudflare D1 未能成功寫入，腳本已強制終止！\n');
        process.exit(1);
    }

    console.log('\n==========================================');
    console.log(`🎉 Cloudflare D1 會員方案設定成功！`);
    console.log(`   帳號: ${email}`);
    console.log(`   狀態: ${config.desc}`);
    console.log('==========================================\n');
    process.exit(0);
}

main();
