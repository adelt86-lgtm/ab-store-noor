import { supabase } from './supabase';
export type ShipCarrier='yalidine'|'zr_express'|'maystro'|'noest'|'dhd';
export async function shipOrderViaEngine(orderId:string,carrier:ShipCarrier='yalidine'): Promise<{ok:boolean;tracking_number?:string;message?:string;error?:string;shipping_status?:string}>{
  try{const {data,error}=await supabase.auth.getSession();if(error)console.error('AUTH_SESSION_ERROR',error);const token=data.session?.access_token;if(!token)return{ok:false,error:'no_auth',message:'سجّل الدخول أولاً'};
  const res=await fetch('/api/ship-order',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`,'Idempotency-Key':`${orderId}:${carrier}`},body:JSON.stringify({order_id:orderId,carrier,idempotency_key:`${orderId}:${carrier}`})});
  const out=await res.json().catch(()=>({}));if(!res.ok||!out?.ok)return{ok:false,error:out?.error||`http_${res.status}`,message:out?.message||out?.error||'تعذّر إنشاء الشحنة'};return{ok:true,tracking_number:out.tracking_number,shipping_status:out.shipping_status};}
  catch(e:any){return{ok:false,error:e?.message||String(e),message:'تعذّر إتمام الشحن حالياً. حاول مرة أخرى أو صدّر CSV.'};}
}
