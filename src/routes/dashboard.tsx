import { createFileRoute } from "@tanstack/react-router";
import {
  BarChart3, Bell, Check, ChevronLeft, CircleHelp, ExternalLink, Eye, Image as ImageIcon,
  LayoutDashboard, MessageCircle, Package, Pencil, Plus, Save, Settings2, ShoppingBag,
  Smartphone, Store, Trash2, Upload, Users, X, Zap, type LucideIcon
} from "lucide-react";
import { useEffect, useMemo, useRef, useState, type Dispatch, type SetStateAction, type RefObject } from "react";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import {
  ensureStoreForUser,
  getSessionUser,
  loadChannels,
  loadProducts,
  replaceProducts,
  saveClothingStockSettings,
  saveChannels,
  saveDeliverySettings,
  saveMerchantBanner,
  saveStoreSettings,
  signIn,
  signOut,
  signUp,
  storeToSettings,
  uploadMerchantLogo,
  uploadProductImage,
  type StoreRow,
  saveYalidineSettings,
} from "@/lib/storeData";
import { isStorePro, PRICING } from "@/lib/pricing";
import { UpgradeModal } from "@/components/UpgradeModal";
import { OrdersPanel } from "@/components/OrdersPanel";
import { setStoreOpen, saveWorkingHours } from "@/lib/storeData";

import heroHeadphones from "@/assets/hero-headphones.jpg";
import productCharger from "@/assets/product-charger.jpg";
import productEarbuds from "@/assets/product-earbuds.jpg";
import productWatch from "@/assets/product-watch.jpg";

export const Route = createFileRoute("/dashboard")({ component: Dashboard });

type Product = { id: string; name: string; category: string; price: number; oldPrice?: number | null; badge: string; image: string; description: string; stock?: number | null; trackStock?: boolean; variants?: { id?: string; color?: string | null; pointure?: string | null; taille?: string | null; stock: number }[] };
type StoreSettings = { name: string; whatsapp: string; announcement: string; heroTitle: string; heroEmphasis: string; heroDescription: string; contactTitle: string; contactEmphasis: string };
type ChannelState = Record<string, boolean>;

const defaults: StoreSettings = {
  name: "متجر النور", whatsapp: "213555000000", announcement: "توصيل مجاني للطلبات فوق 15,000 دج",
  heroTitle: "الصوت،", heroEmphasis: "كما يجب أن يُسمع.", heroDescription: "هندسة صوتية دقيقة. هدوء بلا حدود. تصميم صُنع ليبقى.",
  contactTitle: "نحن أقرب", contactEmphasis: "مما تتخيّل.",
};
const defaultChannels: ChannelState = { WhatsApp: true, Facebook: false, Instagram: false, Messenger: false, Telegram: false };

const defaultProducts: Product[] = [
  { id: "1", name: "سماعات Noir Pro", category: "صوتيات", description: "عزل نشط للضوضاء وصوت مكاني بتفاصيل استثنائية.", price: 24900, oldPrice: 28900, badge: "اختيارنا", image: heroHeadphones },
  { id: "2", name: "سماعات Aero Buds", category: "صوتيات", description: "صوت نقي، راحة طوال اليوم، وعلبة شحن صغيرة.", price: 8900, oldPrice: 10500, badge: "الأكثر طلباً", image: productEarbuds },
  { id: "3", name: "ساعة Mono S1", category: "أجهزة ذكية", description: "شاشة فائقة الوضوح ومتابعة متقدمة لنشاطك اليومي.", price: 14500, oldPrice: null, badge: "جديد", image: productWatch },
  { id: "4", name: "شاحن Flux 65W", category: "إكسسوارات", description: "طاقة سريعة بحجم صغير مع كابل مضفّر متين.", price: 3900, oldPrice: 4700, badge: "عرض", image: productCharger },
];

function Dashboard() {
  const [tab, setTab] = useState("overview");
  const [settings, setSettings] = useState(defaults);
  const [products, setProducts] = useState<Product[]>([]);
  const [channels, setChannels] = useState<ChannelState>(defaultChannels);
  const [saved, setSaved] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [notice, setNotice] = useState("");
  const uploadRef = useRef<HTMLInputElement>(null);
  const [authReady, setAuthReady] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [store, setStore] = useState<StoreRow | null>(null);
  // Full absolute URL so QR codes and share links open the real storefront
  // (relative "/?store=slug" only works inside the same browser tab).
  const storeUrl = store
    ? `${typeof window !== "undefined" ? window.location.origin : ""}/?store=${encodeURIComponent(store.slug)}`
    : "/";
  const [loading, setLoading] = useState(true);
  const [authMode, setAuthMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [showPass2, setShowPass2] = useState(false);
  const [signupMailModal, setSignupMailModal] = useState(false);
  const [authError, setAuthError] = useState("");
  const [authBusy, setAuthBusy] = useState(false);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [clothingMode, setClothingMode] = useState(false);
  const [lowStockThreshold, setLowStockThreshold] = useState(5);

  const bootstrap = async () => {
    setLoading(true);
    try {
      if (!isSupabaseConfigured) {
        setNotice("أضف VITE_SUPABASE_URL و VITE_SUPABASE_ANON_KEY");
        setAuthReady(true);
        setLoading(false);
        return;
      }
      const user = await getSessionUser();
      if (!user) {
        setUserEmail(null);
        setStore(null);
        setAuthReady(true);
        setLoading(false);
        return;
      }
      setUserEmail(user.email ?? null);
      const st = await ensureStoreForUser(user.id, user.email);
      setStore(st);
      setClothingMode(Boolean((st as any).clothing_mode));
      setLowStockThreshold(Number((st as any).low_stock_threshold) || 5);
      setSettings({ ...defaults, ...storeToSettings(st) });
      const [prods, ch] = await Promise.all([loadProducts(st.id), loadChannels(st.id)]);
      setProducts(prods);
      setChannels({ ...defaultChannels, ...ch });
      setAuthReady(true);
    } catch (e: any) {
      setAuthError(e?.message || String(e));
      setAuthReady(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    bootstrap();
    const { data: sub } = supabase.auth.onAuthStateChange(() => { bootstrap(); });
    return () => sub.subscription.unsubscribe();
  }, []);

  const saveAll = async () => {
    if (!store) { setNotice("يجب تسجيل الدخول أولاً"); return; }
    try {
      setNotice("جاري الحفظ…");
      await saveStoreSettings(store.id, settings);
      await saveChannels(store.id, channels);
      await saveClothingStockSettings(store.id, {
        clothing_mode: clothingMode,
        low_stock_threshold: lowStockThreshold,
      });
      await replaceProducts(store.id, products);
      setSaved(true);
      setNotice("تم حفظ ونشر التغييرات على المتجر");
      setTimeout(() => setSaved(false), 2200);
      setTimeout(() => setNotice(""), 2500);
    } catch (e: any) {
      setNotice("فشل الحفظ: " + (e?.message || e));
    }
  };

  const stats = useMemo(() => [
    ["المنتجات", products.length.toString(), "نشط الآن", Package],
    ["طلبات اليوم", "—", "قريباً", ShoppingBag],
    ["رسائل واتساب", "—", "قريباً", MessageCircle],
    ["زوار المتجر", "—", "قريباً", Users],
  ] as const, [products.length]);

  const updateProduct = (patch: Partial<Product>) => setEditing(v => v ? { ...v, ...patch } : v);
  const addProduct = () => setEditing({ id: crypto.randomUUID(), name: "منتج جديد", category: "عام", description: "وصف المنتج", price: 0, oldPrice: null, badge: "جديد", image: productCharger });
  const commitProduct = () => {
    if (!editing) return;
    setProducts(prev => prev.some(p => p.id === editing.id) ? prev.map(p => p.id === editing.id ? editing : p) : [...prev, editing]);
    setEditing(null); setNotice("تم تحديث المنتج (احفظ للنشر)"); setTimeout(() => setNotice(""), 1800);
  };
  const deleteProduct = (id: string) => setProducts(prev => prev.filter(p => p.id !== id));
  const [modalImageUploading, setModalImageUploading] = useState(false);
  const handleModalImageUpload = async (file: File) => {
    setModalImageUploading(true);
    try {
      const user = await getSessionUser();
      if (!user) throw new Error("سجّل الدخول");
      const url = await uploadProductImage(user.id, file);
      updateProduct({ image: url });
      setNotice("تم رفع الصورة");
      setTimeout(() => setNotice(""), 1500);
    } catch (e: any) {
      // Upload failed — fall back to a local preview so the editor still
      // shows something, but warn clearly that this preview will NOT be
      // saved (replaceProducts strips any un-uploaded data: image on save).
      const reader = new FileReader();
      reader.onload = () => updateProduct({ image: String(reader.result) });
      reader.readAsDataURL(file);
      setNotice("⚠️ فشل رفع الصورة، هذه معاينة محلية فقط ولن تُحفظ: " + (e?.message || ""));
    } finally {
      setModalImageUploading(false);
    }
  };
  const uploadImage = async (file: File, productId: string) => {
    try {
      const user = await getSessionUser();
      if (!user) throw new Error("سجّل الدخول");
      const url = await uploadProductImage(user.id, file);
      setProducts(prev => prev.map(p => p.id === productId ? { ...p, image: url } : p));
      setNotice("تم رفع الصورة — احفظ التغييرات");
    } catch (e: any) {
      const reader = new FileReader();
      reader.onload = () => setProducts(prev => prev.map(p => p.id === productId ? { ...p, image: String(reader.result) } : p));
      reader.readAsDataURL(file);
      setNotice("معاينة محلية: " + (e?.message || ""));
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthBusy(true);
    setAuthError("");
    try {
      if (authMode === "login") {
        await signIn(email.trim(), password);
        await bootstrap();
        return;
      }
      if (password !== password2) {
        setAuthError("كلمتا المرور غير متطابقتين");
        return;
      }
      if (password.length < 6) {
        setAuthError("كلمة المرور يجب أن تكون 6 أحرف على الأقل");
        return;
      }
      const data = await signUp(email.trim(), password);
      // إن تطلّب تأكيد البريد: لا جلسة فورية
      const needsConfirm = !data.session;
      if (needsConfirm) {
        setSignupMailModal(true);
        setAuthMode("login");
        setPassword("");
        setPassword2("");
        return;
      }
      await bootstrap();
    } catch (err: any) {
      setAuthError(err?.message || String(err));
    } finally {
      setAuthBusy(false);
    }
  };

  if (loading || !authReady) {
    return (<main dir="rtl" className="min-h-screen grid place-items-center bg-[#0b1220] text-white"><p>جاري التحميل…</p></main>);
  }

  if (!userEmail) {
    return (
      <main dir="rtl" className="min-h-screen grid place-items-center bg-[#0b1220] text-white p-6">
        {signupMailModal && (
          <div className="auth-mail-overlay" role="dialog" aria-modal="true">
            <div className="auth-mail-card">
              <div className="auth-mail-icon"><Mail size={28} /></div>
              <h2>تم إنشاء الحساب</h2>
              <p>
                أرسلنا رابط تأكيد إلى بريدك:
                <br />
                <strong dir="ltr">{email}</strong>
              </p>
              <p className="auth-mail-hint">
                افتح البريد واضغط الرابط لتفعيل الحساب. بعدها ستُعاد مباشرة إلى
                <b> لوحة التحكم</b> حيث يُجهَّز متجرك.
              </p>
              <button type="button" className="auth-mail-btn" onClick={() => setSignupMailModal(false)}>
                حسناً، سأتحقق من بريدي
              </button>
            </div>
          </div>
        )}
        <form onSubmit={handleAuth} className="w-full max-w-md rounded-2xl border border-white/10 bg-white/5 p-6 space-y-4">
          <div>
            <p className="text-xs opacity-70">AB STORE · CONTROL CENTER</p>
            <h1 className="text-2xl font-black mt-1">{authMode === "login" ? "تسجيل الدخول" : "إنشاء حساب تاجر"}</h1>
          </div>
          <label className="block text-sm">البريد الإلكتروني
            <input className="mt-1 w-full rounded-xl bg-black/30 border border-white/10 px-3 py-2" type="email" required autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} />
          </label>
          <label className="block text-sm">كلمة المرور
            <div className="auth-pass-wrap">
              <input
                className="mt-1 w-full rounded-xl bg-black/30 border border-white/10 px-3 py-2 pe-11"
                type={showPass ? "text" : "password"}
                required
                minLength={6}
                autoComplete={authMode === "login" ? "current-password" : "new-password"}
                value={password}
                onChange={e => setPassword(e.target.value)}
              />
              <button type="button" className="auth-eye" onClick={() => setShowPass(v => !v)} aria-label={showPass ? "إخفاء" : "إظهار"}>
                {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </label>
          {authMode === "signup" && (
            <label className="block text-sm">تأكيد كلمة المرور
              <div className="auth-pass-wrap">
                <input
                  className="mt-1 w-full rounded-xl bg-black/30 border border-white/10 px-3 py-2 pe-11"
                  type={showPass2 ? "text" : "password"}
                  required
                  minLength={6}
                  autoComplete="new-password"
                  value={password2}
                  onChange={e => setPassword2(e.target.value)}
                />
                <button type="button" className="auth-eye" onClick={() => setShowPass2(v => !v)} aria-label={showPass2 ? "إخفاء" : "إظهار"}>
                  {showPass2 ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </label>
          )}
          {authError && <p className="text-sm text-red-400">{authError}</p>}
          <button disabled={authBusy} className="w-full rounded-xl bg-sky-500 text-white font-bold py-2.5">
            {authBusy ? "جاري…" : authMode === "login" ? "دخول" : "تسجيل"}
          </button>
          <button type="button" className="w-full text-sm opacity-80" onClick={() => { setAuthMode(m => m === "login" ? "signup" : "login"); setAuthError(""); setPassword2(""); }}>
            {authMode === "login" ? "ليس لديك حساب؟ سجّل" : "لديك حساب؟ ادخل"}
          </button>
        </form>
      </main>
    );
  }

  return (
    <main dir="rtl" className="ab-dashboard">
      <aside className="ab-sidebar">
        <a className="ab-logo" href={storeUrl} title="فتح المتجر"><img src="/logo-ab.png" alt="AB Store Noor" className="ab-logo-img" /><div><b>AB STORE</b><small>لوحة التحكم</small></div></a>
        <div className="ab-store-pill"><span className="online-dot"/><div><b>{settings.name}</b><small>المتجر متصل</small></div><ChevronLeft size={15}/></div>
        <nav>
          <NavItem icon={LayoutDashboard} label="نظرة عامة" active={tab === "overview"} onClick={() => setTab("overview")} />
          <NavItem icon={ShoppingBag} label="الطلبات" active={tab === "orders"} onClick={() => setTab("orders")} />
          <NavItem icon={Store} label="بيانات المتجر" active={tab === "store"} onClick={() => setTab("store")} />
          <NavItem icon={Package} label="المنتجات والأسعار" active={tab === "products"} onClick={() => setTab("products")} />
          <NavItem icon={ImageIcon} label="صور المنتجات" active={tab === "media"} onClick={() => setTab("media")} />
          <NavItem icon={Pencil} label="نصوص الواجهة" active={tab === "homepage"} onClick={() => setTab("homepage")} />
          <NavItem icon={Zap} label="قنوات التواصل" active={tab === "channels"} onClick={() => setTab("channels")} />
        </nav>
        <div className="ab-sidebar-bottom"><NavItem icon={Settings2} label="إعدادات" active={tab === "settings"} onClick={() => setTab("settings")} /><NavItem icon={CircleHelp} label="المساعدة" active={false} onClick={() => setNotice("مركز المساعدة قيد الربط")} /></div>
      </aside>

      <section className="ab-main">
        <header className="ab-topbar"><div><span className="ab-kicker">CONTROL CENTER</span><h1>{tabTitle(tab)}</h1></div><div className="ab-actions"><button className="icon-btn"><Bell size={18}/><i/></button><button className="preview-btn" onClick={() => window.open(storeUrl, "_blank")}><Eye size={17}/> معاينة المتجر <ExternalLink size={14}/></button><a className="store-link-btn" href={storeUrl}><Store size={16}/> زيارة المتجر</a><button className="save-btn" onClick={saveAll}>{saved ? <Check size={17}/> : <Save size={17}/>} {saved ? "تم الحفظ" : "حفظ التغييرات"}</button>
          <button className="preview-btn" type="button" onClick={async () => { await signOut(); setUserEmail(null); setStore(null); }}>خروج</button>
        </div></header>
        <div style={{padding:"6px 18px",fontSize:12,opacity:.75}}>حساب: {userEmail}{store ? ` · ${store.name} (${store.slug})` : ""}</div>

        {notice && <div className="ab-toast"><Check size={16}/> {notice}</div>}

        {tab === "overview" && <Overview stats={stats} setTab={setTab} storeUrl={storeUrl} />}
        {tab === "orders" && store && (
          <OrdersPanel storeId={store.id} whatsapp={settings.whatsapp || store.whatsapp || ""} />
        )}
        {tab === "store" && (
          <>
            <StorePanel settings={settings} setSettings={setSettings} store={store} onStoreUpdate={(patch) => setStore(s => s ? { ...s, ...patch } : s)} clothingMode={clothingMode} setClothingMode={setClothingMode} lowStockThreshold={lowStockThreshold} setLowStockThreshold={setLowStockThreshold} />
            {store && (
              <div className="qr-box" style={{margin:"12px 16px"}}>
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(storeUrl)}`}
                  alt="QR المتجر"
                  width={180}
                  height={180}
                />
                <div>
                  <b>QR متجرك</b>
                  <p>اطبعه على الباب أو الطاولة — الزبون يمسح ويدخل مباشرة.</p>
                  <p
                    className="qr-full-url"
                    style={{
                      marginTop: 10,
                      fontSize: 12,
                      wordBreak: "break-all",
                      direction: "ltr",
                      textAlign: "left",
                      opacity: 0.9,
                      background: "rgba(0,0,0,.25)",
                      padding: "8px 10px",
                      borderRadius: 10,
                      border: "1px solid rgba(255,255,255,.1)",
                    }}
                    title={storeUrl}
                  >
                    {storeUrl}
                  </p>
                  <button
                    type="button"
                    className="ghost-btn"
                    style={{ marginTop: 8, height: 36, fontSize: 12 }}
                    onClick={() => {
                      navigator.clipboard?.writeText(storeUrl).then(() => {
                        setNotice("تم نسخ رابط المتجر");
                        setTimeout(() => setNotice(""), 2000);
                      });
                    }}
                  >
                    نسخ الرابط الكامل
                  </button>
                  <label className="hours-field" style={{display:"block",marginTop:12}}>
                    <span style={{display:"block",fontSize:12,opacity:.75,marginBottom:6}}>ساعات العمل (تظهر للزبون)</span>
                    <input
                      type="text"
                      defaultValue={store.working_hours || ""}
                      placeholder="مثال: السبت–الخميس 09:00–18:00 · الجمعة مغلق"
                      id="working-hours-input"
                      style={{width:"100%",maxWidth:360,padding:"10px 12px",borderRadius:12,border:"1px solid rgba(255,255,255,.15)",background:"rgba(0,0,0,.35)",color:"#fff"}}
                    />
                    <button
                      type="button"
                      style={{marginTop:8,padding:"8px 14px",borderRadius:10,border:0,background:"#0ea5e9",color:"#fff",fontWeight:700,cursor:"pointer"}}
                      onClick={async () => {
                        const el = document.getElementById("working-hours-input") as HTMLInputElement | null;
                        const v = el?.value?.trim() || "";
                        try {
                          await saveWorkingHours(store.id, v);
                          setStore({ ...store, working_hours: v });
                          setNotice("تم حفظ ساعات العمل");
                        } catch (e: any) {
                          setNotice(e?.message || String(e));
                        }
                      }}
                    >حفظ الساعات</button>
                  </label>
                  <div className="open-toggle">
                    <button
                      type="button"
                      className={store.is_open !== false ? "on-open" : ""}
                      onClick={async () => {
                        try {
                          await setStoreOpen(store.id, true);
                          setStore({ ...store, is_open: true });
                          setNotice("المتجر مفتوح لاستقبال الطلبات");
                        } catch (e: any) {
                          setNotice(e?.message || String(e));
                        }
                      }}
                    >مفتوح</button>
                    <button
                      type="button"
                      className={store.is_open === false ? "on-closed" : ""}
                      onClick={async () => {
                        try {
                          await setStoreOpen(store.id, false);
                          setStore({ ...store, is_open: false });
                          setNotice("الريدو مغلق — الطلبات متوقفة للزبائن");
                        } catch (e: any) {
                          setNotice(e?.message || String(e));
                        }
                      }}
                    >مغلق</button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
        {tab === "products" && <ProductsPanel products={products} onEdit={setEditing} onDelete={deleteProduct} onAdd={addProduct} lowStockThreshold={lowStockThreshold} />}
        {tab === "media" && <MediaPanel products={products} onUpload={uploadImage} />}
        {tab === "homepage" && <HomepagePanel settings={settings} setSettings={setSettings} />}
        {tab === "channels" && <ChannelsPanel settings={settings} setSettings={setSettings} channels={channels} setChannels={setChannels} />}
        {tab === "settings" && <SettingsPanel />}

        <footer className="ab-footer"><span>AB Store Control • متصل بـ Supabase</span><span>آخر حفظ: <b>{saved ? "الآن" : "غير محدد"}</b></span></footer>
      </section>

      {editing && <ProductModal product={editing} onChange={updateProduct} onClose={() => setEditing(null)} onSave={commitProduct} uploadRef={uploadRef} onUpload={handleModalImageUpload} uploading={modalImageUploading} />}
    
      {!isStorePro(store || {}) && (
        <div className="plan-banner free">
          <div>
            <b>خطتك: مجاني</b>
            <p>شعار AB Store Noor ظاهر · حد 10 منتجات · رقِّ لـ Pro لإزالة الشعار ووضع شعارك</p>
          </div>
          <button type="button" className="preview-btn" onClick={() => setShowUpgrade(true)}>ترقية Pro · 1,500 دج</button>
        </div>
      )}
      {isStorePro(store || {}) && (
        <div className="plan-banner pro">
          <div>
            <b>Pro مفعّل ✨</b>
            <p>شعار المنصة مخفي · ارفع شعار متجرك من الإعدادات</p>
          </div>
        </div>
      )}
      <UpgradeModal open={showUpgrade} onClose={() => setShowUpgrade(false)} storeId={store?.id || null} />

    </main>
  );
}

function tabTitle(tab: string) {
  if (tab === "orders") return "الطلبات";
   return ({ overview: "نظرة عامة", store: "بيانات المتجر", products: "المنتجات والأسعار", media: "مكتبة الصور", homepage: "نصوص الواجهة الرئيسية", channels: "قنوات التواصل", settings: "الإعدادات" } as Record<string,string>)[tab] || "لوحة التحكم"; }
function NavItem({ icon: Icon, label, active, onClick }: { icon: LucideIcon; label: string; active: boolean; onClick: () => void }) { return <button className={`ab-nav-item ${active ? "active" : ""}`} onClick={onClick}><Icon size={18}/><span>{label}</span>{active && <i/>}</button>; }

function Overview({ stats, setTab, storeUrl }: { stats: readonly [string,string,string,LucideIcon][]; setTab: (v:string)=>void; storeUrl: string }) {
  return <div className="ab-content"><div className="welcome-card"><div><span>مرحباً بك 👋</span><h2>تحكم كامل في متجرك من مكان واحد.</h2><p>عدّل بيانات التواصل، المنتجات، الأسعار، الصور ونصوص الواجهة ثم احفظها لتظهر في صفحة المتجر.</p><div className="welcome-actions"><button className="primary-btn" onClick={() => window.open(storeUrl, "_blank")}><Eye size={16}/> افتح صفحة المتجر</button><button className="secondary-btn" onClick={() => setTab("products")}><Package size={16}/> إدارة المنتجات</button></div></div><div className="welcome-orb"><Store size={42}/></div></div><div className="stats-grid">{stats.map(([label,value,trend,Icon])=><div className="stat-card" key={label}><div className="stat-icon"><Icon size={19}/></div><span>{label}</span><strong>{value}</strong><small>{trend}</small></div>)}</div><div className="two-col"><div className="panel"><div className="panel-head"><div><span className="ab-kicker">QUICK ACTIONS</span><h3>إدارة سريعة</h3></div></div><div className="quick-grid"><Quick icon={Store} title="بيانات المتجر" desc="الاسم + واتساب" onClick={()=>setTab("store")}/><Quick icon={Package} title="المنتجات" desc="إضافة وتعديل وحذف" onClick={()=>setTab("products")}/><Quick icon={ImageIcon} title="الصور" desc="تغيير صور المنتجات" onClick={()=>setTab("media")}/><Quick icon={Pencil} title="الواجهة" desc="العنوان والنصوص" onClick={()=>setTab("homepage")}/></div></div><div className="panel performance"><div className="panel-head"><div><span className="ab-kicker">STORE ACTIVITY</span><h3>نشاط المتجر</h3></div><BarChart3 size={20}/></div><div className="fake-chart"><span style={{height:"35%"}}/><span style={{height:"58%"}}/><span style={{height:"46%"}}/><span style={{height:"72%"}}/><span style={{height:"61%"}}/><span style={{height:"88%"}}/><span style={{height:"76%"}}/></div><div className="chart-labels"><span>السبت</span><span>الأحد</span><span>الإثنين</span><span>الثلاثاء</span><span>الأربعاء</span><span>الخميس</span><span>اليوم</span></div></div></div></div>;
}
function Quick({icon:Icon,title,desc,onClick}:{icon:LucideIcon,title:string,desc:string,onClick:()=>void}){return <button className="quick-card" onClick={onClick}><div><Icon size={19}/></div><b>{title}</b><small>{desc}</small><ChevronLeft size={15}/></button>}
function Field({label,value,onChange,placeholder}:{label:string,value:string,onChange:(v:string)=>void,placeholder?:string}){return <label className="ab-field"><span>{label}</span><input value={value} placeholder={placeholder} onChange={e=>onChange(e.target.value)}/></label>}
function StorePanel({settings,setSettings,store,onStoreUpdate,clothingMode,setClothingMode,lowStockThreshold,setLowStockThreshold}:{settings:StoreSettings,setSettings:Dispatch<SetStateAction<StoreSettings>>,store:StoreRow|null,onStoreUpdate:(patch:Partial<StoreRow>)=>void,clothingMode?:boolean,setClothingMode?:(v:boolean)=>void,lowStockThreshold?:number,setLowStockThreshold?:(v:number)=>void}){
  const [bannerUploading, setBannerUploading] = useState(false);
  const [bannerNotice, setBannerNotice] = useState("");
  const [yalidineId, setYalidineId] = useState(store?.yalidine_api_id || "");
  const [yalidineToken, setYalidineToken] = useState(store?.yalidine_api_token || "");
  const [yalidineSaving, setYalidineSaving] = useState(false);
  const [yalidineMsg, setYalidineMsg] = useState("");
  const bannerInputRef = useRef<HTMLInputElement>(null);
  const pro = isStorePro(store || {});


  const saveYalidine = async () => {
    if (!store) return;
    setYalidineSaving(true);
    setYalidineMsg("");
    try {
      await saveYalidineSettings(store.id, {
        yalidine_api_id: yalidineId,
        yalidine_api_token: yalidineToken,
        shipping_enabled: true,
      });
      onStoreUpdate({
        yalidine_api_id: yalidineId.trim() || null,
        yalidine_api_token: yalidineToken.trim() || null,
        shipping_enabled: true,
        preferred_carrier: "yalidine",
      } as any);
      setYalidineMsg("تم حفظ ربط ياليدين — يمكنك الشحن من الطلبات");
    } catch (e: any) {
      setYalidineMsg("فشل الحفظ: " + (e?.message || e));
    } finally {
      setYalidineSaving(false);
      setTimeout(() => setYalidineMsg(""), 4000);
    }
  };

  const yalidineBox = (
    <div className="panel large" style={{ marginTop: 16 }}>
      <div className="panel-head">
        <div>
          <span className="ab-kicker">SHIPPING</span>
          <h3>ربط ياليدين</h3>
          <p>ضع مفاتيح حسابك من yalidine.app ثم احفظ. بعدها زر الشحن في الطلبات يرسل الطرد مباشرة.</p>
        </div>
      </div>
      <div className="form-grid">
        <label className="ab-field">
          <span>API ID</span>
          <input
            value={yalidineId}
            onChange={(e) => setYalidineId(e.target.value)}
            placeholder="من لوحة ياليدين"
            autoComplete="off"
            dir="ltr"
          />
        </label>
        <label className="ab-field">
          <span>API Token</span>
          <input
            type="password"
            value={yalidineToken}
            onChange={(e) => setYalidineToken(e.target.value)}
            placeholder="••••••••"
            autoComplete="off"
            dir="ltr"
          />
        </label>
      </div>
      <div style={{ marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <button type="button" className="primary-btn" disabled={yalidineSaving || !store} onClick={saveYalidine}>
          {yalidineSaving ? "...جاري الحفظ" : "حفظ الربط"}
        </button>
        {store?.yalidine_api_id ? (
          <span style={{ fontSize: 13, color: "#86efac" }}>✓ مربوط ({String(store.yalidine_api_id).slice(0, 8)}…)</span>
        ) : (
          <span style={{ fontSize: 13, opacity: 0.7 }}>غير مربوط بعد</span>
        )}
      </div>
      {yalidineMsg && <p style={{ marginTop: 10, fontSize: 13 }}>{yalidineMsg}</p>}
    </div>
  );


  const clothingBox = (
    <div className="panel" style={{marginTop:16}} id="clothing-mode-box">
      <div className="panel-head"><div><span className="ab-kicker">STOCK & FASHION</span><h3>المخزون والملابس/الأحذية</h3>
      <p>فعّل إن كان متجرك للملابس أو الأحذية لإظهار اللون والمقاس والقياس.</p></div></div>
      <div className="form-grid">
        <label className="ab-field">
          <span>متجر ملابس / أحذية</span>
          <select
            value={clothingMode ? "1" : "0"}
            onChange={(e) => setClothingMode?.(e.target.value === "1")}
            style={{width:"100%",padding:10,borderRadius:10}}
          >
            <option value="0">لا — متجر عام (مخزون بسيط)</option>
            <option value="1">نعم — تفعيل اللون / Pointure / Taille</option>
          </select>
        </label>
        <label className="ab-field">
          <span>تنبيه قبل نفاد المخزون (عند بلوغ)</span>
          <input
            type="number"
            min={0}
            value={lowStockThreshold ?? 5}
            onChange={(e) => setLowStockThreshold?.(Number(e.target.value) || 0)}
          />
        </label>
      </div>
      <p style={{fontSize:13,opacity:0.75,marginTop:8}}>
        {clothingMode
          ? "أضف المتغيرات من تعديل المنتج (لون، مقاس، قياس، كمية لكل سطر)."
          : "فعّل «تتبع المخزون» على كل منتج وأدخل الكمية. عند 0 تظهر شارة نفد."}
      </p>
    </div>
  );


  const handleBannerFile = async (file: File) => {
    if (!store) return;
    setBannerUploading(true);
    try {
      const user = await getSessionUser();
      if (!user) throw new Error("سجّل الدخول");
      const url = await uploadMerchantLogo(user.id, file);
      await saveMerchantBanner(store.id, { merchantLogoUrl: url, hidePlatformBrand: true });
      onStoreUpdate({ merchant_logo_url: url, hide_platform_brand: true });
      setBannerNotice("تم تفعيل بانرك الخاص — يظهر الآن بدل شعار المنصة في متجرك");
    } catch (e: any) {
      setBannerNotice("فشل رفع البانر: " + (e?.message || e));
    } finally {
      setBannerUploading(false);
      setTimeout(() => setBannerNotice(""), 3500);
    }
  };

  const revertToPlatformBrand = async () => {
    if (!store) return;
    setBannerUploading(true);
    try {
      await saveMerchantBanner(store.id, { hidePlatformBrand: false });
      onStoreUpdate({ hide_platform_brand: false });
      setBannerNotice("رجعنا لعرض شعار AB Store Noor");
    } catch (e: any) {
      setBannerNotice("فشل الحفظ: " + (e?.message || e));
    } finally {
      setBannerUploading(false);
      setTimeout(() => setBannerNotice(""), 3500);
    }
  };

  return <div className="ab-content">
    <div className="panel large">
      <div className="panel-head"><div><span className="ab-kicker">STORE IDENTITY</span><h3>هوية المتجر والتواصل</h3><p>هذه البيانات هي المصدر الذي تعتمد عليه واجهة المتجر.</p></div><div className="live-badge"><i/> متصل</div></div>
      <div className="form-grid"><Field label="اسم المتجر" value={settings.name} onChange={v=>setSettings(s=>({...s,name:v}))}/><Field label="رقم واتساب" value={settings.whatsapp} onChange={v=>setSettings(s=>({...s,whatsapp:v}))} placeholder="2135XXXXXXXX"/><Field label="شريط الإعلان" value={settings.announcement} onChange={v=>setSettings(s=>({...s,announcement:v}))}/></div>
      <div className="info-box"><MessageCircle size={18}/><div><b>رقم واتساب</b><p>اكتب الرقم بصيغة دولية بدون + أو مسافات. سيُستخدم في أزرار الطلب والتواصل.</p></div></div>
    </div>

    <div className="panel large" style={{ marginTop: 16 }}>
      <div className="panel-head"><div><span className="ab-kicker">BRANDING · PRO</span><h3>بانر متجرك الخاص</h3><p>يظهر بدل شعار AB Store Noor في أعلى متجرك أمام عملائك.</p></div></div>

      {!pro && (
        <div className="info-box">
          <Store size={18}/>
          <div><b>ميزة حصرية لخطة Pro</b><p>رقِّ متجرك لتتمكّن من رفع بانر باسم متجرك الخاص، بدل شعار المنصة. استخدم زر "ترقية Pro" أعلى الصفحة.</p></div>
        </div>
      )}

      {pro && (
        <>
          <div className="banner-preview-row">
            <img
              src={store?.hide_platform_brand && store?.merchant_logo_url ? store.merchant_logo_url : "/logo-ab.png"}
              alt="معاينة البانر"
              className="banner-preview-img"
            />
            <div>
              <b>{store?.hide_platform_brand ? "بانرك الخاص مفعّل الآن" : "شعار المنصة ظاهر حالياً"}</b>
              <p>{store?.hide_platform_brand ? "عملاؤك يرون هذا البانر بدل شعار AB Store Noor." : "ارفع صورة لتفعيل بانرك الخاص."}</p>
            </div>
          </div>
          <div className="banner-actions">
            <button type="button" className="primary-btn" disabled={bannerUploading} onClick={() => bannerInputRef.current?.click()}>
              <Upload size={16}/> {bannerUploading ? "...جاري الرفع" : "رفع/تغيير البانر"}
            </button>
            <input ref={bannerInputRef} type="file" accept="image/*" hidden onChange={e => e.target.files?.[0] && handleBannerFile(e.target.files[0])} />
            {store?.hide_platform_brand && (
              <button type="button" className="ghost-btn" disabled={bannerUploading} onClick={revertToPlatformBrand}>الرجوع لشعار المنصة</button>
            )}
          </div>
          {bannerNotice && <p className="banner-notice">{bannerNotice}</p>}
        </>
      )}
      <style>{`
        .banner-preview-row{display:flex;align-items:center;gap:14px;padding:12px 0}
        .banner-preview-img{height:44px;max-width:180px;object-fit:contain;border-radius:8px;background:rgba(255,255,255,.04);padding:4px}
        .banner-actions{display:flex;gap:10px;flex-wrap:wrap;margin-top:6px}
        .banner-notice{margin-top:10px;font-size:13px;opacity:.85}
      `}</style>
    </div>

    {yalidineBox}
    {clothingBox}
    <DeliveryPanel store={store} onStoreUpdate={onStoreUpdate} />
  </div>;
}

function DeliveryPanel({store,onStoreUpdate}:{store:StoreRow|null,onStoreUpdate:(patch:Partial<StoreRow>)=>void}){
  const [mode, setMode] = useState<"national"|"local_flat">(store?.delivery_mode || "national");
  const [price, setPrice] = useState(String(store?.local_delivery_price ?? 0));
  const [freeOver, setFreeOver] = useState(store?.local_delivery_free_over != null ? String(store.local_delivery_free_over) : "");
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");

  const save = async () => {
    if (!store) return;
    setSaving(true);
    try {
      const opts = {
        mode,
        price: Number(price) || 0,
        freeOver: freeOver.trim() ? Number(freeOver) : null,
      };
      await saveDeliverySettings(store.id, opts);
      onStoreUpdate({ delivery_mode: opts.mode, local_delivery_price: opts.price, local_delivery_free_over: opts.freeOver });
      setNotice("تم حفظ إعدادات التوصيل");
    } catch (e: any) {
      setNotice("فشل الحفظ: " + (e?.message || e));
    } finally {
      setSaving(false);
      setTimeout(() => setNotice(""), 3000);
    }
  };

  return <div className="panel large" style={{ marginTop: 16 }}>
    <div className="panel-head"><div><span className="ab-kicker">DELIVERY</span><h3>نوع التوصيل</h3><p>اختر ما يناسب نشاطك: توصيل وطني بين الولايات، أو توصيل محلي بسعر ثابت (مناسب للمطاعم ومحلات الحلويات).</p></div></div>

    <div className="delivery-seg">
      <button type="button" className={mode === "national" ? "on" : ""} onClick={() => setMode("national")}>
        <b>توصيل وطني</b><small>جدول أسعار الـ58 ولاية الحالي</small>
      </button>
      <button type="button" className={mode === "local_flat" ? "on" : ""} onClick={() => setMode("local_flat")}>
        <b>توصيل محلي بسعر ثابت</b><small>لمطعمك أو محل الحلويات — بلدية/وسط المدينة فقط</small>
      </button>
    </div>

    {mode === "local_flat" && (
      <div className="form-grid" style={{ marginTop: 14 }}>
        <Field label="سعر التوصيل المحلي (دج)" value={price} onChange={setPrice} placeholder="200" />
        <Field label="توصيل مجاني فوق (دج) — اختياري" value={freeOver} onChange={setFreeOver} placeholder="مثلاً 3000" />
      </div>
    )}

    <button type="button" className="primary-btn" style={{ marginTop: 14 }} disabled={saving} onClick={save}>
      <Save size={16}/> {saving ? "...جاري الحفظ" : "حفظ إعدادات التوصيل"}
    </button>
    {notice && <p className="banner-notice">{notice}</p>}

    <style>{`
      .delivery-seg{display:grid;grid-template-columns:1fr 1fr;gap:10px}
      .delivery-seg button{text-align:start;border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.03);border-radius:14px;padding:14px;cursor:pointer;color:inherit}
      .delivery-seg button b{display:block;font-size:.92rem}
      .delivery-seg button small{display:block;opacity:.65;font-size:.78rem;margin-top:4px}
      .delivery-seg button.on{border-color:#25D366;background:rgba(37,211,102,.1)}
      @media(max-width:560px){.delivery-seg{grid-template-columns:1fr}}
    `}</style>
  </div>;
}
function ProductsPanel({products,onEdit,onDelete,onAdd,lowStockThreshold=5}:{products:Product[],onEdit:(p:Product)=>void,onDelete:(id:string)=>void,onAdd:()=>void,lowStockThreshold?:number}){return <div className="ab-content"><div className="panel large"><div className="panel-head"><div><span className="ab-kicker">CATALOG</span><h3>المنتجات والأسعار</h3><p>إضافة، تعديل، حذف، مخزون، وسعر المنتج.</p></div><button className="primary-btn" onClick={onAdd}><Plus size={17}/> إضافة منتج</button></div><div className="product-table">{products.map(p=>{const st=p.trackStock?Number(p.stock??0):null;const low=st!==null&&st>0&&st<=lowStockThreshold;const empty=st===0;return <div className="product-row" key={p.id}><img src={p.image} alt=""/><div className="product-name"><b>{p.name}</b><small>{p.category}</small>{empty&&<span className="stock-badge out">نفد</span>}{low&&!empty&&<span className="stock-badge low">بقي {st}</span>}</div><div className="product-price"><b>{p.price.toLocaleString("ar-DZ")} دج</b>{p.oldPrice ? <del>{p.oldPrice.toLocaleString("ar-DZ")} دج</del> : <small>بدون سعر قديم</small>}{p.trackStock&&<small style={{display:"block",opacity:.8}}>مخزون: {st ?? "—"}</small>}</div><span className="badge">{p.badge}</span><div className="row-actions"><button onClick={()=>onEdit(p)} aria-label="تعديل"><Pencil size={16}/></button><button onClick={()=>onDelete(p.id)} aria-label="حذف" className="danger"><Trash2 size={16}/></button></div></div>})}</div></div></div>}
function MediaPanel({products,onUpload}:{products:Product[],onUpload:(file:File,id:number)=>void}){return <div className="ab-content"><div className="panel large"><div className="panel-head"><div><span className="ab-kicker">MEDIA LIBRARY</span><h3>صور المنتجات</h3><p>ارفع صورة جديدة لأي منتج وستظهر مباشرة في المعاينة.</p></div></div><div className="media-grid">{products.map(p=><div className="media-card" key={p.id}><div className="media-preview"><img src={p.image} alt={p.name}/><label><Upload size={16}/> تغيير الصورة<input type="file" accept="image/*" onChange={e=>e.target.files?.[0]&&onUpload(e.target.files[0],p.id)}/></label></div><b>{p.name}</b><small>{p.category}</small></div>)}</div></div></div>}
function HomepagePanel({settings,setSettings}:{settings:StoreSettings,setSettings:Dispatch<SetStateAction<StoreSettings>>}){return <div className="ab-content"><div className="panel large"><div className="panel-head"><div><span className="ab-kicker">HOMEPAGE COPY</span><h3>نصوص الواجهة الرئيسية</h3><p>غيّر العنوان الرئيسي، الوصف وشريط الإعلان دون تعديل ملفات الصفحة.</p></div></div><div className="form-grid"><Field label="العنوان الكبير" value={settings.heroTitle} onChange={v=>setSettings(s=>({...s,heroTitle:v}))}/><Field label="الجزء المميز" value={settings.heroEmphasis} onChange={v=>setSettings(s=>({...s,heroEmphasis:v}))}/><label className="ab-field full"><span>وصف البطل Hero</span><textarea value={settings.heroDescription} onChange={e=>setSettings(s=>({...s,heroDescription:e.target.value}))}/></label><Field label="عنوان التواصل" value={settings.contactTitle} onChange={v=>setSettings(s=>({...s,contactTitle:v}))}/><Field label="الجزء المميز للتواصل" value={settings.contactEmphasis} onChange={v=>setSettings(s=>({...s,contactEmphasis:v}))}/></div></div></div>}
function ChannelsPanel({settings,setSettings,channels,setChannels}:{settings:StoreSettings,setSettings:Dispatch<SetStateAction<StoreSettings>>;channels:ChannelState;setChannels:Dispatch<SetStateAction<ChannelState>>}){const items=[['WhatsApp','طلبات ورسائل العملاء',MessageCircle],['Facebook','صفحة المتجر والتفاعل',Users],['Instagram','الرسائل والمحتوى',Smartphone],['Messenger','محادثات الصفحة',MessageCircle],['Telegram','طلبات ومحادثات',Smartphone]] as const;return <div className="ab-content"><div className="panel large"><div className="panel-head"><div><span className="ab-kicker">CHANNELS</span><h3>قنوات التواصل</h3><p>فعّل أو عطّل القنوات من هنا. الحالة تحفظ مع إعدادات المتجر.</p></div></div><div className="channels-list">{items.map(([name,desc,Icon])=>{const on=Boolean(channels[name]);return <div className="channel-row" key={name}><div className="channel-icon"><Icon size={19}/></div><div><b>{name}</b><small>{desc}</small></div><span className={`channel-status ${on?'on':''}`}>{on?'مفعّل':'متوقف'}</span><button className={`switch ${on?'is-on':''}`} aria-pressed={on} aria-label={`${on?'تعطيل':'تفعيل'} ${name}`} onClick={()=>setChannels(prev=>({...prev,[name]:!prev[name]}))}><i/></button></div>})}</div><div className="info-box"><Zap size={18}/><div><b>مهم للإنتاج</b><p>التبديل هنا يغيّر حالة الواجهة محلياً. عند ربط API/Meta/WhatsApp لاحقاً، تُستخدم هذه الحالة مع بيانات الاتصال الحقيقية.</p></div></div><div className="form-grid one"><Field label="رقم واتساب الحالي" value={settings.whatsapp} onChange={v=>setSettings(s=>({...s,whatsapp:v}))}/></div></div></div>}
function SettingsPanel(){return <div className="ab-content"><div className="panel large"><div className="panel-head"><div><span className="ab-kicker">SYSTEM</span><h3>إعدادات المتجر</h3><p>إعدادات عامة للوحة التحكم.</p></div></div><div className="settings-list"><div><b>حفظ محلي</b><span>التغييرات تحفظ في المتصفح حالياً.</span><Check size={17}/></div><div><b>واجهة RTL</b><span>دعم كامل للغة العربية واتجاه RTL.</span><Check size={17}/></div><div><b>Responsive</b><span>اللوحة تعمل على الهاتف والكمبيوتر.</span><Check size={17}/></div></div></div></div>}
function ProductModal({product,onChange,onClose,onSave,onUpload,uploadRef,uploading}:{product:Product,onChange:(p:Partial<Product>)=>void,onClose:()=>void,onSave:()=>void,onUpload:(f:File)=>void,uploadRef:RefObject<HTMLInputElement|null>,uploading?:boolean}){return <div className="modal-backdrop"><div className="product-modal"><div className="modal-head"><div><span className="ab-kicker">PRODUCT EDITOR</span><h3>تعديل المنتج</h3></div><button onClick={onClose}><X size={18}/></button></div><div className="modal-body"><div className="modal-image"><img src={product.image} alt=""/><button disabled={uploading} onClick={()=>uploadRef.current?.click()}><Upload size={15}/> {uploading ? "...جاري الرفع" : "تغيير الصورة"}</button><input ref={uploadRef} type="file" accept="image/*" hidden onChange={e=>e.target.files?.[0]&&onUpload(e.target.files[0])}/></div><div className="modal-fields"><Field label="اسم المنتج" value={product.name} onChange={v=>onChange({name:v})}/><Field label="التصنيف" value={product.category} onChange={v=>onChange({category:v})}/><Field label="السعر الحالي (دج)" value={String(product.price)} onChange={v=>onChange({price:Number(v)||0})}/><Field label="السعر القديم (اختياري)" value={product.oldPrice ? String(product.oldPrice) : ""} onChange={v=>onChange({oldPrice:v?Number(v):null})}/><Field label="الشارة" value={product.badge} onChange={v=>onChange({badge:v})}/><label className="ab-field"><span>تتبع المخزون</span><select value={product.trackStock?"1":"0"} onChange={e=>onChange({trackStock:e.target.value==="1", stock: e.target.value==="1" ? (product.stock ?? 0) : null})} style={{width:"100%",padding:"10px",borderRadius:10}}><option value="0">لا</option><option value="1">نعم</option></select></label>{product.trackStock && <Field label="الكمية المتبقية" value={String(product.stock ?? 0)} onChange={v=>onChange({stock:Number(v)||0})}/>}<label className="ab-field full"><span>الوصف</span><textarea value={product.description} onChange={e=>onChange({description:e.target.value})}/></label>{/* variants editor when clothing mode — basic lines */}{product.variants && product.variants.length>0 && <div className="ab-field full"><span>المتغيرات (لون / مقاس / قياس)</span><ul style={{fontSize:13,margin:0,paddingRight:18}}>{product.variants.map((v,i)=><li key={i}>{(v.color||"—")+" · "+(v.pointure||"—")+" · "+(v.taille||"—")+" · مخزون "+v.stock}</li>)}</ul></div>}</div></div><div className="modal-footer"><button className="ghost-btn" onClick={onClose}>إلغاء</button><button className="save-btn" onClick={onSave}><Save size={16}/> حفظ المنتج</button></div></div></div>}


/* Stock badges for catalog */
