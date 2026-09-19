import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Activity, ArrowUpRight, BarChart3, CheckCircle2, ChevronLeft, CreditCard,
  ExternalLink, LayoutDashboard, LogOut, Package, RefreshCw, ShieldCheck,
  Store, Users, XCircle
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import {
  signOut,
  getSessionUser,
  getReceiptSignedUrl,
  loadSubscriptionRequests,
  approveSubscriptionRequest,
  rejectSubscriptionRequest,
  type SubscriptionRequestRow,
} from "@/lib/storeData";

export const Route = createFileRoute("/super-admin")({ component: SuperAdmin });

type StoreRow = {
  id: string; owner_id: string; name: string; slug: string; is_published: boolean;
  created_at?: string; whatsapp?: string | null; plan?: string | null;
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
  const [subs, setSubs] = useState<SubscriptionRequestRow[]>([]);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "published" | "draft">("all");
  const [subFilter, setSubFilter] = useState<"pending" | "all" | "approved" | "rejected">("pending");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const [receiptBusyId, setReceiptBusyId] = useState<string | null>(null);

  const handleViewReceipt = async (requestId: string, path: string) => {
    setReceiptBusyId(requestId);
    try {
      const url = await getReceiptSignedUrl(path);
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (e: any) {
      setError(e?.message || String(e));
    } finally {
      setReceiptBusyId(null);
    }
  };

  const load = async () => {
    setLoading(true); setError("");
    try {
      const user = await getSessionUser();
      if (!user) { setAuthorized(false); return; }
      setEmail(user.email || "");
      const { data: me, error: meError } = await supabase.from("profiles").select("id,email,role").eq("id", user.id).maybeSingle();
      if (meError) throw meError;
      if (me?.role !== "super_admin") { setAuthorized(false); return; }
      setAuthorized(true);

      const [s, p, pr, ch] = await Promise.all([
        supabase.from("stores").select("id,owner_id,name,slug,is_published,created_at,whatsapp,plan").order("created_at", { ascending: false }),
        supabase.from("profiles").select("id,email,role").order("email"),
        supabase.from("products").select("store_id,is_active"),
        supabase.from("store_channels").select("store_id,channel,is_active"),
      ]);
      for (const r of [s, p, pr, ch]) if (r.error) throw r.error;
      setStores((s.data || []) as StoreRow[]);
      setProfiles((p.data || []) as Profile[]);
      setProducts((pr.data || []) as ProductRow[]);
      setChannels((ch.data || []) as ChannelRow[]);

      try {
        const requests = await loadSubscriptionRequests();
        setSubs(requests);
      } catch (subErr: any) {
        console.warn("[super-admin] subscription_requests:", subErr?.message || subErr);
        setSubs([]);
      }
    } catch (e: any) {
      setError(e?.message || String(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const metrics = useMemo(() => ({
    stores: stores.length,
    published: stores.filter(s => s.is_published).length,
    merchants: new Set(stores.map(s => s.owner_id)).size,
    products: products.filter(p => p.is_active).length,
    channels: channels.filter(c => c.is_active).length,
    pendingSubs: subs.filter(r => r.status === "pending").length,
  }), [stores, products, channels, subs]);

  const visibleStores = useMemo(() => stores.filter(s => {
    const q = query.trim().toLowerCase();
    const matches = !q || s.name.toLowerCase().includes(q) || s.slug.toLowerCase().includes(q) || s.owner_id.toLowerCase().includes(q);
    const status = filter === "all" || (filter === "published" ? s.is_published : !s.is_published);
    return matches && status;
  }), [stores, query, filter]);

  const visibleSubs = useMemo(() => {
    if (subFilter === "all") return subs;
    return subs.filter(r => r.status === subFilter);
  }, [subs, subFilter]);

  const ownerEmail = (ownerId: string | null) => {
    if (!ownerId) return "—";
    return profiles.find(p => p.id === ownerId)?.email || ownerId.slice(0, 8) + "…";
  };
  const storeLabel = (storeId: string | null) => {
    if (!storeId) return "—";
    const s = stores.find(x => x.id === storeId);
    return s ? `${s.name} (/${s.slug})` : storeId.slice(0, 8) + "…";
  };
  const productCount = (storeId: string) => products.filter(p => p.store_id === storeId && p.is_active).length;
  const channelCount = (storeId: string) => channels.filter(c => c.store_id === storeId && c.is_active).length;

  const handleApprove = async (row: SubscriptionRequestRow) => {
    if (!row.store_id) {
      setNotice("الطلب بلا store_id — تعذر التفعيل");
      return;
    }
    setBusyId(row.id);
    setNotice("");
    try {
      await approveSubscriptionRequest(row.id, row.store_id, row.billing_cycle);
      setNotice(`تم تفعيل Pro للمتجر ${storeLabel(row.store_id)}`);
      await load();
    } catch (e: any) {
      setNotice("فشل الموافقة: " + (e?.message || e));
    } finally {
      setBusyId(null);
    }
  };

  const handleReject = async (row: SubscriptionRequestRow) => {
    const note = window.prompt("سبب الرفض (اختياري):") || "";
    setBusyId(row.id);
    setNotice("");
    try {
      await rejectSubscriptionRequest(row.id, note || undefined);
      setNotice("تم رفض الطلب");
      await load();
    } catch (e: any) {
      setNotice("فشل الرفض: " + (e?.message || e));
    } finally {
      setBusyId(null);
    }
  };

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
        <a className="active" href="#top"><LayoutDashboard size={17}/> نظرة عامة</a>
        <a href="#subscriptions"><CreditCard size={17}/> طلبات الاشتراك{metrics.pendingSubs > 0 ? ` (${metrics.pendingSubs})` : ""}</a>
        <a href="#stores"><Store size={17}/> المتاجر</a>
        <a href="#merchants"><Users size={17}/> التجار</a>
        <a href="#activity"><Activity size={17}/> النشاط</a>
        <div className="sa-side-bottom"><ShieldCheck size={16}/><span>وضع الإدارة الآمن<small>Super Admin</small></span></div>
      </aside>
      <section className="sa-main">
        <div className="sa-heading"><div><span>AB PLATFORM / CONTROL CENTER</span><h1>مركز إدارة المنصة</h1><p>إدارة المتاجر والتجار وطلبات اشتراك Pro من مكان واحد.</p></div><Link to="/" className="sa-outline"><ExternalLink size={15}/> فتح المنصة</Link></div>

        {notice && <div className="sa-toast">{notice}</div>}

        <div className="sa-metrics">
          <Metric icon={Store} label="إجمالي المتاجر" value={metrics.stores} note={`${metrics.published} منشور`} />
          <Metric icon={Users} label="التجار" value={metrics.merchants} note="حسابات مرتبطة بالمتاجر" />
          <Metric icon={Package} label="المنتجات النشطة" value={metrics.products} note="على مستوى المنصة" />
          <Metric icon={CreditCard} label="طلبات Pro معلّقة" value={metrics.pendingSubs} note="بانتظار المراجعة" />
        </div>

        {/* ===== طلبات الاشتراك ===== */}
        <div className="sa-card sa-wide" id="subscriptions" style={{ marginBottom: 18 }}>
          <div className="sa-card-head">
            <div>
              <h2>طلبات الاشتراك Pro</h2>
              <small>BaridiMob / سحب بدون بطاقة — موافقة يدوية</small>
            </div>
            <span className="sa-count">{visibleSubs.length}</span>
          </div>
          <div className="sa-filters" style={{ marginBottom: 12 }}>
            {(["pending", "approved", "rejected", "all"] as const).map((v) => (
              <button key={v} className={subFilter === v ? "on" : ""} onClick={() => setSubFilter(v)}>
                {v === "pending" ? "معلّق" : v === "approved" ? "مقبول" : v === "rejected" ? "مرفوض" : "الكل"}
              </button>
            ))}
          </div>
          <div className="sa-table-wrap">
            <table className="sa-table">
              <thead>
                <tr>
                  <th>التاريخ</th>
                  <th>المتجر</th>
                  <th>التاجر</th>
                  <th>الدورة</th>
                  <th>المبلغ</th>
                  <th>الدفع</th>
                  <th>إثبات</th>
                  <th>الحالة</th>
                  <th>إجراء</th>
                </tr>
              </thead>
              <tbody>
                {visibleSubs.map((r) => (
                  <tr key={r.id}>
                    <td>{r.created_at ? new Date(r.created_at).toLocaleString("ar-DZ") : "—"}</td>
                    <td>{storeLabel(r.store_id)}</td>
                    <td>{ownerEmail(r.owner_id)}</td>
                    <td>{r.billing_cycle === "yearly" ? "سنوي" : r.billing_cycle === "monthly" ? "شهري" : (r.billing_cycle || "—")}</td>
                    <td>{r.amount != null ? `${Number(r.amount).toLocaleString("ar-DZ")} دج` : "—"}</td>
                    <td>{r.payment_method === "gab_retrait" ? "سحب بدون بطاقة" : r.payment_method === "baridimob" ? "BaridiMob" : (r.payment_method || "—")}</td>
                    <td>
                      {r.receipt_url ? (
                        <button
                          type="button"
                          className="sa-open"
                          disabled={receiptBusyId === r.id}
                          onClick={() => handleViewReceipt(r.id, r.receipt_url!)}
                        >
                          {receiptBusyId === r.id ? "…" : "وصل"}
                        </button>
                      ) : r.cardless_code ? (
                        <span title={r.phone_number || ""}>{r.cardless_code}</span>
                      ) : "—"}
                    </td>
                    <td>
                      <span className={
                        r.status === "pending" ? "sa-status draft" :
                        r.status === "approved" ? "sa-status live" : "sa-status draft"
                      }>
                        {r.status === "pending" ? "معلّق" : r.status === "approved" ? "مقبول" : r.status === "rejected" ? "مرفوض" : r.status}
                      </span>
                    </td>
                    <td>
                      {r.status === "pending" ? (
                        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                          <button
                            className="sa-btn"
                            style={{ padding: "6px 10px", fontSize: 12 }}
                            disabled={busyId === r.id}
                            onClick={() => handleApprove(r)}
                          >
                            {busyId === r.id ? "…" : "موافقة"}
                          </button>
                          <button
                            className="sa-outline"
                            style={{ padding: "6px 10px", fontSize: 12 }}
                            disabled={busyId === r.id}
                            onClick={() => handleReject(r)}
                          >
                            رفض
                          </button>
                        </div>
                      ) : (
                        <small style={{ opacity: 0.6 }}>{r.reviewed_at ? new Date(r.reviewed_at).toLocaleDateString("ar-DZ") : "—"}</small>
                      )}
                    </td>
                  </tr>
                ))}
                {!visibleSubs.length && (
                  <tr><td colSpan={9} className="sa-empty">لا توجد طلبات في هذا التصفية.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="sa-grid" id="stores">
          <div className="sa-card sa-wide">
            <div className="sa-card-head"><div><h2>المتاجر</h2><small>كل المتاجر المسجلة في المنصة</small></div><span className="sa-count">{visibleStores.length}</span></div>
            <div className="sa-toolbar"><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="بحث باسم المتجر أو المعرّف…"/><div className="sa-filters">{([['all','الكل'],['published','منشور'],['draft','مسودة']] as const).map(([v,l])=><button key={v} className={filter===v?'on':''} onClick={()=>setFilter(v)}>{l}</button>)}</div></div>
            <div className="sa-table-wrap"><table className="sa-table"><thead><tr><th>المتجر</th><th>المالك</th><th>منتجات</th><th>قنوات</th><th>الحالة</th><th>تاريخ الإنشاء</th><th/></tr></thead><tbody>{visibleStores.map(s=><tr key={s.id}><td><div className="sa-store-name"><span>{s.name.slice(0,1)}</span><div><b>{s.name}</b><small>/{s.slug}</small></div></div></td><td>{ownerEmail(s.owner_id)}</td><td>{productCount(s.id)}</td><td>{channelCount(s.id)}</td><td><span className={s.is_published?'sa-status live':'sa-status draft'}>{s.is_published?<CheckCircle2 size={13}/>:<XCircle size={13}/>} {s.is_published?'منشور':'مسودة'}</span></td><td>{s.created_at ? new Date(s.created_at).toLocaleDateString("ar-DZ") : "—"}</td><td><Link to="/" search={{store:s.slug}} className="sa-open" title="فتح المتجر"><ArrowUpRight size={15}/></Link></td></tr>)}{!visibleStores.length&&<tr><td colSpan={7} className="sa-empty">لا توجد نتائج.</td></tr>}</tbody></table></div>
          </div>
          <div className="sa-card" id="merchants"><div className="sa-card-head"><div><h2>التجار</h2><small>حسابات المنصة</small></div></div><div className="sa-list">{profiles.filter(p=>p.role!=='super_admin').slice(0,8).map(p=><div className="sa-user" key={p.id}><span>{(p.email||'?').slice(0,1).toUpperCase()}</span><div><b>{p.email||'بدون بريد'}</b><small>{stores.filter(s=>s.owner_id===p.id).length} متجر</small></div><ChevronLeft size={14}/></div>)}</div></div>
          <div className="sa-card" id="activity"><div className="sa-card-head"><div><h2>حالة المنصة</h2><small>مؤشرات تشغيلية مباشرة</small></div></div><div className="sa-health"><Health label="المصادقة" value="Supabase Auth" ok/><Health label="قاعدة البيانات" value="Supabase" ok/><Health label="النشر" value={`${metrics.published} متجر منشور`} ok={metrics.published>0}/><Health label="طلبات Pro" value={`${metrics.pendingSubs} معلّق`} ok/></div></div>
        </div>
        <footer className="sa-footer">AB-STORE-NOOR · Platform Administration <span>Protected area · Super Admin only</span></footer>
      </section>
    </div>
    <style>{`
      .sa-toast{margin:0 0 14px;padding:10px 14px;border-radius:12px;background:rgba(14,165,233,.15);border:1px solid rgba(14,165,233,.35);font-size:13px}
    `}</style>
  </main>;
}
function Metric({icon:Icon,label,value,note}:{icon:any;label:string;value:number;note:string}){return <div className="sa-metric"><span className="sa-metric-icon"><Icon size={18}/></span><div><small>{label}</small><strong>{value.toLocaleString("ar-DZ")}</strong><em>{note}</em></div></div>}
function Health({label,value,ok}:{label:string;value:string;ok:boolean}){return <div className="sa-health-row"><span>{label}</span><b>{value}</b><i className={ok?'ok':'bad'}>{ok?<CheckCircle2 size={14}/>:<XCircle size={14}/>}</i></div>}
