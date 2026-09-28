import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { encryptCredentials } from './shipping-crypto';
import { testProvider } from './shipping-engine';

type Provider = 'yalidine'|'zr_express'|'maystro'|'noest'|'dhd';
const META: Record<Provider,{label:string;fields:string[]}> = {
  yalidine:{label:'Yalidine Express',fields:['apiId','apiToken']},
  zr_express:{label:'ZR Express',fields:['token','key','apiKey','tenantId']},
  maystro:{label:'Maystro Delivery',fields:['apiKey']},
  noest:{label:'NOEST Express',fields:['apiToken','guid']},
  dhd:{label:'DHD Livraison',fields:['token']},
};
function env(n:string){return process.env[n]||'';}
async function authUser(req:VercelRequest){const url=env('SUPABASE_URL'),anon=env('SUPABASE_ANON_KEY'),auth=String(req.headers.authorization||'');if(!url||!anon||!auth.startsWith('Bearer '))throw new Error('unauthorized');const c=createClient(url,anon,{global:{headers:{Authorization:auth}}});const {data}=await c.auth.getUser();if(!data.user)throw new Error('unauthorized');return data.user;}
function db(){const url=env('SUPABASE_URL'),key=env('SUPABASE_SERVICE_ROLE_KEY');if(!url||!key)throw new Error('service_role_not_configured');return createClient(url,key);}
async function owned(db:any,storeId:string,uid:string){const {data}=await db.from('stores').select('id').eq('id',storeId).eq('owner_id',uid).maybeSingle();if(!data)throw new Error('store_not_found');}
function clean(provider:Provider,raw:any){const out:any={};for(const f of META[provider].fields){const v=String(raw?.[f]||'').trim();if(v)out[f]=v;}return out;}
function cors(req:VercelRequest,res:VercelResponse){const origin=String(req.headers.origin||'');const allowed=(process.env.APP_ORIGIN||'').replace(/\/$/,'');if(allowed&&origin===allowed)res.setHeader('Access-Control-Allow-Origin',origin);res.setHeader('Vary','Origin');res.setHeader('Access-Control-Allow-Headers','authorization, content-type');res.setHeader('Access-Control-Allow-Methods','GET,POST,DELETE,OPTIONS');}
export default async function handler(req:VercelRequest,res:VercelResponse){cors(req,res);if(req.method==='OPTIONS')return res.status(204).end();try{const user=await authUser(req),database=db();if(req.method==='GET'){const storeId=String(req.query.store_id||'');if(!storeId)return res.status(400).json({ok:false,error:'store_id_required'});await owned(database,storeId,user.id);const {data,error}=await database.from('shipping_connections').select('provider,status,last_tested_at,last_error').eq('store_id',storeId);if(error)throw error;return res.json({ok:true,connections:(data||[]).map((r:any)=>({provider:r.provider,status:r.status,last_tested_at:r.last_tested_at,last_error:r.last_error,hasCredentials:true}))});}
const body=typeof req.body==='string'?JSON.parse(req.body):req.body||{};const storeId=String(body.store_id||''),provider=String(body.provider||'') as Provider;if(!storeId||!META[provider])return res.status(400).json({ok:false,error:'invalid_provider_or_store'});await owned(database,storeId,user.id);
if(req.method==='DELETE'){await database.from('shipping_connections').delete().eq('store_id',storeId).eq('provider',provider);return res.json({ok:true});}
if(req.method!=='POST')return res.status(405).json({ok:false,error:'method_not_allowed'});
const credentials=clean(provider,body.credentials);if(provider==='zr_express'){const legacy=Boolean(credentials.token&&credentials.key);const modern=Boolean(credentials.apiKey&&credentials.tenantId);if(!legacy&&!modern)return res.status(400).json({ok:false,error:'credential_required:zr_token_key_or_apiKey_tenantId'});}else{for(const f of META[provider].fields)if(!credentials[f])return res.status(400).json({ok:false,error:`credential_required:${f}`});}
const encrypted=encryptCredentials(credentials);try{await testProvider(provider,encrypted);const {error}=await database.from('shipping_connections').upsert({store_id:storeId,provider,credentials_encrypted:encrypted,status:'connected',last_tested_at:new Date().toISOString(),last_error:null},{onConflict:'store_id,provider'});if(error)throw error;return res.json({ok:true,connected:true,message:`تم التحقق من اتصال ${META[provider].label} وحفظ الربط بشكل مشفّر.`});}catch(e:any){const message=String(e?.message||e);await database.from('shipping_connections').update({status:'error',last_tested_at:new Date().toISOString(),last_error:message}).eq('store_id',storeId).eq('provider',provider);return res.status(502).json({ok:false,error:'carrier_connection_failed',message});}}
catch(e:any){const m=String(e?.message||e);return res.status(m==='unauthorized'?401:m==='service_role_not_configured'?503:500).json({ok:false,error:m});}}
