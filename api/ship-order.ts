import type { VercelRequest,VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { createShipment } from './shipping-engine.js';

type Provider='yalidine'|'zr_express'|'maystro'|'noest'|'dhd';
function env(n:string){return process.env[n]||'';}
async function authUser(req:VercelRequest){const url=env('SUPABASE_URL'),anon=env('SUPABASE_ANON_KEY'),auth=String(req.headers.authorization||'');if(!url||!anon||!auth.startsWith('Bearer '))throw new Error('unauthorized');const c=createClient(url,anon,{global:{headers:{Authorization:auth}}});const {data}=await c.auth.getUser();if(!data.user)throw new Error('unauthorized');return data.user;}
function db(_req:VercelRequest){const url=env('SUPABASE_URL'),service=env('SUPABASE_SERVICE_ROLE_KEY');if(!url||!service)throw new Error('service_role_not_configured');return createClient(url,service);}
function userDb(req:VercelRequest){
  const url=env('SUPABASE_URL'),anon=env('SUPABASE_ANON_KEY'),auth=String(req.headers.authorization||'').trim();
  if(!url||!anon||!auth.startsWith('Bearer '))throw new Error('unauthorized');
  return createClient(url,anon,{global:{headers:{Authorization:auth}}});
}
function cors(req:VercelRequest,res:VercelResponse){const origin=String(req.headers.origin||'');const allowed=(process.env['APP_ORIGIN']||'').replace(/\/$/,'');if(allowed&&origin===allowed)res.setHeader('Access-Control-Allow-Origin',origin);res.setHeader('Vary','Origin');res.setHeader('Access-Control-Allow-Headers','authorization, content-type, idempotency-key');res.setHeader('Access-Control-Allow-Methods','POST,OPTIONS');}
export default async function handler(req:VercelRequest,res:VercelResponse){cors(req,res);if(req.method==='OPTIONS')return res.status(204).end();if(req.method!=='POST')return res.status(405).json({ok:false,error:'method_not_allowed'});try{const user=await authUser(req),database=db(req),body=typeof req.body==='string'?JSON.parse(req.body):req.body||{},orderId=String(body.order_id||''),carrier=String(body.carrier||'yalidine') as Provider,idempotency=String(req.headers['idempotency-key']||body.idempotency_key||orderId);if(!orderId)return res.status(400).json({ok:false,error:'order_id_required'});if(!['yalidine','zr_express','maystro','noest','dhd'].includes(carrier))return res.status(400).json({ok:false,error:'unsupported_carrier'});
const {data:o,error:oe}=await database.from('orders').select('*,order_items(*)').eq('id',orderId).maybeSingle();if(oe)throw oe;if(!o)return res.status(404).json({ok:false,error:'order_not_found'});const {data:store}=await database.from('stores').select('id,owner_id,shipping_enabled').eq('id',o.store_id).eq('owner_id',user.id).maybeSingle();if(!store)return res.status(403).json({ok:false,error:'forbidden'});if(store.shipping_enabled===false && !(carrier==='yalidine' && process.env['YALIDINE_SANDBOX']==='true'))return res.status(400).json({ok:false,error:'shipping_disabled',message:'الشحن غير مفعّل لهذا المتجر'});if(o.tracking_number)return res.json({ok:true,already_shipped:true,tracking_number:o.tracking_number,carrier:o.shipping_company,shipping_status:o.shipping_status});
const {data:existing}=await database.from('shipping_shipments').select('*').eq('order_id',orderId).maybeSingle();if(existing?.tracking_number){const {error:syncOrderError}=await userDb(req).rpc('mark_order_shipped',{p_order_id:orderId,p_tracking_number:existing.tracking_number,p_shipping_company:existing.provider,p_shipping_status:existing.status||'created'});if(syncOrderError)throw syncOrderError;return res.json({ok:true,already_shipped:true,tracking_number:existing.tracking_number,carrier:existing.provider,shipping_status:existing.status});}if(existing?.status==='creating')return res.status(409).json({ok:false,error:'shipment_in_progress',message:'هناك محاولة شحن قيد التنفيذ. انتظر قليلاً قبل إعادة المحاولة.'});if(existing?.status==='unknown')return res.status(409).json({ok:false,error:'shipment_unknown',message:'حالة الشحنة غير مؤكدة. تحقق من شركة التوصيل قبل إعادة المحاولة لتجنب إنشاء شحنة مكررة.'});
const {data:conn}=await database.from('shipping_connections').select('credentials_encrypted,status').eq('store_id',store.id).eq('provider',carrier).maybeSingle();if(!conn?.credentials_encrypted)return res.status(400).json({ok:false,error:`${carrier}_credentials_required`,message:'اربط شركة التوصيل من إعدادات المتجر أولاً'});if(conn.status!=='connected')return res.status(400).json({ok:false,error:'carrier_not_connected',message:'اتصال شركة التوصيل غير صالح. أعد اختبار الربط.'});
const {data:shipment,error:se}=await database.from('shipping_shipments').insert({order_id:orderId,store_id:store.id,provider:carrier,status:'creating',idempotency_key:idempotency}).select('id').single();if(se){if(se.code==='23505')return res.status(409).json({ok:false,error:'shipment_already_requested'});throw se;}
let carrierConfirmed=false;
try{
const result=await createShipment(carrier,conn.credentials_encrypted,o);
carrierConfirmed=Boolean(result?.tracking);
const {error:ue}=await database.from('shipping_shipments').update({tracking_number:result.tracking,status:'created',provider_response:{tracking_number:result.tracking,provider_status:result.status || 'created'},tracking_status:result.status || 'created',last_tracking_at:new Date().toISOString(),tracking_url:carrier==='yalidine'?'https://track.yalidine.com/suivre-un-colis/':null,updated_at:new Date().toISOString()}).eq('id',shipment.id);
if(ue)throw ue;
const {error:oe2}=await userDb(req).rpc('mark_order_shipped',{p_order_id:orderId,p_tracking_number:result.tracking,p_shipping_company:carrier,p_shipping_status:'created'});
if(oe2)throw oe2;
await database.from('shipping_tracking_events').insert({shipment_id:shipment.id,tracking_number:result.tracking,status:result.status || 'created',source:'create'});
return res.json({ok:true,tracking_number:result.tracking,carrier,shipping_status:'created'});
}
catch(e:any){
const message=String(e?.message||e);
const status=carrierConfirmed?'unknown':'error';
await database.from('shipping_shipments').update({status,last_error:message,updated_at:new Date().toISOString()}).eq('id',shipment.id);
return res.status(502).json({
ok:false,
error:status==='unknown'?'shipment_outcome_unknown':'shipment_create_failed',
message:status==='unknown'
? `تم إنشاء الشحنة لدى شركة التوصيل لكن تعذر حفظها داخلياً: ${message}`
:message
});
}}
catch(e:any){const m=String(e?.message||e);return res.status(m==='unauthorized'?401:m==='service_role_not_configured'?503:500).json({ok:false,error:m});}}
