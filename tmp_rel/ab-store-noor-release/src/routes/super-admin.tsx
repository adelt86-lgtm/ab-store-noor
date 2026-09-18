import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Activity, ArrowUpRight, BarChart3, CheckCircle2, ChevronLeft, ExternalLink,
  LayoutDashboard, LogOut, Package, RefreshCw, ShieldCheck, Store, Users, XCircle
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { signOut } from "@/lib/storeData";

export const Route = createFileRoute("/super-admin")({ component: SuperAdmin });

type StoreRow = {
  id: string; owner_id: string; name: string; slug: string; is_published: boolean;
  created_at?: string; whatsapp?: string | null;
};
type Profile = { id: string; email?: string | null; role: string };
type ProductRow = { store_id: string; is_active: boolean };
type ChannelRow = { store_id: string; channel: string; is_active: boolean };

function SuperAdmin() {
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [email, setEmail] = useState("");
  const [stores, setStores] = useState<StoreRow[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [channels, setChannels] = useState<ChannelRow[]>([]);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "published" | "draft">("all");

  const load = async () => {
    setLoading(true); setError("");
    try {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) { setAuthorized(false); return; }
      setEmail(auth.user.email || "");
      const { data: me, error: meError } = await supabase.from("profiles").select("id,email,role").eq("id", auth.user.id).maybeSingle();
      if (meError) throw meError;
      if (me?.role !== "super_admin") { setAuthorized(false); return; }
      setAuthorized(true);

      const [s, p, pr, ch] = await Promise.all([
        supabase.from("stores").select("id,owner_id,name,slug,is_published,created_at,whatsapp").order("created_at", { ascending: false }),
        supabase.from("profiles").select("id,email,role").order("email"),
        supabase.from("products").select("store_id,is_active"),
        supabase.from("store_channels").select("store_id,channel,is_active"),
      ]);
      for (const r of [s,p,pr,ch]) if (r.error) throw r.error;
      setStores((s.data || []) as StoreRow[]); setProfiles((p.data || []) as Profile[]);
      setProducts((pr.data || []) as ProductRow[]); setChannels((ch.data || []) as ChannelRow[]);
    } catch (e: any) { setError(e?.message || String(e)); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const metrics = useMemo(() => ({
    stores: stores.length,
    published: stores.filter(s => s.is_published).length,
    merchants: new Set(stores.map(s => s.owner_id)).size,
    products: products.filter(p => p.is_active).length,
    channels: channels.filter(c => c.is_active).length,
  }), [stores, products, channels]);

  const visibleStores = useMemo(() => stores.filter(s => {
    const q = query.trim().toLowerCase();
    const matches = !q || s.name.toLowerCase().includes(q) || s.slug.toLowerCase().includes(q) || s.owner_id.toLowerCase().includes(q);
    const status = filter === "all" || (filter === "published" ? s.is_published : !s.is_published);
    return matches && status;
  }), [stores, query, filter]);

  const ownerEmail = (ownerId: string) => profiles.find(p => p.id === ownerId)?.email || ownerId.slice(0, 8) + "…";
  const productCount = (storeId: string) => products.filter(p => p.store_id === storeId && p.is_active).length;
  const channelCount = (storeId: string) => channels.filter(c => c.store_id === storeId && c.is_active).length;

  if (loading) return <main dir="rtl" className="sa-page"><div className="sa-loading">جاري تحميل مركز الإدارة…</div></main>;
  if (!authorized) return <main dir="rtl" className="sa-page"><div className="sa-denied"><ShieldCheck size={42}/><h1>Super Admin</h1><p>{error || "هذا القسم مخصص لمدير المنصة فقط."}</p><Link to="/dashboard" className="sa-btn">العودة إلى لوحة المتجر</Link></div></main>;

  return <main dir="rtl" className="sa-page">
    <header className="sa-topbar">
      <div className="sa-brand"><img src="/logo-ab.png" alt="AB Store Noor" className="sa-logo-img" /><div><b>AB-STORE-NOOR</b><small>SUPER ADMIN CONTROL</small></div></div>
      <div className="sa-top-actions"><span className="sa-admin"><span className="sa-dot"/> {email}</span><button className="sa-icon" onClick={load} title="تحديث"><RefreshCw size={17}/></button><button className="sa-icon danger" onClick={() => signOut()} title="تسجيل الخروج"><LogOut size={17}/></button></div>
    </header>
    <div className="sa-shell">
      <aside className="sa-side">
        <div className="sa-side-title">PLATFORM</div>
        <a className="active"><LayoutDashboard size={17}/> نظرة عامة</a>
        <a href="#stores"><Store size={17}/> المتاجر</a>
        <a href="#merchants"><Users size={17}/> التجار</a>
        <a href="#activity"><Activity size={17}/> النشاط</a>
        <div className="sa-side-bottom"><ShieldCheck size={16}/><span>وضع الإدارة الآمن<small>Super Admin</small></span></div>
      </aside>
      <section className="sa-main">
        <div className="sa-heading"><div><span>AB PLATFORM / CONTROL CENTER</span><h1>مركز إدارة المنصة</h1><p>إدارة المتاجر والتجار والنشر والنشاط من مكان واحد.</p></div><Link to="/" className="sa-outline"><ExternalLink size={15}/> فتح المتجر</Link></div>
        <div className="sa-metrics">
          <Metric icon={Store} label="إجمالي المتاجر" value={metrics.stores} note={`${metrics.published} منشور`} />
          <Metric icon={Users} label="التجار" value={metrics.merchants} note="حسابات مرتبطة بالمتاجر" />
          <Metric icon={Package} label="المنتجات النشطة" value={metrics.products} note="على مستوى المنصة" />
          <Metric icon={BarChart3} label="القنوات النشطة" value={metrics.channels} note="WhatsApp · Meta · Telegram" />
        </div>
        <div className="sa-grid" id="stores">
          <div className="sa-card sa-wide">
            <div className="sa-card-head"><div><h2>المتاجر</h2><small>كل المتاجر المسجلة في المنصة</small></div><span className="sa-count">{visibleStores.length}</span></div>
            <div className="sa-toolbar"><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="بحث باسم المتجر أو المعرّف…"/><div className="sa-filters">{([['all','الكل'],['published','منشور'],['draft','مسودة']] as const).map(([v,l])=><button key={v} className={filter===v?'on':''} onClick={()=>setFilter(v)}>{l}</button>)}</div></div>
            <div className="sa-table-wrap"><table className="sa-table"><thead><tr><th>المتجر</th><th>التاجر</th><th>المنتجات</th><th>القنوات</th><th>الحالة</th><th>تاريخ الإنشاء</th><th/></tr></thead><tbody>{visibleStores.map(s=><tr key={s.id}><td><div className="sa-store-name"><span>{s.name.slice(0,1)}</span><div><b>{s.name}</b><small>/{s.slug}</small></div></div></td><td>{ownerEmail(s.owner_id)}</td><td>{productCount(s.id)}</td><td>{channelCount(s.id)}</td><td><span className={s.is_published?'sa-status live':'sa-status draft'}>{s.is_published?<CheckCircle2 size={13}/>:<XCircle size={13}/>} {s.is_published?'منشور':'مسودة'}</span></td><td>{s.created_at ? new Date(s.created_at).toLocaleDateString("ar-DZ") : "—"}</td><td><Link to="/" search={{store:s.slug}} className="sa-open" title="فتح المتجر"><ArrowUpRight size={15}/></Link></td></tr>)}{!visibleStores.length&&<tr><td colSpan={7} className="sa-empty">لا توجد نتائج.</td></tr>}</tbody></table></div>
          </div>
          <div className="sa-card" id="merchants"><div className="sa-card-head"><div><h2>التجار</h2><small>حسابات المنصة</small></div></div><div className="sa-list">{profiles.filter(p=>p.role!=='super_admin').slice(0,8).map(p=><div className="sa-user" key={p.id}><span>{(p.email||'?').slice(0,1).toUpperCase()}</span><div><b>{p.email||'بدون بريد'}</b><small>{stores.filter(s=>s.owner_id===p.id).length} متجر</small></div><ChevronLeft size={14}/></div>)}</div></div>
          <div className="sa-card" id="activity"><div className="sa-card-head"><div><h2>حالة المنصة</h2><small>مؤشرات تشغيلية مباشرة</small></div></div><div className="sa-health"><Health label="المصادقة" value="Supabase Auth" ok/><Health label="قاعدة البيانات" value="Supabase" ok/><Health label="النشر" value={`${metrics.published} متجر منشور`} ok={metrics.published>0}/><Health label="القنوات" value={`${metrics.channels} اتصال نشط`} ok={metrics.channels>0}/></div></div>
        </div>
        <footer className="sa-footer">AB-STORE-NOOR · Platform Administration <span>Protected area · Super Admin only</span></footer>
      </section>
    </div>
  </main>;
}
function Metric({icon:Icon,label,value,note}:{icon:any;label:string;value:number;note:string}){return <div className="sa-metric"><span className="sa-metric-icon"><Icon size={18}/></span><div><small>{label}</small><strong>{value.toLocaleString("ar-DZ")}</strong><em>{note}</em></div></div>}
function Health({label,value,ok}:{label:string;value:string;ok:boolean}){return <div className="sa-health-row"><span>{label}</span><b>{value}</b><i className={ok?'ok':'bad'}>{ok?<CheckCircle2 size={14}/>:<XCircle size={14}/>}</i></div>}
