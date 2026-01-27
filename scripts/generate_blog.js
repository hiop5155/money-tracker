const fs = require('fs');
const path = require('path');

const BLOG_DIR = path.join(__dirname, '..', 'blog');

// Ensure blog directory exists
if (!fs.existsSync(BLOG_DIR)) {
    fs.mkdirSync(BLOG_DIR, { recursive: true });
}

// === 1. 定義 Google Analytics 代碼 ===
const GA_SCRIPT = `
<script async src="https://www.googletagmanager.com/gtag/js?id=G-J6Q197M3NN"></script>
<script>
window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());

gtag('config', 'G-J6Q197M3NN');
</script>
`;

const posts = [
    // Theme 1: Engineer Finance (18)
    { id: 1, title: '竹科工程師如何合法節稅？', slug: 'hsinchu-engineer-tax-tips', category: '工程師理財' },
    { id: 2, title: '年薪 300 萬工程師資產配置建議 PTT', slug: 'engineer-asset-allocation-3m', category: '工程師理財' },
    { id: 3, title: '科技業分紅 RSU 怎麼報稅最划算？', slug: 'tech-rsu-tax-planning', category: '工程師理財' },
    { id: 4, title: '工程師適合買房還是租房投資？', slug: 'engineer-buy-vs-rent', category: '工程師理財' },
    { id: 5, title: '沒時間看盤的工程師適合存股嗎？', slug: 'busy-engineer-stock-saving', category: '工程師理財' },
    { id: 6, title: '輪班工程師如何規劃被動收入？', slug: 'shift-worker-passive-income', category: '工程師理財' },
    { id: 7, title: '單身工程師 35 歲前存到 1000 萬的方法', slug: 'single-engineer-10m-goal', category: '工程師理財' },
    { id: 8, title: '工程師提早退休 FIRE 需要多少錢？', slug: 'engineer-fire-retirement-calc', category: '工程師理財' },
    { id: 9, title: '高收入族群如何利用保險節稅？', slug: 'high-income-insurance-tax', category: '工程師理財' },
    { id: 10, title: '科技業員工認股權 (ESPP) 要賣還是留？', slug: 'tech-espp-strategy', category: '工程師理財' },
    { id: 11, title: '適合忙碌工程師的定期定額 ETF 推薦', slug: 'busy-engineer-etf-recommendation', category: '工程師理財' },
    { id: 12, title: '雙薪工程師家庭理財與育兒費用規劃', slug: 'dual-income-engineer-family-budget', category: '工程師理財' },
    { id: 13, title: '系統廠 vs. IC 設計工程師理財觀念差異', slug: 'system-vs-ic-design-finance', category: '工程師理財' },
    { id: 14, title: '工程師轉職降薪對財務規劃的影響', slug: 'engineer-career-change-finance', category: '工程師理財' },
    { id: 15, title: '科技業裁員潮下的緊急預備金要存多少？', slug: 'tech-layoff-emergency-fund', category: '工程師理財' },
    { id: 16, title: '工程師買房頭期款要存多久？', slug: 'engineer-house-downpayment', category: '工程師理財' },
    { id: 17, title: '美股券商與複委託哪個適合沒空的工程師？', slug: 'us-stock-broker-vs-sub-brokerage', category: '工程師理財' },
    { id: 18, title: '工程師如何避免生活通膨 (Lifestyle Inflation)？', slug: 'engineer-avoiding-lifestyle-inflation', category: '工程師理財' },

    // Theme 2: Lazy Bookkeeping (16)
    { id: 19, title: '2026 台灣全自動記帳 APP 推薦', slug: '2026-auto-budget-app-taiwan', category: '懶人記帳' },
    { id: 20, title: '可以同步銀行帳戶的記帳軟體有哪些？', slug: 'bank-sync-budget-software', category: '懶人記帳' },
    { id: 21, title: '載具發票自動匯入記帳 APP 比較', slug: 'invoice-sync-budget-app-comparison', category: '懶人記帳' },
    { id: 22, title: '懶人記帳 Google Sheet 表格範本下載', slug: 'lazy-budget-google-sheet-template', category: '懶人記帳' },
    { id: 23, title: '信用卡自動記帳功能安全性如何？', slug: 'credit-card-auto-budget-safety', category: '懶人記帳' },
    { id: 24, title: '三信封理財法適合懶人嗎？', slug: 'three-envelopes-budgeting-lazy', category: '懶人記帳' },
    { id: 25, title: '記帳總是半途而廢怎麼辦？', slug: 'how-to-stop-quitting-budgeting', category: '懶人記帳' },
    { id: 26, title: '適合大學生的簡單記帳法 Dcard', slug: 'student-simple-budgeting-dcard', category: '懶人記帳' },
    { id: 27, title: '不用動手記帳的理財工具', slug: 'hands-free-financial-tools', category: '懶人記帳' },
    { id: 28, title: '記帳城市 vs. 麻布記帳 哪個好用？', slug: 'fortune-city-vs-moneybook-review', category: '懶人記帳' },
    { id: 29, title: '固定支出很多的懶人記帳技巧', slug: 'fixed-expense-budgeting-tips', category: '懶人記帳' },
    { id: 30, title: '如何用 LINE 機器人快速記帳？', slug: 'line-bot-easy-budgeting', category: '懶人記帳' },
    { id: 31, title: '記帳軟體如何連結悠遊卡紀錄？', slug: 'budget-app-easycard-sync', category: '懶人記帳' },
    { id: 32, title: '50-30-20 理財法則 Excel 試算表', slug: '50-30-20-budget-rule-excel', category: '懶人記帳' },
    { id: 33, title: '適合月光族的無痛記帳法', slug: 'painless-budgeting-for-spendthrifts', category: '懶人記帳' },
    { id: 34, title: '只有記帳存不到錢的原因是什麼？', slug: 'why-budgeting-is-not-enough-to-save', category: '懶人記帳' },

    // Theme 3: Passive Income (16)
    { id: 35, title: '如何製作台美股股息追蹤 Excel？', slug: 'dividend-tracking-excel-template', category: '被動收入' },
    { id: 36, title: '免費被動收入儀表板 Notion 模板', slug: 'free-passive-income-notion-dashboard', category: '被動收入' },
    { id: 37, title: '00878 0056 00919 配息追蹤工具推薦', slug: 'taiwan-high-dividend-etf-tracker', category: '被動收入' },
    { id: 38, title: '如何計算每月平均被動收入現金流？', slug: 'how-to-calculate-monthly-passive-cashflow', category: '被動收入' },
    { id: 39, title: '房租與股利收入如何合併管理？', slug: 'rent-and-dividend-income-management', category: '被動收入' },
    { id: 40, title: '適合台灣人的資產淨值追蹤 APP', slug: 'taiwan-net-worth-tracker-app', category: '被動收入' },
    { id: 41, title: '存股族如何試算複利效應與現金流？', slug: 'dividend-compounding-calculator-for-taiwan', category: '被動收入' },
    { id: 42, title: '記帳軟體可以追蹤股票損益嗎？', slug: 'budget-app-stock-pnl-tracking', category: '被動收入' },
    { id: 43, title: '虛擬貨幣質押收益怎麼記錄？', slug: 'crypto-staking-income-logging', category: '被動收入' },
    { id: 44, title: '部落格廣告收入與聯盟行銷報表製作', slug: 'blog-ads-affiliate-income-report', category: '被動收入' },
    { id: 45, title: '退休族如何追蹤每月現金流是否夠用？', slug: 'retiree-cashflow-sufficiency-tracker', category: '被動收入' },
    { id: 46, title: '股息再投入 (DRIP) 如何記帳？', slug: 'dividend-reinvestment-drip-accounting', category: '被動收入' },
    { id: 47, title: '跨券商投資組合績效追蹤工具', slug: 'cross-brokerage-portfolio-tracker', category: '被動收入' },
    { id: 48, title: '如何設定被動收入覆蓋生活費的目標？', slug: 'setting-passive-income-financial-freedom-goal', category: '被動收入' },
    { id: 49, title: '領股息要繳二代健保怎麼算？', slug: 'dividend-tax-second-generation-insurance-calc', category: '被動收入' },
    { id: 50, title: '高股息 ETF 填息天數追蹤網站', slug: 'high-dividend-etf-filling-days-tracker', category: '被動收入' },
];

const template = (post) => `<!DOCTYPE html>
<html lang="zh-TW">
<head>
    ${GA_SCRIPT} <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${post.title} | 記帳助手 Money Tracker</title>
    <meta name="description" content="${post.title}：針對${post.category}提供的專業解析，幫助您更有效率地管理個人財務空間。">
    <meta property="og:title" content="${post.title}">
    <meta property="og:description" content="了解更多關於${post.title}的詳細內容，提升您的理財智慧。">
    <meta property="og:type" content="article">
    <style>
        :root {
            --primary: #2563eb;
            --primary-dark: #1e40af;
            --bg: #f8fafc;
            --card: #ffffff;
            --text: #1e293b;
            --text-light: #64748b;
        }
        body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            background-color: var(--bg);
            color: var(--text);
            line-height: 1.6;
            margin: 0;
            padding: 0;
        }
        .container {
            max-width: 800px;
            margin: 0 auto;
            padding: 40px 20px;
        }
        header {
            background: var(--card);
            border-bottom: 1px solid #e2e8f0;
            padding: 20px 0;
            text-align: center;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }
        .logo {
            font-size: 24px;
            font-weight: bold;
            color: var(--primary);
            text-decoration: none;
        }
        article {
            background: var(--card);
            padding: 40px;
            border-radius: 12px;
            box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
            margin-top: 20px;
        }
        .category {
            display: inline-block;
            background: #dbeafe;
            color: var(--primary);
            padding: 4px 12px;
            border-radius: 9999px;
            font-size: 14px;
            font-weight: 600;
            margin-bottom: 20px;
        }
        h1 {
            font-size: 32px;
            margin-bottom: 24px;
            line-height: 1.2;
        }
        .content {
            font-size: 18px;
            color: #334155;
        }
        .cta {
            margin-top: 60px;
            padding: 40px;
            background: linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%);
            border-radius: 12px;
            color: white;
            text-align: center;
        }
        .cta h2 {
            margin-top: 0;
        }
        .btn {
            display: inline-block;
            background: white;
            color: var(--primary);
            padding: 12px 32px;
            border-radius: 8px;
            font-weight: bold;
            text-decoration: none;
            margin-top: 20px;
            transition: transform 0.2s;
        }
        .btn:hover {
            transform: scale(1.05);
        }
        footer {
            text-align: center;
            padding: 40px 0;
            color: var(--text-light);
            font-size: 14px;
        }
        @media (max-width: 640px) {
            article { padding: 20px; }
            h1 { font-size: 24px; }
        }
    </style>
</head>
<body>
    <header>
        <a href="/" class="logo">💰 記帳助手</a>
    </header>
    <div class="container">
        <article>
            <span class="category">${post.category}</span>
            <h1>${post.title}</h1>
            <div class="content">
                <p>在當今快節奏的社會中，<strong>${post.title}</strong> 已成為許多人關注的焦點。無論您是專業人士還是初學者，深入了解 ${post.category} 領域的知識，都能為您的財務健康帶來顯著的提升。</p>
                <p>這篇文章將探討與此主題相關的核心概念，並提供實用的建議，幫助您優化您的個人理財策略。</p>
                <h2>為什麼這很重要？</h2>
                <p>有效的財務規劃不僅僅是記錄開支，更是一種生活態度的體現。透過掌握 ${post.title} 的技巧，您可以更清晰地掌握資產流向，減少不必要的浪費，並為未來的夢想積累資本。</p>
                <h2>實踐建議</h2>
                <ul>
                    <li><strong>持之以恆：</strong> 建立規律的習慣是成功的基石。</li>
                    <li><strong>使用工具：</strong> 選擇適合自己的記帳工具（如 Money Tracker）。</li>
                    <li><strong>定期回顧：</strong> 每月審視自己的收支狀況並做出調整。</li>
                </ul>
                <p>希望這篇關於 <strong>${post.title}</strong> 的簡介對您有所啟發。理財是一場馬拉松，踏出第一步就是成功的開始。</p>
            </div>
        </article>

        <div class="cta">
            <h2>想要更智慧地管理您的金錢嗎？</h2>
            <p>立即試用我們的「記帳助手」，體驗自動化與智能分析帶來的便利。</p>
            <a href="/" class="btn">開始使用</a>
        </div>

        <footer>
            &copy; 2026 記帳助手 Money Tracker. All rights reserved.
        </footer>
    </div>
</body>
</html>`;

// Generate HTML files
posts.forEach((post) => {
    const filePath = path.join(BLOG_DIR, `${post.slug}.html`);
    fs.writeFileSync(filePath, template(post));
    console.log(`Generated: ${post.slug}.html`);
});

// Generate sitemap.xml
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
    <url>
        <loc>https://money-tracker.xyz/</loc>
        <priority>1.0</priority>
    </url>
${posts.map(post => `    <url>
        <loc>https://money-tracker.xyz/blog/${post.slug}.html</loc>
        <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
        <priority>0.8</priority>
    </url>`).join('\n')}
</urlset>`;

fs.writeFileSync(path.join(BLOG_DIR, 'sitemap.xml'), sitemap);
console.log('Generated: sitemap.xml');

// Generate robots.txt
// 修正：配合 Nginx 設定，Sitemap 指向根目錄
const robots = `User-agent: *
Allow: /
Sitemap: https://money-tracker.xyz/sitemap.xml
`;
fs.writeFileSync(path.join(BLOG_DIR, 'robots.txt'), robots);
console.log('Generated: robots.txt');

// Generate index.html for blog listing
const listTemplate = `<!DOCTYPE html>
<html lang="zh-TW">
<head>
    ${GA_SCRIPT} <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>理財知識庫 | 記帳助手 Money Tracker</title>
    <style>
        :root { --primary: #2563eb; --bg: #f8fafc; --card: #ffffff; }
        body { font-family: sans-serif; background: var(--bg); margin: 0; padding: 0; }
        .container { max-width: 800px; margin: 0 auto; padding: 40px 20px; }
        header { background: var(--card); padding: 20px; text-align: center; border-bottom: 1px solid #e2e8f0; }
        h1 { color: #1e293b; }
        .post-list { list-style: none; padding: 0; }
        .post-item { background: white; margin-bottom: 12px; padding: 20px; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
        .post-item a { text-decoration: none; color: var(--primary); font-weight: bold; font-size: 18px; }
        .post-item .cat { font-size: 12px; color: #64748b; display: block; margin-bottom: 4px; }
    </style>
</head>
<body>
    <header><h1>理財知識庫</h1></header>
    <div class="container">
        <ul class="post-list">
            ${posts.map(p => `
            <li class="post-item">
                <span class="cat">${p.category}</span>
                <a href="/blog/${p.slug}.html">${p.title}</a>
            </li>
            `).join('')}
        </ul>
    </div>
</body>
</html>`;
fs.writeFileSync(path.join(BLOG_DIR, 'index.html'), listTemplate);
console.log('Generated: index.html');