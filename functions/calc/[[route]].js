export async function onRequest(context) {
  const { request } = context;
  const url = new URL(request.url);

  // 1. If path is exactly '/calc' (without trailing slash), redirect to '/calc/' (301)
  // This ensures browser relative asset paths like ./assets/... resolve to /calc/assets/...
  if (url.pathname === '/calc') {
    return Response.redirect(`${url.origin}/calc/${url.search}`, 301);
  }

  // 2. Strip leading '/calc' prefix to get upstream subpath
  let subPath = url.pathname.replace(/^\/calc(\/|$)/, '/');
  if (!subPath.startsWith('/')) {
    subPath = '/' + subPath;
  }

  const upstreamUrl = new URL(subPath + url.search, 'https://calc.money-tracker.xyz');

  // 3. Prepare headers
  const reqHeaders = new Headers(request.headers);
  reqHeaders.set('Host', 'calc.money-tracker.xyz');
  reqHeaders.set('X-Forwarded-Host', url.host);
  reqHeaders.set('X-Forwarded-Proto', url.protocol.replace(':', ''));

  // 4. Request options
  const fetchOptions = {
    method: request.method,
    headers: reqHeaders,
    redirect: 'manual',
  };

  if (request.method !== 'GET' && request.method !== 'HEAD') {
    fetchOptions.body = request.body;
    fetchOptions.duplex = 'half';
  }

  try {
    const upstreamRes = await fetch(upstreamUrl.toString(), fetchOptions);

    const resHeaders = new Headers(upstreamRes.headers);

    // If upstream returns a redirect to itself, rewrite it to keep on /calc
    const location = resHeaders.get('Location');
    if (location) {
      if (location.startsWith('https://calc.money-tracker.xyz')) {
        resHeaders.set('Location', location.replace('https://calc.money-tracker.xyz', `${url.origin}/calc`));
      } else if (location.startsWith('/')) {
        resHeaders.set('Location', `/calc${location}`);
      }
    }

    // Preserve / enhance CORS headers
    resHeaders.set('Access-Control-Allow-Origin', '*');

    // For HEAD or status with no content
    if (upstreamRes.status === 204 || upstreamRes.status === 304 || request.method === 'HEAD') {
      return new Response(null, {
        status: upstreamRes.status,
        statusText: upstreamRes.statusText,
        headers: resHeaders,
      });
    }

    const contentType = upstreamRes.headers.get('content-type') || '';
    if (contentType.includes('text/html')) {
      // Delete content-length so chunked transfer handles the dynamic HTML rewriting
      resHeaders.delete('content-length');

      // Use HTMLRewriter to rewrite any absolute /assets/ or relative ./assets/ paths
      const rewriter = new HTMLRewriter()
        .on('script[src]', {
          element(el) {
            const src = el.getAttribute('src');
            if (src && src.startsWith('/assets/')) {
              el.setAttribute('src', `/calc${src}`);
            } else if (src && src.startsWith('./assets/')) {
              el.setAttribute('src', `/calc/${src.slice(2)}`);
            }
          }
        })
        .on('link[href]', {
          element(el) {
            const href = el.getAttribute('href');
            if (href && href.startsWith('/assets/')) {
              el.setAttribute('href', `/calc${href}`);
            } else if (href && href.startsWith('./assets/')) {
              el.setAttribute('href', `/calc/${href.slice(2)}`);
            }
          }
        });

      return rewriter.transform(new Response(upstreamRes.body, {
        status: upstreamRes.status,
        statusText: upstreamRes.statusText,
        headers: resHeaders,
      }));
    }

    return new Response(upstreamRes.body, {
      status: upstreamRes.status,
      statusText: upstreamRes.statusText,
      headers: resHeaders,
    });
  } catch (err) {
    return new Response(`Reverse proxy upstream error: ${err.message}`, {
      status: 502,
      headers: { 'content-type': 'text/plain; charset=utf-8' },
    });
  }
}
