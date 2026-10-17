import { createClient } from '@supabase/supabase-js';
export async function imageCaller(request: Request, url: string, key: string) {
  const token = request.headers.get('authorization')?.replace(/^Bearer /, '');
  if (!token) return false;
  const client = createClient(url, key, { auth: {persistSession:false,autoRefreshToken:false}, global: { headers: {Authorization:`Bearer ${token}`}, fetch: (input,init) => { const headers = new Headers(init?.headers); headers.set('apikey',key); return fetch(input,{...init,headers}); } } });
  const {data,error} = await client.auth.getUser(token);
  return !error && !!data.user;
}
export async function imageBlocked() {
  const {supabaseAdmin} = await import('@/integrations/supabase/client.server');
  const {data,error} = await supabaseAdmin.from('ai_service_state').select('status,message').eq('service','images').maybeSingle();
  if(error) throw error;
  return data ? Response.json({error:{message:data.message}},{status:data.status}) : null;
}
export async function recordImageBlock(response: Response) {
  if (![402,403].includes(response.status)) return;
  const text=await response.clone().text();
  let message=text;
  try {const data=JSON.parse(text);message=data.message ?? data.error?.message ?? text;}catch { /* plain upstream error */ }
  const {supabaseAdmin}=await import('@/integrations/supabase/client.server');
  const {error}=await supabaseAdmin.from('ai_service_state').upsert({service:'images',status:response.status,message});
  if(error) throw error;
}
