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
  saveChannels,
  saveStoreSettings,
  signIn,
  signOut,
  signUp,
  storeToSettings,
  uploadProductImage,
  type StoreRow,
} from "@/lib/storeData";

import heroHeadphones from "@/assets/hero-headphones.jpg";
import productCharger from "@/assets/product-charger.jpg";
import productEarbuds from "@/assets/product-earbuds.jpg";
import productWatch from "@/assets/product-watch.jpg";

export const Route = createFileRoute("/dashboard")({ component: Dashboard });

type Product = { id: string; name: string; category: string; price: number; oldPrice?: number | null; badge: string; image: string; description: string };
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
  const [loading, setLoading] = useState(true);
  const [authMode, setAuthMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [authBusy, setAuthBusy] = useState(false);

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
      if (authMode === "login") await signIn(email.trim(), password);
      else await signUp(email.trim(), password);
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
        <form onSubmit={handleAuth} className="w-full max-w-md rounded-2xl border border-white/10 bg-white/5 p-6 space-y-4">
          <div>
            <p className="text-xs opacity-70">AB STORE · CONTROL CENTER</p>
            <h1 className="text-2xl font-black mt-1">{authMode === "login" ? "تسجيل الدخول" : "إنشاء حساب تاجر"}</h1>
          </div>
          <label className="block text-sm">البريد
            <input className="mt-1 w-full rounded-xl bg-black/30 border border-white/10 px-3 py-2" type="email" required value={email} onChange={e => setEmail(e.target.value)} />
          </label>
          <label className="block text-sm">كلمة المرور
            <input className="mt-1 w-full rounded-xl bg-black/30 border border-white/10 px-3 py-2" type="password" required minLength={6} value={password} onChange={e => setPassword(e.target.value)} />
          </label>
          {authError && <p className="text-sm text-red-400">{authError}</p>}
          <button disabled={authBusy} className="w-full rounded-xl bg-sky-500 text-white font-bold py-2.5">{authBusy ? "…" : authMode === "login" ? "دخول" : "تسجيل"}</button>
          <button type="button" className="w-full text-sm opacity-80" onClick={() => setAuthMode(m => m === "login" ? "signup" : "login")}>
            {authMode === "login" ? "ليس لديك حساب؟ سجّل" : "لديك حساب؟ ادخل"}
          </button>
        </form>
      </main>
    );
  }

  return (
    <main dir="rtl" className="ab-dashboard">
      <aside className="ab-sidebar">
        <a className="ab-logo" href="/" title="فتح المتجر"><img src="/logo-ab.png" alt="AB Store Noor" className="ab-logo-img" /><div><b>AB STORE</b><small>لوحة التحكم</small></div></a>
        <div className="ab-store-pill"><span className="online-dot"/><div><b>{settings.name}</b><small>المتجر متصل</small></div><ChevronLeft size={15}/></div>
        <nav>
          <NavItem icon={LayoutDashboard} label="نظرة عامة" active={tab === "overview"} onClick={() => setTab("overview")} />
          <NavItem icon={Store} label="بيانات المتجر" active={tab === "store"} onClick={() => setTab("store")} />
          <NavItem icon={Package} label="المنتجات والأسعار" active={tab === "products"} onClick={() => setTab("products")} />
          <NavItem icon={ImageIcon} label="صور المنتجات" active={tab === "media"} onClick={() => setTab("media")} />
          <NavItem icon={Pencil} label="نصوص الواجهة" active={tab === "homepage"} onClick={() => setTab("homepage")} />
          <NavItem icon={Zap} label="قنوات التواصل" active={tab === "channels"} onClick={() => setTab("channels")} />
        </nav>
        <div className="ab-sidebar-bottom"><NavItem icon={Settings2} label="إعدادات" active={tab === "settings"} onClick={() => setTab("settings")} /><NavItem icon={CircleHelp} label="المساعدة" active={false} onClick={() => setNotice("مركز المساعدة قيد الربط")} /></div>
      </aside>

      <section className="ab-main">
        <header className="ab-topbar"><div><span className="ab-kicker">CONTROL CENTER</span><h1>{tabTitle(tab)}</h1></div><div className="ab-actions"><button className="icon-btn"><Bell size={18}/><i/></button><button className="preview-btn" onClick={() => window.open("/", "_blank")}><Eye size={17}/> معاينة المتجر <ExternalLink size={14}/></button><a className="store-link-btn" href="/"><Store size={16}/> زيارة المتجر</a><button className="save-btn" onClick={saveAll}>{saved ? <Check size={17}/> : <Save size={17}/>} {saved ? "تم الحفظ" : "حفظ التغييرات"}</button>
          <button className="preview-btn" type="button" onClick={async () => { await signOut(); setUserEmail(null); setStore(null); }}>خروج</button>
        </div></header>
        <div style={{padding:"6px 18px",fontSize:12,opacity:.75}}>حساب: {userEmail}{store ? ` · ${store.name} (${store.slug})` : ""}</div>

        {notice && <div className="ab-toast"><Check size={16}/> {notice}</div>}

        {tab === "overview" && <Overview stats={stats} setTab={setTab} />}
        {tab === "store" && <StorePanel settings={settings} setSettings={setSettings} />}
        {tab === "products" && <ProductsPanel products={products} onEdit={setEditing} onDelete={deleteProduct} onAdd={addProduct} />}
        {tab === "media" && <MediaPanel products={products} onUpload={uploadImage} />}
        {tab === "homepage" && <HomepagePanel settings={settings} setSettings={setSettings} />}
        {tab === "channels" && <ChannelsPanel settings={settings} setSettings={setSettings} channels={channels} setChannels={setChannels} />}
        {tab === "settings" && <SettingsPanel />}

        <footer className="ab-footer"><span>AB Store Control • متصل بـ Supabase</span><span>آخر حفظ: <b>{saved ? "الآن" : "غير محدد"}</b></span></footer>
      </section>

      {editing && <ProductModal product={editing} onChange={updateProduct} onClose={() => setEditing(null)} onSave={commitProduct} uploadRef={uploadRef} onUpload={(file) => { const r = new FileReader(); r.onload = () => updateProduct({ image: String(r.result) }); r.readAsDataURL(file); }} />}
    </main>
  );
}

function tabTitle(tab: string) { return ({ overview: "نظرة عامة", store: "بيانات المتجر", products: "المنتجات والأسعار", media: "مكتبة الصور", homepage: "نصوص الواجهة الرئيسية", channels: "قنوات التواصل", settings: "الإعدادات" } as Record<string,string>)[tab] || "لوحة التحكم"; }
function NavItem({ icon: Icon, label, active, onClick }: { icon: LucideIcon; label: string; active: boolean; onClick: () => void }) { return <button className={`ab-nav-item ${active ? "active" : ""}`} onClick={onClick}><Icon size={18}/><span>{label}</span>{active && <i/>}</button>; }

function Overview({ stats, setTab }: { stats: readonly [string,string,string,LucideIcon][]; setTab: (v:string)=>void }) {
  return <div className="ab-content"><div className="welcome-card"><div><span>مرحباً بك 👋</span><h2>تحكم كامل في متجرك من مكان واحد.</h2><p>عدّل بيانات التواصل، المنتجات، الأسعار، الصور ونصوص الواجهة ثم احفظها لتظهر في صفحة المتجر.</p><div className="welcome-actions"><button className="primary-btn" onClick={() => window.open("/", "_blank")}><Eye size={16}/> افتح صفحة المتجر</button><button className="secondary-btn" onClick={() => setTab("products")}><Package size={16}/> إدارة المنتجات</button></div></div><div className="welcome-orb"><Store size={42}/></div></div><div className="stats-grid">{stats.map(([label,value,trend,Icon])=><div className="stat-card" key={label}><div className="stat-icon"><Icon size={19}/></div><span>{label}</span><strong>{value}</strong><small>{trend}</small></div>)}</div><div className="two-col"><div className="panel"><div className="panel-head"><div><span className="ab-kicker">QUICK ACTIONS</span><h3>إدارة سريعة</h3></div></div><div className="quick-grid"><Quick icon={Store} title="بيانات المتجر" desc="الاسم + واتساب" onClick={()=>setTab("store")}/><Quick icon={Package} title="المنتجات" desc="إضافة وتعديل وحذف" onClick={()=>setTab("products")}/><Quick icon={ImageIcon} title="الصور" desc="تغيير صور المنتجات" onClick={()=>setTab("media")}/><Quick icon={Pencil} title="الواجهة" desc="العنوان والنصوص" onClick={()=>setTab("homepage")}/></div></div><div className="panel performance"><div className="panel-head"><div><span className="ab-kicker">STORE ACTIVITY</span><h3>نشاط المتجر</h3></div><BarChart3 size={20}/></div><div className="fake-chart"><span style={{height:"35%"}}/><span style={{height:"58%"}}/><span style={{height:"46%"}}/><span style={{height:"72%"}}/><span style={{height:"61%"}}/><span style={{height:"88%"}}/><span style={{height:"76%"}}/></div><div className="chart-labels"><span>السبت</span><span>الأحد</span><span>الإثنين</span><span>الثلاثاء</span><span>الأربعاء</span><span>الخميس</span><span>اليوم</span></div></div></div></div>;
}
function Quick({icon:Icon,title,desc,onClick}:{icon:LucideIcon,title:string,desc:string,onClick:()=>void}){return <button className="quick-card" onClick={onClick}><div><Icon size={19}/></div><b>{title}</b><small>{desc}</small><ChevronLeft size={15}/></button>}
function Field({label,value,onChange,placeholder}:{label:string,value:string,onChange:(v:string)=>void,placeholder?:string}){return <label className="ab-field"><span>{label}</span><input value={value} placeholder={placeholder} onChange={e=>onChange(e.target.value)}/></label>}
function StorePanel({settings,setSettings}:{settings:StoreSettings,setSettings:Dispatch<SetStateAction<StoreSettings>>}){return <div className="ab-content"><div className="panel large"><div className="panel-head"><div><span className="ab-kicker">STORE IDENTITY</span><h3>هوية المتجر والتواصل</h3><p>هذه البيانات هي المصدر الذي تعتمد عليه واجهة المتجر.</p></div><div className="live-badge"><i/> متصل</div></div><div className="form-grid"><Field label="اسم المتجر" value={settings.name} onChange={v=>setSettings(s=>({...s,name:v}))}/><Field label="رقم واتساب" value={settings.whatsapp} onChange={v=>setSettings(s=>({...s,whatsapp:v}))} placeholder="2135XXXXXXXX"/><Field label="شريط الإعلان" value={settings.announcement} onChange={v=>setSettings(s=>({...s,announcement:v}))}/></div><div className="info-box"><MessageCircle size={18}/><div><b>رقم واتساب</b><p>اكتب الرقم بصيغة دولية بدون + أو مسافات. سيُستخدم في أزرار الطلب والتواصل.</p></div></div></div></div>}
function ProductsPanel({products,onEdit,onDelete,onAdd}:{products:Product[],onEdit:(p:Product)=>void,onDelete:(id:number)=>void,onAdd:()=>void}){return <div className="ab-content"><div className="panel large"><div className="panel-head"><div><span className="ab-kicker">CATALOG</span><h3>المنتجات والأسعار</h3><p>إضافة، تعديل، حذف، سعر حالي وسعر قديم وشارة المنتج.</p></div><button className="primary-btn" onClick={onAdd}><Plus size={17}/> إضافة منتج</button></div><div className="product-table">{products.map(p=><div className="product-row" key={p.id}><img src={p.image} alt=""/><div className="product-name"><b>{p.name}</b><small>{p.category}</small></div><div className="product-price"><b>{p.price.toLocaleString("ar-DZ")} دج</b>{p.oldPrice ? <del>{p.oldPrice.toLocaleString("ar-DZ")} دج</del> : <small>بدون سعر قديم</small>}</div><span className="badge">{p.badge}</span><div className="row-actions"><button onClick={()=>onEdit(p)} aria-label="تعديل"><Pencil size={16}/></button><button onClick={()=>onDelete(p.id)} aria-label="حذف" className="danger"><Trash2 size={16}/></button></div></div>)}</div></div></div>}
function MediaPanel({products,onUpload}:{products:Product[],onUpload:(file:File,id:number)=>void}){return <div className="ab-content"><div className="panel large"><div className="panel-head"><div><span className="ab-kicker">MEDIA LIBRARY</span><h3>صور المنتجات</h3><p>ارفع صورة جديدة لأي منتج وستظهر مباشرة في المعاينة.</p></div></div><div className="media-grid">{products.map(p=><div className="media-card" key={p.id}><div className="media-preview"><img src={p.image} alt={p.name}/><label><Upload size={16}/> تغيير الصورة<input type="file" accept="image/*" onChange={e=>e.target.files?.[0]&&onUpload(e.target.files[0],p.id)}/></label></div><b>{p.name}</b><small>{p.category}</small></div>)}</div></div></div>}
function HomepagePanel({settings,setSettings}:{settings:StoreSettings,setSettings:Dispatch<SetStateAction<StoreSettings>>}){return <div className="ab-content"><div className="panel large"><div className="panel-head"><div><span className="ab-kicker">HOMEPAGE COPY</span><h3>نصوص الواجهة الرئيسية</h3><p>غيّر العنوان الرئيسي، الوصف وشريط الإعلان دون تعديل ملفات الصفحة.</p></div></div><div className="form-grid"><Field label="العنوان الكبير" value={settings.heroTitle} onChange={v=>setSettings(s=>({...s,heroTitle:v}))}/><Field label="الجزء المميز" value={settings.heroEmphasis} onChange={v=>setSettings(s=>({...s,heroEmphasis:v}))}/><label className="ab-field full"><span>وصف البطل Hero</span><textarea value={settings.heroDescription} onChange={e=>setSettings(s=>({...s,heroDescription:e.target.value}))}/></label><Field label="عنوان التواصل" value={settings.contactTitle} onChange={v=>setSettings(s=>({...s,contactTitle:v}))}/><Field label="الجزء المميز للتواصل" value={settings.contactEmphasis} onChange={v=>setSettings(s=>({...s,contactEmphasis:v}))}/></div></div></div>}
function ChannelsPanel({settings,setSettings,channels,setChannels}:{settings:StoreSettings,setSettings:Dispatch<SetStateAction<StoreSettings>>;channels:ChannelState;setChannels:Dispatch<SetStateAction<ChannelState>>}){const items=[['WhatsApp','طلبات ورسائل العملاء',MessageCircle],['Facebook','صفحة المتجر والتفاعل',Users],['Instagram','الرسائل والمحتوى',Smartphone],['Messenger','محادثات الصفحة',MessageCircle],['Telegram','طلبات ومحادثات',Smartphone]] as const;return <div className="ab-content"><div className="panel large"><div className="panel-head"><div><span className="ab-kicker">CHANNELS</span><h3>قنوات التواصل</h3><p>فعّل أو عطّل القنوات من هنا. الحالة تحفظ مع إعدادات المتجر.</p></div></div><div className="channels-list">{items.map(([name,desc,Icon])=>{const on=Boolean(channels[name]);return <div className="channel-row" key={name}><div className="channel-icon"><Icon size={19}/></div><div><b>{name}</b><small>{desc}</small></div><span className={`channel-status ${on?'on':''}`}>{on?'مفعّل':'متوقف'}</span><button className={`switch ${on?'is-on':''}`} aria-pressed={on} aria-label={`${on?'تعطيل':'تفعيل'} ${name}`} onClick={()=>setChannels(prev=>({...prev,[name]:!prev[name]}))}><i/></button></div>})}</div><div className="info-box"><Zap size={18}/><div><b>مهم للإنتاج</b><p>التبديل هنا يغيّر حالة الواجهة محلياً. عند ربط API/Meta/WhatsApp لاحقاً، تُستخدم هذه الحالة مع بيانات الاتصال الحقيقية.</p></div></div><div className="form-grid one"><Field label="رقم واتساب الحالي" value={settings.whatsapp} onChange={v=>setSettings(s=>({...s,whatsapp:v}))}/></div></div></div>}
function SettingsPanel(){return <div className="ab-content"><div className="panel large"><div className="panel-head"><div><span className="ab-kicker">SYSTEM</span><h3>إعدادات المتجر</h3><p>إعدادات عامة للوحة التحكم.</p></div></div><div className="settings-list"><div><b>حفظ محلي</b><span>التغييرات تحفظ في المتصفح حالياً.</span><Check size={17}/></div><div><b>واجهة RTL</b><span>دعم كامل للغة العربية واتجاه RTL.</span><Check size={17}/></div><div><b>Responsive</b><span>اللوحة تعمل على الهاتف والكمبيوتر.</span><Check size={17}/></div></div></div></div>}
function ProductModal({product,onChange,onClose,onSave,onUpload,uploadRef}:{product:Product,onChange:(p:Partial<Product>)=>void,onClose:()=>void,onSave:()=>void,onUpload:(f:File)=>void,uploadRef:RefObject<HTMLInputElement|null>}){return <div className="modal-backdrop"><div className="product-modal"><div className="modal-head"><div><span className="ab-kicker">PRODUCT EDITOR</span><h3>تعديل المنتج</h3></div><button onClick={onClose}><X size={18}/></button></div><div className="modal-body"><div className="modal-image"><img src={product.image} alt=""/><button onClick={()=>uploadRef.current?.click()}><Upload size={15}/> تغيير الصورة</button><input ref={uploadRef} type="file" accept="image/*" hidden onChange={e=>e.target.files?.[0]&&onUpload(e.target.files[0])}/></div><div className="modal-fields"><Field label="اسم المنتج" value={product.name} onChange={v=>onChange({name:v})}/><Field label="التصنيف" value={product.category} onChange={v=>onChange({category:v})}/><Field label="السعر الحالي (دج)" value={String(product.price)} onChange={v=>onChange({price:Number(v)||0})}/><Field label="السعر القديم (اختياري)" value={product.oldPrice ? String(product.oldPrice) : ""} onChange={v=>onChange({oldPrice:v?Number(v):null})}/><Field label="الشارة" value={product.badge} onChange={v=>onChange({badge:v})}/><label className="ab-field full"><span>الوصف</span><textarea value={product.description} onChange={e=>onChange({description:e.target.value})}/></label></div></div><div className="modal-footer"><button className="ghost-btn" onClick={onClose}>إلغاء</button><button className="save-btn" onClick={onSave}><Save size={16}/> حفظ المنتج</button></div></div></div>}
