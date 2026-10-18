// Pages remains the static origin. This tiny Worker uses Cloudflare-managed
// Custom Domain DNS/TLS, avoiding a separate manually maintained DNS record.
export default {
  async fetch(request) {
    if(!['GET','HEAD'].includes(request.method)) return new Response('Method not allowed',{status:405,headers:{Allow:'GET, HEAD'}});
    const upstream=new URL(request.url);
    upstream.protocol='https:';upstream.hostname='shengyin-72d.pages.dev';upstream.port='';
    const headers=new Headers(request.headers);headers.delete('host');
    const range=request.headers.get('Range');
    if(range)headers.set('Accept-Encoding','identity');
    try {
      // Stream the original response; retain MIME, cache, Range and SW headers.
      const response=await fetch(new Request(upstream,{method:request.method,headers,redirect:'follow'}));
      // Some Pages edge responses ignore Range on a Worker subrequest. Slice
      // the stream ourselves without buffering a full recording in memory.
      if(!range||response.status!==200||request.headers.has('If-Range')||response.headers.has('Content-Encoding'))return response;
      const size=Number(response.headers.get('Content-Length'));
      if(!Number.isSafeInteger(size)||size<=0)return response;
      const match=/^bytes=(\d*)-(\d*)$/.exec(range);
      const start=match?.[1]?Number(match[1]):Math.max(0,size-Number(match?.[2]));
      const end=match?.[1]?(match[2]?Math.min(Number(match[2]),size-1):size-1):size-1;
      if(!match||!match[1]&&!match[2]||!match[1]&&Number(match[2])===0||!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||start>end||start>=size){
        await response.body?.cancel();return new Response(null,{status:416,headers:{'Content-Range':`bytes */${size}`}});
      }
      const output=new Headers(response.headers);output.set('Content-Range',`bytes ${start}-${end}/${size}`);output.set('Content-Length',String(end-start+1));output.set('Accept-Ranges','bytes');
      if(!response.body)return new Response(null,{status:206,headers:output});
      const reader=response.body.getReader();let offset=0;
      const body=new ReadableStream({
        async pull(controller){
          try{while(true){
            const {done,value}=await reader.read();if(done){controller.close();return;}
            const first=Math.max(0,start-offset),last=Math.min(value.byteLength,end+1-offset);offset+=value.byteLength;
            if(last>first)controller.enqueue(value.subarray(first,last));
            if(offset>end){controller.close();await reader.cancel();return;}
            if(last>first)return;
          }}catch(error){controller.error(error);}
        },
        cancel(reason){return reader.cancel(reason);},
      });
      return new Response(body,{status:206,headers:output});
    } catch {
      return new Response('小屋暂时没有连接上，请稍后再试。',{status:503,headers:{'Content-Type':'text/plain; charset=utf-8','Retry-After':'10'}});
    }
  },
};
