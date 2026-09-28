import { decryptCredentials } from './shipping-crypto';

type Provider = 'yalidine' | 'zr_express' | 'maystro' | 'noest' | 'dhd';

type ShippingOrder = {
  id: string;
  customer_name: string;
  phone: string;
  wilaya_code?: number | null;
  wilaya_name?: string | null;
  commune?: string | null;
  address?: string | null;
  delivery_type?: string | null;
  stop_desk_id?: string | null;
  total_price?: number | null;
  note?: string | null;
  product_name?: string | null;
  order_items?: { product_name: string; quantity: number }[];
};

const WILAYAS: Record<string, number> = {
  'أدرار':1,'الشلف':2,'الأغواط':3,'أم البواقي':4,'باتنة':5,'بجاية':6,'بسكرة':7,'بشار':8,'البليدة':9,'البويرة':10,
  'تمنراست':11,'تبسة':12,'تلمسان':13,'تيارت':14,'تيزي وزو':15,'الجزائر':16,'الجلفة':17,'جيجل':18,'سطيف':19,'سعيدة':20,
  'سكيكدة':21,'سيدي بلعباس':22,'عنابة':23,'قالمة':24,'قسنطينة':25,'المدية':26,'المسيلة':28,'وهران':31,'برج بوعريريج':34,
  'بومرداس':35,'الطارف':36,'تندوف':37,'تيسمسيلت':38,'الوادي':39,'خنشلة':40,'سوق أهراس':41,'تيبازة':42,'ميلة':43,
  'عين الدفلى':44,'النعامة':45,'عين تموشنت':46,'غرداية':47,'غليزان':48,'تيميمون':49,'برج باجي مختار':50,'أولاد جلال':51,
  'بني عباس':52,'عين صالح':53,'عين قزام':54,'تقرت':55,'جانت':56,'المغير':57,'المنيعة':58,
};

function wilayaCode(o: ShippingOrder) {
  const n = Number(o.wilaya_code);
  if (n >= 1 && n <= 58) return n;
  return WILAYAS[String(o.wilaya_name || '')] || 16;
}
function nameParts(name: string) {
  const p = String(name || 'Client').trim().split(/\s+/);
  return [p[0] || 'Client', p.slice(1).join(' ') || '.'];
}
function productList(o: ShippingOrder) {
  return (o.order_items || []).map(i => `${i.product_name} x${i.quantity || 1}`).join(' | ') || o.product_name || 'Order';
}
function isStopDesk(o: ShippingOrder) { return o.delivery_type === 'desk' || o.delivery_type === 'stopdesk'; }
function httpError(provider: Provider, status: number, body: any) {
  const message = body?.message || body?.error || body?.detail || body?.Statut || `${provider}_http_${status}`;
  return new Error(String(message));
}
async function jsonFetch(url: string, init: RequestInit) {
  const response = await fetch(url, { ...init, signal: AbortSignal.timeout(25000) });
  const body = await response.json().catch(() => ({}));
  return { response, body };
}

async function testYalidine(c: any) {
  const { response, body } = await jsonFetch(`${process.env.YALIDINE_API_BASE || 'https://api.yalidine.app/v1'}/parcels?limit=1`, {
    headers: { 'X-API-ID': c.apiId, 'X-API-TOKEN': c.apiToken, Accept: 'application/json' },
  });
  if (!response.ok) throw httpError('yalidine', response.status, body);
}
async function testZR(c: any) {
  if (c.apiKey && c.tenantId) {
    const r = await fetch(`${process.env.ZR_NEW_API_BASE || 'https://api.zrexpress.app'}/api/v1/me`, { headers: { 'X-Api-Key': c.apiKey, 'X-Tenant': c.tenantId, Accept: 'application/json' }, signal: AbortSignal.timeout(25000) });
    if (!r.ok) throw httpError('zr_express', r.status, await r.json().catch(() => ({})));
    return;
  }
  const { response, body } = await jsonFetch('https://procolis.com/api_v1/token', { headers: { token: c.token, key: c.key, Accept: 'application/json' } });
  if (!response.ok) throw httpError('zr_express', response.status, body);
}
async function testMaystro(c: any) {
  const { response, body } = await jsonFetch(`${process.env.MAYSTRO_API_BASE || 'https://backend.maystro-delivery.com/api'}/stores/orders/`, { headers: { Authorization: `Token ${c.apiKey}`, Accept: 'application/json' } });
  if (response.status === 401 || response.status === 403) throw httpError('maystro', response.status, body);
  if (response.status >= 500) throw httpError('maystro', response.status, body);
}
async function testNoest(c: any) {
  const { response, body } = await jsonFetch(`${process.env.NOEST_API_BASE || 'https://app.noest-dz.com'}/api/public/fees`, { headers: { Authorization: `Bearer ${c.apiToken}`, Accept: 'application/json' } });
  if (!response.ok) throw httpError('noest', response.status, body);
  if (!c.guid) throw new Error('NOEST User GUID مطلوب');
}
async function testDhd(c: any) {
  const base = (process.env.DHD_API_BASE || 'https://platform.dhd-dz.com').replace(/\/$/, '');
  const { response, body } = await jsonFetch(`${base}/api/v1/validate/token`, { headers: { Authorization: `Bearer ${c.token}`, Accept: 'application/json' } });
  if (!response.ok || body?.success === false) throw httpError('dhd', response.status, body);
}

export async function testProvider(provider: Provider, encrypted: string) {
  const c = decryptCredentials(encrypted);
  if (provider === 'yalidine') await testYalidine(c);
  else if (provider === 'zr_express') await testZR(c);
  else if (provider === 'maystro') await testMaystro(c);
  else if (provider === 'noest') await testNoest(c);
  else await testDhd(c);
}

async function createYalidine(c:any,o:ShippingOrder) {
  const [first,last]=nameParts(o.customer_name);
  const base=(process.env.YALIDINE_API_BASE||'https://api.yalidine.app/v1').replace(/\/$/,'');
  const payload=[{order_id:String(o.id),from_wilaya_name:process.env.YALIDINE_FROM_WILAYA||'Alger',firstname:first,familyname:last,contact_phone:o.phone,address:o.address||o.commune||'N/A',to_wilaya_name:o.wilaya_name||'Alger',to_commune_name:o.commune||undefined,product_list:productList(o),price:Number(o.total_price)||0,do_insurance:false,declared_value:Number(o.total_price)||0,is_stopdesk:isStopDesk(o),stopdesk_id:o.stop_desk_id||undefined}];
  const {response,body}=await jsonFetch(`${base}/parcels`,{method:'POST',headers:{'X-API-ID':c.apiId,'X-API-TOKEN':c.apiToken,'Content-Type':'application/json',Accept:'application/json'},body:JSON.stringify(payload)});
  if(!response.ok) throw httpError('yalidine',response.status,body);
  const row=Array.isArray(body)?body[0]:body?.data?.[0]||body;
  const tracking=row?.tracking||row?.tracking_number||row?.Tracking||'';
  if(!tracking) throw new Error('Yalidine لم يُرجع رقم تتبع');
  return {tracking:String(tracking),status:'created'};
}
async function createZR(c:any,o:ShippingOrder) {
  const [first,last]=nameParts(o.customer_name); const code=wilayaCode(o);
  if(c.apiKey&&c.tenantId) throw new Error('ZR المنصة الجديدة تحتاج Territory UUIDs؛ اربط الحساب القديم Procolis أو سنضيف مزامنة المناطق في الإصدار التالي.');
  const payload={Colis:[{Tracking:String(o.id).slice(0,40),TypeLivraison:isStopDesk(o)?1:0,TypeColis:0,Confrimee:1,Client:`${first} ${last}`.trim(),MobileA:o.phone,MobileB:'',Adresse:o.address||o.commune||'N/A',IDWilaya:String(code),Commune:o.commune||'',Total:String(Number(o.total_price)||0),Note:o.note||'',TProduit:productList(o),id_Externe:String(o.id),Source:'Dzair Store'}]};
  const {response,body}=await jsonFetch('https://procolis.com/api_v1/add_colis',{method:'POST',headers:{token:c.token,key:c.key,'Content-Type':'application/json',Accept:'application/json'},body:JSON.stringify(payload)});
  if(!response.ok) throw httpError('zr_express',response.status,body);
  const row=Array.isArray(body)?body[0]:(body as any)?.data?.[0]||body; const tracking=row?.Tracking||row?.tracking||row?.tracking_number||'';
  if(!tracking) throw new Error('ZR لم يُرجع رقم تتبع');
  const ready=await jsonFetch('https://procolis.com/api_v1/pret',{method:'POST',headers:{token:c.token,key:c.key,'Content-Type':'application/json'},body:JSON.stringify({Colis:[{Tracking:String(tracking)}]})});
  if(!ready.response.ok) throw httpError('zr_express',ready.response.status,ready.body);
  return {tracking:String(tracking),status:'ready_for_dispatch'};
}
async function createNoest(c:any,o:ShippingOrder) {
  const [first,last]=nameParts(o.customer_name); const payload={api_token:c.apiToken,user_guid:c.guid,reference:String(o.id),type_id:1,stop_desk:isStopDesk(o)?1:0,station_code:o.stop_desk_id||'',nom_client:`${first} ${last}`.trim(),telephone:o.phone,adresse:o.address||o.commune||'',code_wilaya:wilayaCode(o),commune:o.commune||'',produit:productList(o),prix:Number(o.total_price)||0,poids:1};
  const base=(process.env.NOEST_API_BASE||'https://app.noest-dz.com').replace(/\/$/,''); const {response,body}=await jsonFetch(`${base}/api/public/create/order`,{method:'POST',headers:{Authorization:`Bearer ${c.apiToken}`,'Content-Type':'application/json',Accept:'application/json'},body:JSON.stringify(payload)});
  if(!response.ok) throw httpError('noest',response.status,body); const tracking=body?.tracking||body?.tracking_number||body?.code_suivi||body?.data?.tracking||'';
  if(!tracking) throw new Error('NOEST لم يُرجع رقم تتبع');
  const validate=await jsonFetch(`${base}/api/public/valid/order`,{method:'POST',headers:{Authorization:`Bearer ${c.apiToken}`,'Content-Type':'application/json',Accept:'application/json'},body:JSON.stringify({api_token:c.apiToken,user_guid:c.guid,tracking:String(tracking)})});
  if(!validate.response.ok) throw httpError('noest',validate.response.status,validate.body);
  return {tracking:String(tracking),status:'ready_for_dispatch'};
}
async function createDhd(c:any,o:ShippingOrder) {
  const base=(process.env.DHD_API_BASE||'https://platform.dhd-dz.com').replace(/\/$/,'');
  const body={nom_client:o.customer_name,telephone:o.phone,adresse:o.address||o.commune||'',commune:o.commune||'',code_wilaya:wilayaCode(o),montant:Number(o.total_price)||0,type:isStopDesk(o)?3:1,produit:productList(o),reference:String(o.id)};
  const {response,body:out}=await jsonFetch(`${base}/api/v1/create/order`,{method:'POST',headers:{Authorization:`Bearer ${c.token}`,'Content-Type':'application/json',Accept:'application/json'},body:JSON.stringify(body)});
  if(!response.ok||out?.success===false) throw httpError('dhd',response.status,out);
  const tracking=out?.tracking||out?.tracking_number||out?.data?.tracking||out?.data?.tracking_number||'';
  if(!tracking) throw new Error('DHD لم يُرجع رقم تتبع');
  const validate=await jsonFetch(`${base}/api/v1/valid/order`,{method:'POST',headers:{Authorization:`Bearer ${c.token}`,'Content-Type':'application/json',Accept:'application/json'},body:JSON.stringify({tracking:String(tracking)})});
  if(!validate.response.ok) throw httpError('dhd',validate.response.status,validate.body);
  return {tracking:String(tracking),status:'ready_for_dispatch'};
}

export async function createShipment(provider: Provider, encrypted: string, o: ShippingOrder) {
  const c = decryptCredentials(encrypted);
  if (provider === 'yalidine') return createYalidine(c,o);
  if (provider === 'zr_express') return createZR(c,o);
  if (provider === 'maystro') throw new Error('Maystro يحتاج ربط Product Catalogue وMaystro Commune ID قبل إنشاء الشحنة.');
  if (provider === 'noest') return createNoest(c,o);
  return createDhd(c,o);
}
