// Pages remains the static origin. This tiny Worker uses Cloudflare-managed
// Custom Domain DNS/TLS, avoiding a separate manually maintained DNS record.
export default {
  async fetch(request) {
    if(!['GET','HEAD'].includes(request.method)) return new Response('Method not allowed',{status:405,headers:{Allow:'GET, HEAD'}});
    const upstream=new URL(request.url);
    upstream.protocol='https:';upstream.hostname='shengyin-72d.pages.dev';upstream.port='';
    const headers=new Headers(request.headers);headers.delete('host');
    try {
      // Stream the original response; retain MIME, cache, Range and SW headers.
      return await fetch(new Request(upstream,{method:request.method,headers,redirect:'follow'}));
    } catch {
      return new Response('小屋暂时没有连接上，请稍后再试。',{status:503,headers:{'Content-Type':'text/plain; charset=utf-8','Retry-After':'10'}});
    }
  },
};
