// Cloudflare Pages Functions - 動態 Edge robots.txt
// 自動將 Sitemap 指向當前網域的 /sitemap.xml

export async function onRequest(context) {
    const { request } = context;
    const url = new URL(request.url);
    const origin = url.origin;
    const robots = `User-agent: *
Allow: /
Disallow: /api/

Sitemap: ${origin}/sitemap.xml
`;
    return new Response(robots, {
        headers: {
            'content-type': 'text/plain; charset=utf-8',
            'cache-control': 'public, max-age=86400',
        },
    });
}
