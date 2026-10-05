import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Activity, ArrowUpRight, BarChart3, CheckCircle2, ChevronLeft, CreditCard,
  ExternalLink, LayoutDashboard, LogOut, Package, RefreshCw, ShieldCheck,
  Store, Users, XCircle, Eye, Settings2, Save
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

export const Route = createFileRoute("/super-admin")({
  head: () => ({ meta: [
    { name: "robots", content: "noindex, nofollow" },
    { title: "مركز إدارة المنصة | دزاير ستور" },
    { name: "description", content: "لوحة إدارة المتاجر والاشتراكات لمنصة دزاير ستور." },
    { property: "og:title", content: "مركز إدارة المنصة | دزاير ستور" },
    { property: "og:description", content: "إدارة المتاجر والاشتراكات في دزاير ستور." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: SuperAdmin,
});

type StoreRow = {
  id: string; owner_id: string; name: string; slug: string; is_published: boolean;
  created_at?: string; whatsapp?: string | null; plan?: string | null; visit_count?: number | null;
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
  const [selectedStore, setSelectedStore] = useState<StoreRow | null>(null);
  const [confirmAction, setConfirmAction] = useState<{
    type: "approve" | "reject";
    row: SubscriptionRequestRow;
  } | null>(null);
  const [rejectNote, setRejectNote] = useState("");
  const [statsSettings, setStatsSettings] = useState({ demoMode: true, visits: 12840, stores: 286, newStores: 34, products: 1240 });
  const [statsSaving, setStatsSaving] = useState(false);

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
        supabase.from("stores").select("id,owner_id,name,slug,is_published,created_at,whatsapp,plan,visit_count").order("created_at", { ascending: false }),
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
        const { data: ps, error: psError } = await supabase.rpc("get_platform_stats_settings");
        if (!psError && ps) {
          setStatsSettings({
            demoMode: Boolean(ps.demo_mode),
            visits: Number(ps.demo_visits) || 0,
            stores: Number(ps.demo_stores) || 0,
            newStores: Number(ps.demo_new_stores) || 0,
            products: Number(ps.demo_products) || 0,
          });
        }
      } catch { /* optional until migration is installed */ }

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
    planFree: stores.filter(s => !s.plan || s.plan === "free").length,
    planPro: stores.filter(s => s.plan === "pro").length,
    planProShip: stores.filter(s => s.plan === "pro_shipping").length,
    visitsTotal: stores.reduce((a, s: any) => a + (Number(s.visit_count) || 0), 0),
  }), [stores, products, channels, subs]);

  const visibleStores = useMemo(() => stores.filter(s => {
    const q = query.trim().toLowerCase();
    const owner = (profiles.find(p => p.id === s.owner_id)?.email || s.owner_id).toLowerCase();
    const matches =
      !q ||
      s.name.toLowerCase().includes(q) ||
      s.slug.toLowerCase().includes(q) ||
      s.owner_id.toLowerCase().includes(q) ||
      owner.includes(q);
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

  const requestApprove = (row: SubscriptionRequestRow) => {
    setConfirmAction({ type: "approve", row });
    setRejectNote("");
  };

  const requestReject = (row: SubscriptionRequestRow) => {
    setConfirmAction({ type: "reject", row });
    setRejectNote("");
  };

  const executeConfirmAction = async () => {
    if (!confirmAction) return;
    if (confirmAction.type === "approve") {
      await handleApprove(confirmAction.row);
    } else {
      await handleReject(confirmAction.row, rejectNote);
    }
    setConfirmAction(null);
    setRejectNote("");
  };

  const handleApprove = async (row: SubscriptionRequestRow) => {
    if (!row.store_id) {
      setNotice("الطلب بلا store_id — تعذر التفعيل");
      return;
    }
    setBusyId(row.id);
    setNotice("");
    try {
      await approveSubscriptionRequest(row.id, row.store_id, row.billing_cycle, row.plan_requested);
      setNotice(`تم تفعيل ${row.plan_requested === "pro_shipping" ? "Pro شحن" : "Pro"} للمتجر ${storeLabel(row.store_id)}`);
      await load();
    } catch (e: any) {
      setNotice("فشل الموافقة: " + (e?.message || e));
    } finally {
      setBusyId(null);
    }
  };

  const handleReject = async (row: SubscriptionRequestRow, note = "") => {
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

  const saveStatsSettings = async () => {
    setStatsSaving(true);
    setNotice("");
    try {
      const { error } = await supabase.rpc("update_platform_stats_settings", {
        p_demo_mode: statsSettings.demoMode,
        p_demo_visits: Math.max(0, Math.round(statsSettings.visits)),
        p_demo_stores: Math.max(0, Math.round(statsSettings.stores)),
        p_demo_new_stores: Math.max(0, Math.round(statsSettings.newStores)),
        p_demo_products: Math.max(0, Math.round(statsSettings.products)),
      });
      if (error) throw error;
      setNotice(statsSettings.demoMode ? "تم تفعيل أرقام العرض التجريبية وحفظها." : "تم تفعيل الأرقام الحقيقية للمنصة.");
    } catch (e: any) {
      setNotice("تعذر حفظ أرقام المنصة: " + (e?.message || e));
    } finally {
      setStatsSaving(false);
    }
  };

  if (loading) return <main dir="rtl" className="sa-page"><div className="sa-loading">جاري تحميل مركز الإدارة…</div></main>;
  if (!authorized) return <main dir="rtl" className="sa-page"><div className="sa-denied"><ShieldCheck size={42}/><h1>Super Admin</h1><p>{error || "هذا القسم مخصص لمدير المنصة فقط."}</p><Link to="/dashboard" className="sa-btn">العودة إلى لوحة المتجر</Link></div></main>;

  return <main dir="rtl" className="sa-page">
    <header className="sa-topbar">
      <div className="sa-brand"><img src="/logo-ab.png" alt="Dzair Store" className="sa-logo-img" /><div><b>DZAIR STORE</b><small>SUPER ADMIN CONTROL</small></div></div>
      <div className="sa-top-actions"><span className="sa-admin"><span className="sa-dot"/> {email}</span><button className="sa-icon" onClick={load} title="تحديث"><RefreshCw size={17}/></button><button className="sa-icon danger" onClick={() => signOut()} title="تسجيل الخروج"><LogOut size={17}/></button></div>
    </header>
    <div className="sa-shell">
      <aside className="sa-side">
        <div className="sa-side-title">PLATFORM</div>
        <a className="active" href="#top"><LayoutDashboard size={17}/> نظرة عامة</a>
        <a href="#subscriptions"><CreditCard size={17}/> طلبات الاشتراك{metrics.pendingSubs > 0 ? ` (${metrics.pendingSubs})` : ""}</a>
        <a href="#stores"><Store size={17}/> المتاجر</a>
        <a href="#merchants"><Users size={17}/> التجار</a>
        <a href="#activity"><Activity size={17}/> النشاط</a><a href="#platform-stats"><Settings2 size={17}/> أرقام الهبوط</a>
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
              <h2>طلبات الاشتراك</h2>
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
          <div className="sa-sub-cards">
            {visibleSubs.map((r) => (
              <article key={`card-${r.id}`} className={`sa-sub-card status-${r.status || "pending"}`}>
                <div className="sa-sub-card-top">
                  <div>
                    <b>{storeLabel(r.store_id)}</b>
                    <span className="sa-sub-meta">{ownerEmail(r.owner_id)}</span>
                  </div>
                  <span className={`sa-status ${r.status === "approved" ? "live" : r.status === "rejected" ? "draft" : ""}`}>
                    {r.status === "pending" ? "معلّق" : r.status === "approved" ? "مقبول" : r.status === "rejected" ? "مرفوض" : r.status}
                  </span>
                </div>
                <div className="sa-sub-grid">
                  <span>الباقة</span><b>{r.plan_requested === "pro_shipping" ? "Pro شحن" : r.plan_requested === "pro" ? "Pro" : "—"}</b>
                  <span>الدورة</span><b>{r.billing_cycle === "yearly" ? "سنوي" : r.billing_cycle === "monthly" ? "شهري" : (r.plan_type === "yearly" ? "سنوي" : r.plan_type === "monthly" ? "شهري" : (r.billing_cycle || r.plan_type || "—"))}</b>
                  <span>المبلغ</span><b>{r.amount != null ? `${Number(r.amount).toLocaleString("ar-DZ")} دج` : "—"}</b>
                  <span>الدفع</span><b>{r.payment_method === "gab_retrait" ? "سحب بدون بطاقة" : r.payment_method === "baridimob" ? "BaridiMob" : r.payment_method === "both" ? "الاثنان" : (r.payment_method || "—")}</b>
                  <span>التاريخ</span><b>{r.created_at ? new Date(r.created_at).toLocaleString("ar-DZ") : "—"}</b>
                </div>
                {(r.cardless_code || r.operation_number || r.phone_number) && (
                  <p className="sa-sub-codes" dir="ltr">
                    {r.operation_number ? `عملية: ${r.operation_number} · ` : ""}
                    {r.cardless_code ? `رمز: ${r.cardless_code} · ` : ""}
                    {r.phone_number || ""}
                  </p>
                )}
                <div className="sa-sub-actions">
                  {r.receipt_url ? (
                    <button type="button" className="sa-open" disabled={receiptBusyId === r.id} onClick={() => handleViewReceipt(r.id, r.receipt_url!)}>
                      {receiptBusyId === r.id ? "…" : "عرض الوصل"}
                    </button>
                  ) : null}
                  {r.status === "pending" && (
                    <>
                      <button type="button" className="sa-approve" disabled={busyId === r.id} onClick={() => requestApprove(r)}>قبول {r.plan_requested === "pro_shipping" ? "Pro شحن" : "Pro"}</button>
                      <button type="button" className="sa-reject" disabled={busyId === r.id} onClick={() => requestReject(r)}>رفض</button>
                    </>
                  )}
                </div>
              </article>
            ))}
            {visibleSubs.length === 0 && <p className="sa-empty">لا توجد طلبات في هذا التصفية.</p>}
          </div>
          <div className="sa-table-wrap sa-table-desktop">
            <table className="sa-table">
              <thead>
                <tr>
                  <th>التاريخ</th>
                  <th>المتجر</th>
                  <th>التاجر</th>
                  <th>الباقة</th>
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
                    <td>{r.plan_requested === "pro_shipping" ? "Pro شحن" : r.plan_requested === "pro" ? "Pro" : "—"}</td>
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
                        <span title={r.phone_number || ""}>
                          رمز: {r.cardless_code}{r.operation_number ? <><br/>عملية: {r.operation_number}</> : null}
                        </span>
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
                            onClick={() => requestApprove(r)}
                          >
                            {busyId === r.id ? "…" : "موافقة"}
                          </button>
                          <button
                            className="sa-outline"
                            style={{ padding: "6px 10px", fontSize: 12 }}
                            disabled={busyId === r.id}
                            onClick={() => requestReject(r)}
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
                  <tr><td colSpan={10} className="sa-empty">لا توجد طلبات في هذا التصفية.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="sa-card sa-wide sa-platform-stats-control" id="platform-stats" style={{ marginBottom: 18 }}>
          <div className="sa-card-head">
            <div><h2>أرقام المنصة الظاهرة للزوار</h2><small>تحكم كامل: تجريبية قبل الإطلاق أو حقيقية بعد بدء المنصة.</small></div>
            <span className={`sa-status ${statsSettings.demoMode ? "draft" : "live"}`}><Eye size={13}/> {statsSettings.demoMode ? "وضع تجريبي" : "وضع حقيقي"}</span>
          </div>
          <div className="sa-demo-toggle-row">
            <div><b>عرض أرقام تجريبية</b><small>الأرقام التجريبية تحمل وسمًا واضحًا في صفحة الهبوط، ولا تُعرض كإحصاءات حقيقية.</small></div>
            <button type="button" className={`switch ${statsSettings.demoMode ? "is-on" : ""}`} aria-pressed={statsSettings.demoMode} onClick={() => setStatsSettings(v => ({...v, demoMode: !v.demoMode}))}><i/></button>
          </div>
          <div className="sa-demo-grid">
            {(
              [
                ["visits", "زيارات المنصة"],
                ["stores", "متاجر منشورة"],
                ["newStores", "متاجر جديدة · 30 يوم"],
                ["products", "منتجات منشورة"],
              ] as const
            ).map(([key, label]) => (
              <label key={key}>
                <span>{label}</span>
                <input
                  type="number"
                  min="0"
                  value={statsSettings[key]}
                  onChange={(e) =>
                    setStatsSettings((v) => ({
                      ...v,
                      [key]: Number(e.target.value) || 0,
                    }))
                  }
                />
              </label>
            ))}
          </div>
          <button type="button" className="sa-btn sa-save-stats" disabled={statsSaving} onClick={saveStatsSettings}><Save size={15}/> {statsSaving ? "جاري الحفظ…" : "حفظ أرقام المنصة"}</button>
        </div>

        <div className="sa-grid" id="stores">
          <div className="sa-card sa-wide">
            <div className="sa-card-head"><div><h2>المتاجر</h2><small>كل المتاجر المسجلة في المنصة</small></div><span className="sa-count">{visibleStores.length}</span></div>
            <div className="sa-toolbar"><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="بحث باسم المتجر أو المعرّف أو بريد المالك…"/><div className="sa-filters">{([['all','الكل'],['published','منشور'],['draft','مسودة']] as const).map(([v,l])=><button key={v} className={filter===v?'on':''} onClick={()=>setFilter(v)}>{l}</button>)}</div></div>
            <div className="sa-plan-stats" style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))",gap:12,margin:"16px 0"}}>
              <div className="stat-card" style={{padding:14,borderRadius:12,background:"rgba(255,255,255,0.04)"}}>
                <span style={{fontSize:12,opacity:0.7}}>مشتركو الباقات</span>
                <div style={{marginTop:8,fontSize:13,lineHeight:1.7}}>
                  <div>مجاني: <b>{metrics.planFree}</b></div>
                  <div>Pro: <b>{metrics.planPro}</b></div>
                  <div>Pro شحن: <b>{metrics.planProShip}</b></div>
                </div>
              </div>
              <div className="stat-card" style={{padding:14,borderRadius:12,background:"rgba(255,255,255,0.04)"}}>
                <span style={{fontSize:12,opacity:0.7}}>زيارات كل المتاجر</span>
                <strong style={{display:"block",fontSize:22,marginTop:6}}>{metrics.visitsTotal.toLocaleString("ar-DZ")}</strong>
              </div>
            </div>
            <div className="sa-table-wrap"><table className="sa-table"><thead><tr><th>المتجر</th><th>المالك</th><th>منتجات</th><th>قنوات</th><th>الخطة</th><th>الحالة</th><th>تاريخ الإنشاء</th><th/></tr></thead><tbody>
              {visibleStores.map(s=><tr key={s.id}><td><div className="sa-store-name"><span>{s.name.slice(0,1)}</span><div><b>{s.name}</b><small>/{s.slug}</small></div></div></td><td>{ownerEmail(s.owner_id)}</td><td>{productCount(s.id)}</td><td>{channelCount(s.id)}</td><td>{s.plan === "pro_shipping" ? "Pro شحن" : s.plan === "pro" ? "Pro" : "مجاني"}</td><td><span className={s.is_published?'sa-status live':'sa-status draft'}>{s.is_published?<CheckCircle2 size={13}/>:<XCircle size={13}/>} {s.is_published?'منشور':'مسودة'}</span></td><td>{s.created_at ? new Date(s.created_at).toLocaleDateString("ar-DZ") : "—"}</td><td>
  <div style={{display:"flex",gap:6,alignItems:"center"}}>
    <button
      type="button"
      className="sa-open"
      title="تفاصيل المتجر"
      onClick={() => setSelectedStore(s)}
    >
      <Eye size={15}/>
    </button>
    <Link
      to="/"
      search={{store:s.slug}}
      className="sa-open"
      title="فتح المتجر"
    >
      <ArrowUpRight size={15}/>
    </Link>
  </div>
</td></tr>)}
              {!visibleStores.length&&<tr><td colSpan={8} className="sa-empty">لا توجد نتائج.</td></tr>}
            </tbody></table></div>
          </div>
          <div className="sa-card" id="merchants">
  <div className="sa-card-head">
    <div><h2>التجار</h2><small>حسابات المنصة غير الإدارية</small></div>
    <span className="sa-count">{profiles.filter(p=>p.role!=="super_admin").length}</span>
  </div>
  <div className="sa-list">{profiles.filter(p=>p.role!=='super_admin').slice(0,8).map(p=><div className="sa-user" key={p.id}><span>{(p.email||'?').slice(0,1).toUpperCase()}</span><div><b>{p.email||'بدون بريد'}</b><small>{stores.filter(s=>s.owner_id===p.id).length} متجر</small></div><ChevronLeft size={14}/></div>)}</div></div>
          <div className="sa-card" id="activity"><div className="sa-card-head"><div><h2>حالة المنصة</h2><small>مؤشرات تشغيلية مباشرة</small></div></div><div className="sa-health"><Health label="المصادقة" value="Supabase Auth" ok/><Health label="قاعدة البيانات" value="Supabase" ok/><Health label="النشر" value={`${metrics.published} متجر منشور`} ok={metrics.published>0}/><Health label="طلبات Pro" value={`${metrics.pendingSubs} معلّق`} ok/></div></div>
        </div>
        {selectedStore && (
      <div className="sa-modal-backdrop" onClick={() => setSelectedStore(null)}>
        <div className="sa-modal" role="dialog" aria-modal="true" onClick={e => e.stopPropagation()}>
          <div className="sa-modal-head">
            <div>
              <small>STORE DETAILS</small>
              <h2>{selectedStore.name}</h2>
            </div>
            <button type="button" className="sa-icon" onClick={() => setSelectedStore(null)}>
              <XCircle size={18}/>
            </button>
          </div>

          <div className="sa-detail-grid">
            <div><span>الرابط</span><b>/{selectedStore.slug}</b></div>
            <div><span>المالك</span><b>{ownerEmail(selectedStore.owner_id)}</b></div>
            <div><span>الخطة</span><b>{selectedStore.plan === "pro_shipping" ? "Pro شحن" : selectedStore.plan === "pro" ? "Pro" : "مجاني"}</b></div>
            <div><span>الحالة</span><b>{selectedStore.is_published ? "منشور" : "مسودة"}</b></div>
            <div><span>المنتجات النشطة</span><b>{productCount(selectedStore.id)}</b></div>
            <div><span>القنوات النشطة</span><b>{channelCount(selectedStore.id)}</b></div>
            <div><span>الزيارات</span><b>{(Number(selectedStore.visit_count) || 0).toLocaleString("ar-DZ")}</b></div>
            <div><span>تاريخ الإنشاء</span><b>{selectedStore.created_at ? new Date(selectedStore.created_at).toLocaleDateString("ar-DZ") : "—"}</b></div>
            <div><span>واتساب</span><b dir="ltr">{selectedStore.whatsapp || "—"}</b></div>
          </div>

          <div className="sa-modal-actions">
            <Link to="/" search={{store:selectedStore.slug}} className="sa-btn" onClick={() => setSelectedStore(null)}>
              <ArrowUpRight size={15}/> فتح المتجر
            </Link>
            <button type="button" className="sa-outline" onClick={() => setSelectedStore(null)}>إغلاق</button>
          </div>
        </div>
      </div>
    )}

    {confirmAction && (
      <div className="sa-modal-backdrop" onClick={() => setConfirmAction(null)}>
        <div className="sa-modal" role="dialog" aria-modal="true" onClick={e => e.stopPropagation()}>
          <div className="sa-modal-head">
            <div>
              <small>{confirmAction.type === "approve" ? "CONFIRM APPROVAL" : "REJECT SUBSCRIPTION"}</small>
              <h2>{confirmAction.type === "approve" ? "تأكيد تفعيل الاشتراك" : "رفض طلب الاشتراك"}</h2>
            </div>
            <button type="button" className="sa-icon" onClick={() => setConfirmAction(null)}>
              <XCircle size={18}/>
            </button>
          </div>

          <div className="sa-confirm-box">
            <b>{storeLabel(confirmAction.row.store_id)}</b>
            <span>{ownerEmail(confirmAction.row.owner_id)}</span>
            <span>
              {confirmAction.row.plan_requested === "pro_shipping" ? "Pro شحن" : "Pro"}
              {" · "}
              {confirmAction.row.billing_cycle === "yearly" ? "سنوي" : "شهري"}
            </span>
          </div>

          {confirmAction.type === "reject" && (
            <label className="sa-reject-note">
              <span>سبب الرفض <small>(اختياري)</small></span>
              <textarea
                value={rejectNote}
                onChange={e => setRejectNote(e.target.value)}
                placeholder="اكتب سببًا مختصرًا للتاجر…"
                rows={4}
                maxLength={500}
              />
            </label>
          )}

          <div className="sa-modal-actions">
            <button
              type="button"
              className={confirmAction.type === "approve" ? "sa-btn" : "sa-reject"}
              disabled={busyId === confirmAction.row.id}
              onClick={executeConfirmAction}
            >
              {busyId === confirmAction.row.id
                ? "جاري التنفيذ…"
                : confirmAction.type === "approve"
                  ? "نعم، تفعيل الاشتراك"
                  : "نعم، رفض الطلب"}
            </button>
            <button type="button" className="sa-outline" onClick={() => setConfirmAction(null)}>إلغاء</button>
          </div>
        </div>
      </div>
    )}

    <footer className="sa-footer">DZAIR STORE · Platform Administration <span>Protected area · Super Admin only</span></footer>
      </section>
    </div>
    <style>{`
      .sa-toast{margin:0 0 14px;padding:10px 14px;border-radius:12px;background:rgba(14,165,233,.15);border:1px solid rgba(14,165,233,.35);font-size:13px}
.sa-card h1,.sa-card h2,.sa-card h3,.sa-card h4,
.sa-card strong,.sa-card th{color:#17231f !important}
.sa-card p,.sa-card label,.sa-card small,
.sa-card td,.sa-card span{color:#42524b}
.sa-card .sa-muted,.sa-card .muted{color:#52645c !important}
.sa-card input,.sa-card textarea,.sa-card select{color:#17231f !important}
.sa-card input::placeholder,.sa-card textarea::placeholder{color:#66756f !important;opacity:1}
.sa-card table th{font-weight:700}
.sa-card table td{color:#34443d}
.sa-card .text-muted{color:#52645c !important}

.sa-modal-backdrop{position:fixed;inset:0;z-index:1000;background:rgba(0,0,0,.62);backdrop-filter:blur(7px);display:flex;align-items:center;justify-content:center;padding:18px}
.sa-modal{width:min(620px,100%);max-height:88vh;overflow:auto;background:#101817;border:1px solid rgba(255,255,255,.12);border-radius:20px;box-shadow:0 24px 80px rgba(0,0,0,.45);padding:20px;direction:rtl}
.sa-modal-head{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;margin-bottom:18px}
.sa-modal-head small{font-size:10px;letter-spacing:.12em;opacity:.55}
.sa-modal-head h2{margin:5px 0 0;font-size:22px}
.sa-detail-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}
.sa-detail-grid>div{padding:12px;border:1px solid rgba(255,255,255,.08);background:rgba(255,255,255,.035);border-radius:12px}
.sa-detail-grid span{display:block;font-size:11px;opacity:.55;margin-bottom:5px}
.sa-detail-grid b{display:block;overflow-wrap:anywhere;font-size:13px}
.sa-modal-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:20px}
.sa-confirm-box{display:grid;gap:5px;padding:14px;border-radius:14px;background:rgba(255,255,255,.045);border:1px solid rgba(255,255,255,.08)}
.sa-confirm-box span{font-size:12px;opacity:.65}
.sa-reject-note{display:block;margin-top:14px}
.sa-reject-note>span{display:block;font-size:12px;margin-bottom:7px}
.sa-reject-note textarea{width:100%;box-sizing:border-box;resize:vertical;border:1px solid rgba(255,255,255,.12);border-radius:12px;background:rgba(255,255,255,.045);color:inherit;padding:11px;font:inherit;outline:none}
.sa-reject-note textarea:focus{border-color:rgba(14,165,233,.65)}
@media (max-width:640px){.sa-modal-backdrop{padding:10px}.sa-modal{padding:16px;border-radius:16px}.sa-detail-grid{grid-template-columns:1fr}.sa-modal-actions>*{flex:1;justify-content:center}}
    `}
/* High contrast — Super Admin */
.sa-card h1,
.sa-card h2,
.sa-card h3,
.sa-card h4,
.sa-card strong,
.sa-card th {
  color: #10231c !important;
  opacity: 1 !important;
}

.sa-card p,
.sa-card label,
.sa-card small,
.sa-card td,
.sa-card span {
  color: #34483f !important;
  opacity: 1 !important;
}

.sa-card .sa-muted,
.sa-card .muted,
.sa-card .text-muted {
  color: #52665d !important;
  opacity: 1 !important;
}

.sa-card input,
.sa-card textarea,
.sa-card select {
  background: #ffffff !important;
  color: #10231c !important;
  border-color: #b9cbc3 !important;
  opacity: 1 !important;
}

.sa-card input::placeholder,
.sa-card textarea::placeholder {
  color: #52665d !important;
  opacity: 1 !important;
}

.sa-card button {
  opacity: 1 !important;
}

.sa-card .sa-count,
.sa-card .sa-metric-value,
.sa-card .sa-stat-value {
  color: #10231c !important;
  opacity: 1 !important;
}

.sa-platform-stats-control input {
  background: #ffffff !important;
  color: #10231c !important;
  border: 1px solid #b9cbc3 !important;
  font-weight: 700 !important;
}

.sa-platform-stats-control input::placeholder {
  color: #52665d !important;
  opacity: 1 !important;
}

.sa-health span {
  color: #34483f !important;
  opacity: 1 !important;
}

.sa-health strong {
  color: #10231c !important;
  opacity: 1 !important;
}

.sa-reject-note textarea {
  background: #ffffff !important;
  color: #10231c !important;
  border-color: #b9cbc3 !important;
}

.sa-reject-note textarea::placeholder {
  color: #52665d !important;
  opacity: 1 !important;
}

</style>
  </main>;
}
function Metric({icon:Icon,label,value,note}:{icon:any;label:string;value:number;note:string}){return <div className="sa-metric"><span className="sa-metric-icon"><Icon size={18}/></span><div><small>{label}</small><strong>{value.toLocaleString("ar-DZ")}</strong><em>{note}</em></div></div>}
function Health({label,value,ok}:{label:string;value:string;ok:boolean}){return <div className="sa-health-row"><span>{label}</span><b>{value}</b><i className={ok?'ok':'bad'}>{ok?<CheckCircle2 size={14}/>:<XCircle size={14}/>}</i></div>}
