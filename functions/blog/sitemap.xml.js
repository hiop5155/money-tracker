// Cloudflare Pages Functions - 動態 Edge /blog/sitemap.xml 生成
// 每天自動回傳最新當日 lastmod 日期，並自動適配當前網域

export async function onRequest(context) {
    const { request, env } = context;
    const url = new URL(request.url);

    try {
        const res = await env.ASSETS.fetch(request);
        if (!res.ok) {
            return res;
        }

        const xml = await res.text();
        const today = new Date().toISOString().split('T')[0];

        let dynamicXml = xml.replace(/<lastmod>[\s\S]*?<\/lastmod>/g, `<lastmod>${today}</lastmod>`);

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
