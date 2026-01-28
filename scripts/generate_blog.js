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

// Load posts from external JSON
const posts = require('./blog_content.json');

const template = (post) => `<!DOCTYPE html>
<html lang="zh-TW">
<head>
    ${GA_SCRIPT} <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${post.title} | 記帳助手 Money Tracker</title>
    <meta name="description" content="${post.title} - ${post.category}專文解析。了解更多關於${post.title}的實用建議，搭配 Money Tracker 記帳助手，達成財務目標。">
    <meta property="og:title" content="${post.title}">
    <meta property="og:description" content="${post.title} - ${post.category}專文解析。了解更多關於${post.title}的實用建議，搭配 Money Tracker 記帳助手，達成財務目標。">
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
            line-height: 1.8;
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
            position: sticky;
            top: 0;
            z-index: 10;
        }
        .logo {
            font-size: 24px;
            font-weight: bold;
            color: var(--primary);
            text-decoration: none;
        }
        article {
            background: var(--card);
            padding: 60px;
            border-radius: 16px;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
            margin-top: 30px;
        }
        .category {
            display: inline-block;
            background: #eff6ff;
            color: var(--primary);
            padding: 6px 16px;
            border-radius: 9999px;
            font-size: 14px;
            font-weight: 600;
            margin-bottom: 24px;
        }
        h1 {
            font-size: 36px;
            margin-bottom: 32px;
            line-height: 1.3;
            color: #0f172a;
        }
        h2 {
            font-size: 24px;
            margin-top: 40px;
            margin-bottom: 20px;
            color: #1e293b;
            font-weight: 700;
        }
        h3 {
            font-size: 20px;
            margin-top: 30px;
            margin-bottom: 16px;
            color: #334155;
            font-weight: 600;
        }
        .content {
            font-size: 18px;
            color: #334155;
        }
        .content p {
            margin-bottom: 24px;
        }
        .content ul, .content ol {
            margin-bottom: 24px;
            padding-left: 24px;
        }
        .content li {
            margin-bottom: 12px;
        }
        .content strong {
            color: #0f172a;
            font-weight: 600;
        }
        .cta {
            margin-top: 60px;
            padding: 48px;
            background: linear-gradient(135deg, #1d4ed8 0%, #2563eb 100%);
            border-radius: 16px;
            color: white;
            text-align: center;
            box-shadow: 0 10px 15px -3px rgba(37, 99, 235, 0.3);
        }
        .cta h2 {
            margin-top: 0;
            color: white;
            font-size: 28px;
        }
        .cta p {
            font-size: 18px;
            opacity: 0.9;
            margin-bottom: 32px;
            max-width: 600px;
            margin-left: auto;
            margin-right: auto;
        }
        .btn {
            display: inline-block;
            background: white;
            color: var(--primary);
            padding: 16px 40px;
            border-radius: 12px;
            font-weight: 700;
            font-size: 18px;
            text-decoration: none;
            transition: all 0.2s;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
        }
        .btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.2);
        }
        footer {
            text-align: center;
            padding: 60px 0;
            color: var(--text-light);
            font-size: 14px;
        }
        @media (max-width: 640px) {
            article { padding: 24px; }
            h1 { font-size: 28px; }
            .cta { padding: 32px 20px; }
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
                ${post.content}
            </div>
        </article>

        <div class="cta">
            <h2>理財，從紀錄開始</h2>
            <p><strong>Money Tracker 記帳助手</strong> 幫助您輕鬆追蹤收支、管理資產，在通往財務自由的路上，我們與您同行。</p>
            <a href="/" class="btn">立即免費使用</a>
        </div>

        <footer>
            <div style="margin-bottom: 20px;">
                <a href="/blog/" style="color: #64748b; text-decoration: none; margin: 0 10px;">回首頁</a>
                <a href="/" style="color: #64748b; text-decoration: none; margin: 0 10px;">記帳助手 App</a>
            </div>
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