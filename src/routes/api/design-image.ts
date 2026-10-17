import { createFileRoute } from '@tanstack/react-router';
import { generateImage, editImage } from '@/lib/image-gateway.server';
import { imageCaller, imageBlocked, recordImageBlock } from '@/lib/ai-image-access.server';
export const Route = createFileRoute('/api/design-image')({server:{handlers:{POST:async({request})=>{
 const url=process.env['SUPABASE_URL'], key=process.env['SUPABASE_PUBLISHABLE_KEY'], apiKey=process.env['LOVABLE_API_KEY'];
 if(!url || !key || !apiKey) return Response.json({error:{message:'AI image tools are not configured.'}},{status:503});
 if(!await imageCaller(request,url,key)) return Response.json({error:{message:'Please sign in to use AI image tools.'}},{status:401});
 const origin=request.headers.get('origin');
 if(origin && origin!==new URL(request.url).origin) return new Response('Forbidden',{status:403});
 const blocked=await imageBlocked(); if(blocked) return blocked;
 const config={baseURL:'https://ai.gateway.lovable.dev',apiKey,model:'openai/gpt-image-2.5-sunburst',format:'openai' as const};
 let upstream:Response;
 if(request.headers.get('content-type')?.includes('multipart/form-data')) {
  const form=await request.formData(); const prompt=form.get('prompt');
  if(typeof prompt!=='string' || !prompt.trim()) return new Response('An edit instruction is required',{status:400});
  const files=[...form.entries()].filter(([name])=>name==='image' || name==='image[]').map(([,value])=>value);
  if(!files.length || files.some(x=>!(x instanceof File) || !['image/png','image/jpeg','image/webp'].includes(x.type) || x.size>10000000)) return new Response('Attach PNG, JPEG or WebP images under 10 MB',{status:400});
  upstream=await editImage(config,form);
 }else{
  const {prompt,stream=true}=await request.json() as {prompt?:string;stream?:boolean};
  if(!prompt?.trim()) return new Response('An image instruction is required',{status:400});
  upstream=await generateImage(config,prompt,stream);
 }
 await recordImageBlock(upstream);
 const headers=new Headers({'Content-Type':upstream.headers.get('Content-Type') ?? 'application/json','Cache-Control':'no-cache, no-transform'});
 upstream.headers.forEach((value,name)=>{if(name.toLowerCase().startsWith('x-lovable-aig-')) headers.set(name,value);});
 return new Response(upstream.body,{status:upstream.status,headers});
}}}});
