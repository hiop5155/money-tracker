// Cloudflare Pages Functions - 動態 Edge Sitemap 生成
// 每天自動回傳最新當日 lastmod 日期，並自動適配當前網域

export async function onRequest(context) {
    const { request, env } = context;
    const url = new URL(request.url);

    try {
        // 從靜態資源庫讀取完整部落格 sitemap.xml
        const assetUrl = new URL('/blog/sitemap.xml', request.url);
        const res = await env.ASSETS.fetch(new Request(assetUrl, request));

        if (!res.ok) {
            return env.ASSETS.fetch(request);
        }

        const xml = await res.text();
        const today = new Date().toISOString().split('T')[0];

        // 1. 動態替換所有 <lastmod> 為當日 UTC 日期
        let dynamicXml = xml.replace(/<lastmod>[\s\S]*?<\/lastmod>/g, `<lastmod>${today}</lastmod>`);

        // 2. 若非本機開發，將網域替換為當前訪問來源 (例如 pages.dev 或自訂網域)，避免跨網域問題
        if (!url.origin.includes('localhost') && !url.origin.includes('127.0.0.1')) {
            dynamicXml = dynamicXml.replace(/https:\/\/money-tracker\.xyz/g, url.origin);
        }

        return new Response(dynamicXml, {
            status: 200,
            headers: {
                'content-type': 'application/xml; charset=utf-8',
                'cache-control': 'public, max-age=3600, s-maxage=3600',
            },
        });
    } catch (err) {
        return env.ASSETS.fetch(request);
    }
}
