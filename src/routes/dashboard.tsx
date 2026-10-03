import LanguageSwitcher from "../components/LanguageSwitcher";
import { getLanguage } from "../i18n";
import { dashboardTranslations } from "../i18n/dashboard";
import { createFileRoute } from "@tanstack/react-router";
import {
  BarChart3, Bell, Check, ChevronLeft, CircleHelp, ExternalLink, Eye, EyeOff, Image as ImageIcon, Mail,
  LayoutDashboard, Link2, MessageCircle, Package, Pencil, Plus, Save, Settings2, ShoppingBag,
  Smartphone, Store, Trash2, Upload, Users, X, Zap, Truck, ShieldCheck, CheckCircle2, AlertCircle, Unplug, type LucideIcon
} from "lucide-react";
import { useEffect, useMemo, useRef, useState, type Dispatch, type SetStateAction, type RefObject } from "react";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import {
  ensureStoreForUser,
  getSessionUser,
  loadChannels,
  loadSocialLinks,
  loadProducts,
  replaceProducts,
  saveClothingStockSettings,
  saveChannels,
  saveSocialLinks,
  saveDeliverySettings,
  saveMerchantBanner,
  saveStoreSettings,
  signIn,
  signInWithGoogle,
  signOut,
  signUp,
  resetPassword,
  storeToSettings,
  uploadMerchantLogo,
  uploadProductImage,
  type StoreRow,
} from "@/lib/storeData";
import { isStorePro, PRICING } from "@/lib/pricing";
import { SHIPPING_PROVIDERS, connectShippingProvider, disconnectShippingProvider, loadShippingConnections, type ShippingConnection, type ShippingProviderId } from "@/lib/shippingIntegrations";
import { initMetaPixel, trackMetaEvent } from "@/lib/metaPixel";
import { UpgradeModal } from "@/components/UpgradeModal";
import { SocialIcon } from "@/components/SocialIcon";
import { OrdersPanel } from "@/components/OrdersPanel";
import { setStoreOpen, saveWorkingHours } from "@/lib/storeData";

import heroHeadphones from "@/assets/hero-headphones.jpg";
import productCharger from "@/assets/product-charger.jpg";
import productEarbuds from "@/assets/product-earbuds.jpg";
import productWatch from "@/assets/product-watch.jpg";

export const Route = createFileRoute("/dashboard")({
  head: () => ({ meta: [
    { title: "لوحة التاجر | دزاير ستور" },
    { name: "description", content: "أدر متجرك ومنتجاتك وطلباتك في لوحة التاجر من دزاير ستور." },
    { property: "og:title", content: "لوحة التاجر | دزاير ستور" },
    { property: "og:description", content: "إدارة المتجر والمنتجات والطلبات من مكان واحد." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: Dashboard,
});

type Product = { id: string; name: string; category: string; price: number; oldPrice?: number | null; badge: string; image: string; description: string; stock?: number | null; trackStock?: boolean; variants?: { id?: string; color?: string | null; pointure?: string | null; taille?: string | null; stock: number }[] };
type StoreSettings = { name: string; whatsapp: string; announcement: string; heroTitle: string; heroEmphasis: string; heroDescription: string; contactTitle: string; contactEmphasis: string };
type ChannelState = Record<string, boolean>;

const defaults: StoreSettings = {
  name: "دزاير ستور", whatsapp: "213555000000", announcement: "توصيل مجاني للطلبات فوق 15,000 دج",
  heroTitle: "الصوت،", heroEmphasis: "كما يجب أن يُسمع.", heroDescription: "هندسة صوتية دقيقة. هدوء بلا حدود. تصميم صُنع ليبقى.",
  contactTitle: "نحن أقرب", contactEmphasis: "مما تتخيّل.",
};
const defaultChannels: ChannelState = { WhatsApp: true, Facebook: false, Instagram: false, Messenger: false, Telegram: false, TikTok: false };

const defaultProducts: Product[] = [
  { id: "1", name: "سماعات Noir Pro", category: "صوتيات", description: "عزل نشط للضوضاء وصوت مكاني بتفاصيل استثنائية.", price: 24900, oldPrice: 28900, badge: "اختيارنا", image: heroHeadphones },
  { id: "2", name: "سماعات Aero Buds", category: "صوتيات", description: "صوت نقي، راحة طوال اليوم، وعلبة شحن صغيرة.", price: 8900, oldPrice: 10500, badge: "الأكثر طلباً", image: productEarbuds },
  { id: "3", name: "ساعة Mono S1", category: "أجهزة ذكية", description: "شاشة فائقة الوضوح ومتابعة متقدمة لنشاطك اليومي.", price: 14500, oldPrice: null, badge: "جديد", image: productWatch },
  { id: "4", name: "شاحن Flux 65W", category: "إكسسوارات", description: "طاقة سريعة بحجم صغير مع كابل مضفّر متين.", price: 3900, oldPrice: 4700, badge: "عرض", image: productCharger },
];

function Dashboard() {
  const language = getLanguage();
  const t = dashboardTranslations[language];
  const [tab, setTab] = useState("overview");
  const [settings, setSettings] = useState(defaults);
  const [products, setProducts] = useState<Product[]>([]);
  const [channels, setChannels] = useState<ChannelState>(defaultChannels);
  const [socialLinks, setSocialLinks] = useState<Record<string, string>>({ Facebook: "", Instagram: "", Telegram: "", TikTok: "" });
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
  const [resetMode, setResetMode] = useState(false);
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
      const [prodsResult, channelsResult, socialResult] = await Promise.allSettled([
        loadProducts(st.id),
        loadChannels(st.id),
        loadSocialLinks(st.id),
      ]);

      if (prodsResult.status === "fulfilled") setProducts(prodsResult.value);
      else setNotice("تعذّر تحميل المنتجات: " + (prodsResult.reason?.message || prodsResult.reason || "خطأ غير معروف"));

      if (channelsResult.status === "fulfilled") setChannels({ ...defaultChannels, ...channelsResult.value });
      if (socialResult.status === "fulfilled") {
        setSocialLinks({ Facebook: "", Instagram: "", Telegram: "", TikTok: "", ...socialResult.value });
      } else {
        setSocialLinks({ Facebook: "", Instagram: "", Telegram: "", TikTok: "" });
        setNotice((prev) => prev || "قنوات التواصل تحتاج تشغيل SOCIAL_LINKS_MIGRATION_V2_7.sql مرة واحدة في Supabase.");
      }
      setAuthReady(true);
    } catch (e: any) {
      setAuthError(e?.message || String(e));
      setAuthReady(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    initMetaPixel();
    bootstrap();
    const { data: sub } = supabase.auth.onAuthStateChange(() => { bootstrap(); });
    return () => sub.subscription.unsubscribe();
  }, []);

  const saveAll = async () => {
    if (!store) { setNotice("يجب تسجيل الدخول أولاً"); return; }
    try {
      setNotice("جاري الحفظ…");
      const results = await Promise.allSettled([
        saveStoreSettings(store.id, settings),
        saveChannels(store.id, channels),
        saveSocialLinks(store.id, socialLinks),
        saveClothingStockSettings(store.id, { clothing_mode: clothingMode, low_stock_threshold: lowStockThreshold }),
        replaceProducts(store.id, products),
      ]);
      const failed = results.find((r) => r.status === "rejected") as PromiseRejectedResult | undefined;
      if (failed) {
        const message = failed.reason?.message || String(failed.reason || "خطأ غير معروف");
        setNotice("تم حفظ الأجزاء المتاحة، لكن هناك جزء يحتاج مراجعة: " + message);
        return;
      }
      setSaved(true);
      setNotice("تم حفظ ونشر التغييرات على المتجر");
      setTimeout(() => setSaved(false), 2200);
      setTimeout(() => setNotice(""), 2500);
    } catch (e: any) {
      setNotice("فشل الحفظ: " + (e?.message || e));
    }
  };

  const visitCount = Number(store?.visit_count ?? 0);
  const subscriptionPlan = store?.plan === "pro_shipping" ? "Pro Delivery" : store?.plan === "pro" ? "Pro" : "Free";
  const subscriptionExpiresAt = store?.plan_expires_at ? new Date(store.plan_expires_at) : null;
  const subscriptionDaysLeft = subscriptionExpiresAt ? Math.max(0, Math.ceil((subscriptionExpiresAt.getTime() - Date.now()) / 86400000)) : 0;
  const subscriptionActive = isStorePro(store || {});
  const stats = useMemo(() => [
    [language === "fr" ? "Produits" : "المنتجات", products.length.toString(), language === "fr" ? "Dans le catalogue" : "في الكتالوج", Package],
    [language === "fr" ? "Visiteurs de la boutique" : "زوار المتجر", visitCount.toLocaleString(language === "fr" ? "fr-DZ" : "ar-DZ"), language === "fr" ? "Total des visites" : "إجمالي الزيارات", Users],
    [language === "fr" ? "Forfait" : "الخطة", (store?.plan === "pro_shipping" ? "Pro Delivery" : store?.plan === "pro" ? "Pro" : language === "fr" ? "Gratuit" : "مجاني"), language === "fr" ? "Votre abonnement" : "اشتراكك", ShoppingBag],
    [language === "fr" ? "WhatsApp" : "واتساب", store?.whatsapp ? (language === "fr" ? "Connecté" : "مربوط") : "—", language === "fr" ? "Numéro de la boutique" : "رقم المتجر", MessageCircle],
  ] as const, [products.length, visitCount, store?.plan, store?.whatsapp]);

  const updateProduct = (patch: Partial<Product>) => setEditing(v => v ? { ...v, ...patch } : v);
  const addProduct = () => {
    if (!isStorePro(store || {}) && products.length >= PRICING.free.productsLimit) {
      setNotice(`الخطة المجانية تسمح بـ ${PRICING.free.productsLimit} منتجات. رقِّ إلى Pro لإضافة المزيد.`);
      setShowUpgrade(true);
      setTimeout(() => setNotice(""), 3200);
      return;
    }
    setEditing({ id: crypto.randomUUID(), name: "منتج جديد", category: "عام", description: "وصف المنتج", price: 0, oldPrice: null, badge: "جديد", image: productCharger });
  };
  const commitProduct = () => {
    if (!editing) return;
    setProducts(prev => prev.some(p => p.id === editing.id) ? prev.map(p => p.id === editing.id ? editing : p) : [...prev, editing]);
    setEditing(null); setNotice("تم تحديث المنتج (احفظ للنشر)"); setTimeout(() => setNotice(""), 1800);
  };
  const deleteProduct = (id: string) => setProducts(prev => prev.filter(p => p.id !== id));
  const [modalImageUploading, setModalImageUploading] = useState(false);
  const handleModalImageUpload = async (file: File) => {
    if (!file.type.startsWith("image/") || file.size > 5 * 1024 * 1024) {
      setNotice("الصورة يجب أن تكون من نوع صورة وحجمها أقل من 5MB");
      return;
    }
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
    if (!file.type.startsWith("image/") || file.size > 5 * 1024 * 1024) {
      setNotice("الصورة يجب أن تكون من نوع صورة وحجمها أقل من 5MB");
      return;
    }
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

  const handleGoogle = async () => {
    setAuthBusy(true);
    setAuthError("");
    try {
      await signInWithGoogle();
    } catch (err: any) {
      setAuthError(err?.message || String(err));
      setAuthBusy(false);
    }
  };

  const handleResetPassword = async () => {
    setAuthBusy(true);
    setAuthError("");
    try {
      if (!email.trim()) {
        setAuthError("اكتب بريدك الإلكتروني أولاً");
        return;
      }
      await resetPassword(email.trim());
      setAuthError("تم إرسال رابط استعادة كلمة المرور إلى بريدك الإلكتروني.");
    } catch (err: any) {
      setAuthError(err?.message || String(err));
    } finally {
      setAuthBusy(false);
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
      trackMetaEvent("CompleteRegistration", { content_name: "Dzair Store merchant signup" });
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
    return (<main dir="rtl" className="min-h-screen grid place-items-center bg-[#0b1220] text-white"><p>{t.loading}</p></main>);
  }

  if (!userEmail) {
    return (
      <main dir="rtl" className="merchant-auth">
        <a className="merchant-auth-brand" href="/">DZAIR STORE <span>دزاير ستور</span></a>
        {signupMailModal && (
          <div className="auth-mail-overlay" role="dialog" aria-modal="true">
            <div className="auth-mail-card">
              <div className="auth-mail-icon"><Mail size={28} /></div>
              <h2>{t.accountCreated}</h2>
              <p>
                أرسلنا رابط تأكيد إلى بريدك:
                <br />
                <strong dir="ltr">{email}</strong>
              </p>
              <p className="auth-mail-hint">
                افتح البريد واضغط الرابط لتفعيل الحساب. بعدها ستُعاد مباشرة إلى
                <b>{language === "fr" ? "Tableau de bord" : "لوحة التحكم"}</b> {language === "fr" ? "où votre boutique prend forme." : "حيث يُجهَّز متجرك."}
              </p>
              <button type="button" className="auth-mail-btn" onClick={() => setSignupMailModal(false)}>
                حسناً، سأتحقق من بريدي
              </button>
            </div>
          </div>
        )}
        <form onSubmit={handleAuth} className="merchant-auth-form">
          <div>
            <p className="merchant-auth-kicker">DZAIR STORE / {t.merchantSpace}</p>
            <h1>{authMode === "login" ? (language === "fr" ? "Ravi de vous revoir." : "أهلاً بعودتك.") : (language === "fr" ? "Créez votre boutique." : "ابدأ حكاية متجرك.")}</h1>
            <p className="merchant-auth-subtitle">{authMode === "login" ? (language === "fr" ? "Connectez-vous pour gérer votre boutique et vos commandes." : "ادخل لإدارة متجرك وطلباتك.") : (language === "fr" ? "Créez votre compte et commencez à configurer votre boutique." : "أنشئ حسابك وابدأ بتجهيز متجرك.")}</p>
          </div>
          <label className="block text-sm">{language === "fr" ? "E-mail" : "البريد الإلكتروني"}
            <input className="mt-1 w-full rounded-xl bg-black/30 border border-white/10 px-3 py-2" type="email" required autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} />
          </label>
          <label className="block text-sm">{language === "fr" ? "Mot de passe" : "كلمة المرور"}
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
              <button type="button" className="auth-eye" onClick={() => setShowPass(v => !v)} aria-label={showPass ? (language === "fr" ? "Masquer" : "إخفاء") : (language === "fr" ? "Afficher" : "إظهار")}>
                {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </label>
          {authMode === "signup" && (
            <label className="block text-sm">{language === "fr" ? "Confirmer le mot de passe" : "تأكيد كلمة المرور"}
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
                <button type="button" className="auth-eye" onClick={() => setShowPass2(v => !v)} aria-label={showPass2 ? (language === "fr" ? "Masquer" : "إخفاء") : (language === "fr" ? "Afficher" : "إظهار")}>
                  {showPass2 ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </label>
          )}
          {authError && <p className="text-sm text-red-400">{authError}</p>}

          {authMode === "login" && (
                                <button
                                  type="button"
                                  disabled={authBusy}
                                  className="merchant-auth-forgot"
                                  onClick={handleResetPassword}
                                >
                                  نسيت كلمة المرور؟
                                </button>
                              )}

                              <div className="merchant-auth-divider">
                                <span>{language === "fr" ? "ou" : "أو"}</span>
                              </div>

                              <button
                                type="button"
                                disabled={authBusy}
                                className="merchant-auth-google"
                                onClick={handleGoogle}
                              >
                                <img src="/google.svg" alt="" aria-hidden="true" />
                                <span>{authMode === "login" ? (language === "fr" ? "Continuer avec Google" : "المتابعة باستخدام Google") : (language === "fr" ? "S’inscrire avec Google" : "التسجيل باستخدام Google")}</span>
                              </button>

                              <button disabled={authBusy} className="merchant-auth-submit">
            {authBusy ? (language === "fr" ? "Chargement…" : "جاري…") : authMode === "login" ? (language === "fr" ? "Connexion" : "دخول") : (language === "fr" ? "Créer un compte" : "تسجيل")}
          </button>
           <button type="button" className="merchant-auth-switch" onClick={() => { setAuthMode(m => m === "login" ? "signup" : "login"); setAuthError(""); setPassword2(""); }}>
            {authMode === "login" ? (language === "fr" ? "Vous n’avez pas de compte ? Inscrivez-vous" : "ليس لديك حساب؟ سجّل") : (language === "fr" ? "Vous avez déjà un compte ? Connectez-vous" : "لديك حساب؟ ادخل")}
          </button>
        </form>
      </main>
    );
  }

  return (
    <main dir={language === "fr" ? "ltr" : "rtl"} className="ab-dashboard">
      <aside className="ab-sidebar">
        <a className="ab-logo" href={storeUrl} title="فتح المتجر"><img src="/logo-ab.png" alt="Dzair Store" className="ab-logo-img" /><div><b>DZAIR STORE</b><small>{t.dashboard}</small></div></a>
        <div className="ab-store-pill"><span className="online-dot"/><div><b>{settings.name}</b><small>{t.storeConnected}</small></div><ChevronLeft size={15}/></div>
        <nav>
          <NavItem icon={LayoutDashboard} label={t.overview} active={tab === "overview"} onClick={() => setTab("overview")} />
          <NavItem icon={ShoppingBag} label={t.orders} active={tab === "orders"} onClick={() => setTab("orders")} />
          <NavItem icon={Store} label={t.storeInfo} active={tab === "store"} onClick={() => setTab("store")} />
          <NavItem icon={Package} label={t.products} active={tab === "products"} onClick={() => setTab("products")} />
          <NavItem icon={ImageIcon} label={t.media} active={tab === "media"} onClick={() => setTab("media")} />
          <NavItem icon={Pencil} label={language === "fr" ? "Textes de la boutique" : "نصوص الواجهة"} active={tab === "homepage"} onClick={() => setTab("homepage")} />
          <NavItem icon={Zap} label={t.social} active={tab === "channels"} onClick={() => setTab("channels")} />
        </nav>
        <div className="ab-sidebar-bottom"><NavItem icon={Settings2} label={t.settings} active={tab === "settings"} onClick={() => setTab("settings")} /><NavItem icon={CircleHelp} label={t.help} active={false} onClick={() => setNotice(language === "fr" ? "Le centre d’aide est en cours de connexion." : "مركز المساعدة قيد الربط")} /></div>
      </aside>

      <section className="ab-main">
        <header className="ab-topbar"><div><span className="ab-kicker">{t.controlCenter}</span><h1>{tabTitle(tab, language)}</h1></div><div className="ab-actions"><LanguageSwitcher /><button className="icon-btn"><Bell size={18}/><i/></button><button className="preview-btn" onClick={() => window.open(storeUrl, "_blank")}><Eye size={17}/> {t.storePreview} <ExternalLink size={14}/></button><a className="store-link-btn" href={storeUrl}><Store size={16}/> {t.visitStore}</a><button className="save-btn" onClick={saveAll}>{saved ? <Check size={17}/> : <Save size={17}/>} {saved ? t.saved : t.saveChanges}</button>
          <button className="preview-btn" type="button" onClick={async () => { await signOut(); setUserEmail(null); setStore(null); }}>{t.logout}</button>
        </div></header>
        <div style={{padding:"6px 18px",fontSize:12,opacity:.75}}>{language === "fr" ? "Compte" : "حساب"}: {userEmail}{store ? ` · ${store.name} (${store.slug})` : ""}</div>

        {notice && <div className="ab-toast"><Check size={16}/> {notice}</div>}

        {!isStorePro(store || {}) && (
          <div className="plan-banner free">
            <div className="plan-banner-text">
              <b>{language === "fr" ? "Votre forfait : Gratuit" : "خطتك: مجاني"}</b>
              <p>{language === "fr" ? "Logo Dzair Store visible · limite de 5 produits · passez à Pro pour retirer le logo ou à Pro Delivery pour la livraison et le suivi." : "شعار Dzair Store ظاهر · حد 5 منتجات · اختر بين Pro لإزالة الشعار ووضع شعارك أو Pro Delivery لإضافة الشحن والتتبع"}</p>
            </div>
            <button type="button" className="plan-upgrade-btn" onClick={() => setShowUpgrade(true)}>{language === "fr" ? "Choisissez votre forfait · Pro ou Pro Delivery" : "اختَر باقتك · Pro أو Pro Delivery"}</button>
          </div>
        )}
        {isStorePro(store || {}) && (
          <div className="plan-banner pro">
            <div className="plan-banner-text">
              <b>{language === "fr" ? "Pro activé ✨" : "Pro مفعّل ✨"}</b>
              <p>{language === "fr" ? "Le logo de la plateforme est masqué · ajoutez le logo de votre boutique dans les paramètres." : "شعار المنصة مخفي · ارفع شعار متجرك من الإعدادات"}</p>
              {store?.plan !== "pro_shipping" && (
                <button type="button" className="plan-upgrade-btn" onClick={() => setShowUpgrade(true)}>{language === "fr" ? "Passer à Pro Delivery · 3 900 DZD" : "ترقية إلى Pro Delivery · 3,900 دج"}</button>
              )}
            </div>
          </div>
        )}

        {tab === "overview" && (
  <Overview
    stats={stats}
    setTab={setTab}
    storeUrl={storeUrl}
    subscriptionPlan={subscriptionPlan}
    subscriptionActive={subscriptionActive}
    subscriptionDaysLeft={subscriptionDaysLeft}
    subscriptionExpiresAt={subscriptionExpiresAt}
    language={language}
    t={t}
    setShowUpgrade={setShowUpgrade}
  />
)}
        {tab === "orders" && store && (
          <OrdersPanel storeId={store.id} whatsapp={settings.whatsapp || store.whatsapp || ""} language={language} />
        )}
        {tab === "store" && (
          <>
            <StorePanel
  settings={settings}
  setSettings={setSettings}
  store={store}
  onStoreUpdate={(patch) => setStore(s => s ? { ...s, ...patch } : s)}
  clothingMode={clothingMode}
  setClothingMode={setClothingMode}
  lowStockThreshold={lowStockThreshold}
  setLowStockThreshold={setLowStockThreshold}
  t={t}
  language={language}
/>
            {store && (
              <div className="qr-box" style={{margin:"12px 16px"}}>
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(storeUrl)}`}
                  alt={language === "fr" ? "QR de la boutique" : "QR المتجر"}
                  width={180}
                  height={180}
                />
                <div>
                  <b>{language === "fr" ? "QR de votre boutique" : "QR متجرك"}</b>
                  <p>{language === "fr" ? "Imprimez-le sur la porte ou la table — vos clients scannent et accèdent directement à la boutique." : "اطبعه على الباب أو الطاولة — الزبون يمسح ويدخل مباشرة."}</p>
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
                        setNotice(language === "fr" ? "Lien de la boutique copié" : "تم نسخ رابط المتجر");
                        setTimeout(() => setNotice(""), 2000);
                      });
                    }}
                  >
                    {language === "fr" ? "Copier le lien complet" : "نسخ الرابط الكامل"}
                  </button>
                  <label className="hours-field" style={{display:"block",marginTop:12}}>
                    <span style={{display:"block",fontSize:12,opacity:.75,marginBottom:6}}>{language === "fr" ? "Heures d’ouverture (visibles par les clients)" : "ساعات العمل (تظهر للزبون)"}</span>
                    <input
                      type="text"
                      defaultValue={store.working_hours || ""}
                      placeholder={language === "fr" ? "Ex. : Lun–Jeu 09:00–18:00 · Ven fermé" : "مثال: السبت–الخميس 09:00–18:00 · الجمعة مغلق"}
                      id="working-hours-input"
                      style={{width:"100%",maxWidth:360,padding:"10px 12px",borderRadius:12,border:"1px solid rgba(255,255,255,.15)",background:"rgba(0,0,0,.35)",color:"#fff"}}
                    />
                    <button
                      type="button"
                      style={{marginTop:8,padding:"8px 14px",borderRadius:10,border:0,background:"var(--brand-green)",color:"#fff",fontWeight:700,cursor:"pointer"}}
                      onClick={async () => {
                        const el = document.getElementById("working-hours-input") as HTMLInputElement | null;
                        const v = el?.value?.trim() || "";
                        try {
                          await saveWorkingHours(store.id, v);
                          setStore({ ...store, working_hours: v });
                          setNotice(language === "fr" ? "Horaires enregistrés" : "تم حفظ ساعات العمل");
                        } catch (e: any) {
                          setNotice(e?.message || String(e));
                        }
                      }}
                    >{language === "fr" ? "Enregistrer les horaires" : "حفظ الساعات"}</button>
                  </label>
                  <div className="open-toggle">
                    <button
                      type="button"
                      className={store.is_open !== false ? "on-open" : ""}
                      onClick={async () => {
                        try {
                          await setStoreOpen(store.id, true);
                          setStore({ ...store, is_open: true });
                          setNotice(language === "fr" ? "La boutique est ouverte aux commandes" : "المتجر مفتوح لاستقبال الطلبات");
                        } catch (e: any) {
                          setNotice(e?.message || String(e));
                        }
                      }}
                    >{language === "fr" ? "Ouvert" : "مفتوح"}</button>
                    <button
                      type="button"
                      className={store.is_open === false ? "on-closed" : ""}
                      onClick={async () => {
                        try {
                          await setStoreOpen(store.id, false);
                          setStore({ ...store, is_open: false });
                          setNotice(language === "fr" ? "La boutique est fermée — les commandes sont suspendues" : "المتجر مغلق — الطلبات متوقفة للزبائن");
                        } catch (e: any) {
                          setNotice(e?.message || String(e));
                        }
                      }}
                    >{language === "fr" ? "Fermé" : "مغلق"}</button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
        {tab === "products" && (
          <ProductsPanel
            products={products}
            onEdit={setEditing}
            onDelete={deleteProduct}
            onAdd={addProduct}
            lowStockThreshold={lowStockThreshold}
            storeSlug={store?.slug || ""}
            language={language}
            t={t}
          />
        )}
        {tab === "media" && (
          <MediaPanel
            products={products}
            onUpload={uploadImage}
            language={language}
          />
        )}
        {tab === "homepage" && <HomepagePanel settings={settings} setSettings={setSettings} />}
        {tab === "channels" && (
          <ChannelsPanel
            settings={settings}
            setSettings={setSettings}
            channels={channels}
            setChannels={setChannels}
            socialLinks={socialLinks}
            setSocialLinks={setSocialLinks}
            language={language}
            t={t}
          />
        )}
        {tab === "settings" && <SettingsPanel />}

        <footer className="ab-footer"><span>Dzair Store Control • {language === "fr" ? "Connecté à Supabase" : "متصل بـ Supabase"}</span><span>{language === "fr" ? "Dernière sauvegarde" : "آخر حفظ"}: <b>{saved ? (language === "fr" ? "Maintenant" : "الآن") : (language === "fr" ? "Non spécifié" : "غير محدد")}</b></span></footer>
      </section>

      {editing && <ProductModal product={editing} onChange={updateProduct} onClose={() => setEditing(null)} onSave={commitProduct} uploadRef={uploadRef} onUpload={handleModalImageUpload} uploading={modalImageUploading} />}
    
      <UpgradeModal open={showUpgrade} onClose={() => setShowUpgrade(false)} storeId={store?.id || null} currentPlan={(store?.plan as any) || "free"} language={language} />

    </main>
  );
}

function tabTitle(tab: string, language: LanguageCode) {
  const t = dashboardTranslations[language];
  if (tab === "orders") return t.orders;
  return ({ overview: t.overview, store: t.storeInfo, products: t.products, media: t.media, homepage: t.homepage, channels: t.social, settings: t.settings } as Record<string,string>)[tab] || t.dashboard;
}
function NavItem({ icon: Icon, label, active, onClick }: { icon: LucideIcon; label: string; active: boolean; onClick: () => void }) { return <button data-tab={label === "قنوات التواصل" ? "channels" : undefined} className={`ab-nav-item ${active ? "active" : ""}`} onClick={onClick}><Icon size={18}/><span>{label}</span>{active && <i/>}</button>; }

function Overview({ stats, setTab, storeUrl, subscriptionPlan, subscriptionActive, subscriptionDaysLeft, subscriptionExpiresAt, language, t, setShowUpgrade }: { stats: readonly (readonly [string,string,string,LucideIcon])[]; setTab: (v:string)=>void; storeUrl: string; subscriptionPlan: string; subscriptionActive: boolean; subscriptionDaysLeft: number; subscriptionExpiresAt: Date | null; language: LanguageCode; t: typeof dashboardTranslations["ar"]; setShowUpgrade: (v:boolean)=>void }) {
  return <div className="ab-content"><div className="welcome-card"><div><span>{language === "fr" ? "Bienvenue 👋" : "مرحباً بك 👋"}</span><h2>{language === "fr" ? "Gérez votre boutique depuis un seul endroit." : "تحكم كامل في متجرك من مكان واحد."}</h2><p>{language === "fr" ? "Modifiez les coordonnées, produits, prix, images et textes de votre boutique, puis enregistrez pour les afficher dans votre boutique." : "عدّل بيانات التواصل، المنتجات، الأسعار، الصور ونصوص الواجهة ثم احفظها لتظهر في صفحة المتجر."}</p><div className="welcome-actions"><button className="primary-btn" onClick={() => window.open(storeUrl, "_blank")}><Eye size={16}/> {t.storePreview}</button><button className="secondary-btn" onClick={() => setTab("products")}><Package size={16}/> {t.manageProducts}</button></div></div><div className="welcome-orb"><Store size={42}/></div></div><div className="stats-grid">{stats.map(([label,value,trend,Icon])=><div className="stat-card" key={label}><div className="stat-icon"><Icon size={19}/></div><span>{label}</span><strong>{value}</strong><small>{trend}</small></div>)}</div><div className="subscription-card"><div className="subscription-main"><div className="subscription-icon"><ShieldCheck size={22}/></div><div><span className="ab-kicker">{t.subscription}</span><h3>{subscriptionPlan}</h3>{subscriptionPlan === "Free" ? <p>{language === "fr" ? "Formule gratuite · jusqu’à 5 produits et 30 commandes par mois" : "الخطة المجانية · حتى 5 منتجات و30 طلبًا شهريًا"}</p> : subscriptionActive ? <p>{language === "fr" ? <>Il reste <strong>{subscriptionDaysLeft}</strong> jours · expire le {subscriptionExpiresAt?.toLocaleDateString("fr-DZ",{day:"numeric",month:"long",year:"numeric"})}</> : <>متبقي <strong>{subscriptionDaysLeft}</strong> يومًا · تنتهي في {subscriptionExpiresAt?.toLocaleDateString("ar-DZ",{day:"numeric",month:"long",year:"numeric"})}</>}</p> : <p className="subscription-expired"><AlertCircle size={15}/> {language === "fr" ? "Abonnement expiré, la boutique fonctionne maintenant avec la formule gratuite." : "انتهى الاشتراك، والمتجر يعمل الآن ضمن الخطة المجانية."}</p>}</div></div><div className="subscription-actions"><div className="subscription-status">{subscriptionPlan === "Free" ? <span>{language === "fr" ? "Gratuit" : "مجانية"}</span> : subscriptionActive ? <span className={subscriptionDaysLeft <= 7 ? "warning" : "active"}>{subscriptionDaysLeft <= 7 ? (language === "fr" ? "Expire bientôt" : "قرب الانتهاء") : (language === "fr" ? "Actif" : "نشطة")}</span> : <span className="expired">{language === "fr" ? "Expiré" : "منتهية"}</span>}</div>{(subscriptionPlan === "Free" || !subscriptionActive) && <button type="button" className="plan-upgrade-btn" onClick={() => setShowUpgrade(true)}>{!subscriptionActive && subscriptionPlan !== "Free" ? (language === "fr" ? "Réactiver l’abonnement" : "إعادة تفعيل الاشتراك") : (language === "fr" ? "Mettre à niveau" : "ترقية الباقة")}</button>}</div></div><div className="two-col"><div className="panel"><div className="panel-head"><div><span className="ab-kicker">QUICK ACTIONS</span><h3>{t.quickActions}</h3></div></div><div className="quick-grid"><Quick icon={Store} title={t.storeInfo} desc={language === "fr" ? "Nom + WhatsApp" : "الاسم + واتساب"} onClick={()=>setTab("store")}/><Quick icon={Package} title={language === "fr" ? "Produits" : "المنتجات"} desc={language === "fr" ? "Ajouter, modifier et supprimer" : "إضافة وتعديل وحذف"} onClick={()=>setTab("products")}/><Quick icon={ImageIcon} title={language === "fr" ? "Images" : "الصور"} desc={language === "fr" ? "Modifier les images des produits" : "تغيير صور المنتجات"} onClick={()=>setTab("media")}/><Quick icon={Pencil} title={language === "fr" ? "Page d’accueil" : "الواجهة"} desc={language === "fr" ? "Titre et textes" : "العنوان والنصوص"} onClick={()=>setTab("homepage")}/><Quick icon={Zap} title={language === "fr" ? "Réseaux sociaux" : "قنوات التواصل"} desc="Facebook · Instagram · Telegram · TikTok" onClick={()=>setTab("channels")}/></div></div><div className="panel performance"><div className="panel-head"><div><span className="ab-kicker">{language === "fr" ? "ACTIVITÉ DE LA BOUTIQUE" : "STORE ACTIVITY"}</span><h3>{language === "fr" ? "Activité de la boutique" : "نشاط المتجر"}</h3></div><BarChart3 size={20}/></div><div className="fake-chart"><span style={{height:"35%"}}/><span style={{height:"58%"}}/><span style={{height:"46%"}}/><span style={{height:"72%"}}/><span style={{height:"61%"}}/><span style={{height:"88%"}}/><span style={{height:"76%"}}/></div><div className="chart-labels">{(language === "fr" ? ["Sam", "Dim", "Lun", "Mar", "Mer", "Jeu", "Aujourd’hui"] : ["السبت", "الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "اليوم"]).map((label) => <span key={label}>{label}</span>)}</div></div></div></div>;
}
function Quick({icon:Icon,title,desc,onClick}:{icon:LucideIcon,title:string,desc:string,onClick:()=>void}){return <button className="quick-card" onClick={onClick}><div><Icon size={19}/></div><b>{title}</b><small>{desc}</small><ChevronLeft size={15}/></button>}
function Field({label,value,onChange,placeholder}:{label:string,value:string,onChange:(v:string)=>void,placeholder?:string}){return <label className="ab-field"><span>{label}</span><input value={value} placeholder={placeholder} onChange={e=>onChange(e.target.value)}/></label>}
function StorePanel({settings,setSettings,store,onStoreUpdate,clothingMode,setClothingMode,lowStockThreshold,setLowStockThreshold,t}:{settings:StoreSettings,setSettings:Dispatch<SetStateAction<StoreSettings>>,store:StoreRow|null,onStoreUpdate:(patch:Partial<StoreRow>)=>void,clothingMode?:boolean,setClothingMode?:(v:boolean)=>void,lowStockThreshold?:number,setLowStockThreshold?:(v:number)=>void,t:typeof dashboardTranslations["ar"],language:LanguageCode}){
  const [bannerUploading, setBannerUploading] = useState(false);
  const bannerInputRef = useRef<HTMLInputElement>(null);
  const pro = isStorePro(store || {});
  const [bannerNotice, setBannerNotice] = useState("");
  const [shippingConnections, setShippingConnections] = useState<ShippingConnection[]>([]);
  const [shippingLoading, setShippingLoading] = useState(false);
  const [shippingModal, setShippingModal] = useState<ShippingProviderId | null>(null);
  const [shippingCredentials, setShippingCredentials] = useState<Record<string, string>>({});
  const [shippingBusy, setShippingBusy] = useState(false);
  const [shippingMsg, setShippingMsg] = useState("");

  useEffect(() => {
    if (!store?.id || !pro) return;
    setShippingLoading(true);
    loadShippingConnections(store.id)
      .then(setShippingConnections)
      .catch(() => setShippingConnections([]))
      .finally(() => setShippingLoading(false));
  }, [store?.id, pro]);

  const openShippingModal = (provider: ShippingProviderId) => {
    setShippingModal(provider);
    setShippingCredentials({});
    setShippingMsg("");
  };

  const saveShippingConnection = async () => {
    if (!store || !shippingModal) return;
    setShippingBusy(true);
    setShippingMsg("");
    try {
      const result = await connectShippingProvider(store.id, shippingModal, shippingCredentials);
      setShippingMsg(result.message || "تم اختبار الاتصال وحفظ الربط بنجاح");
      const fresh = await loadShippingConnections(store.id);
      setShippingConnections(fresh);
      setTimeout(() => setShippingModal(null), 900);
    } catch (e: any) {
      setShippingMsg(e?.message || "فشل الاتصال. راجع بيانات API.");
    } finally {
      setShippingBusy(false);
    }
  };

  const disconnectShipping = async (provider: ShippingProviderId) => {
    if (!store) return;
    setShippingBusy(true);
    try {
      await disconnectShippingProvider(store.id, provider);
      setShippingConnections((prev) => prev.filter((x) => x.provider !== provider));
      setShippingMsg("تم فصل شركة التوصيل");
    } catch (e: any) {
      setShippingMsg(e?.message || "تعذر فصل الربط");
    } finally {
      setShippingBusy(false);
      setTimeout(() => setShippingMsg(""), 3000);
    }
  };

  const shippingBox = (
    <div className="panel large shipping-integrations-panel" style={{ marginTop: 16 }}>
      <div className="panel-head shipping-panel-head">
        <div>
          <span className="ab-kicker">SHIPPING INTEGRATIONS</span>
          <h3>{t.shippingCompanies}</h3>
          <p>اربط حسابك مباشرةً عبر API. المفاتيح تبقى على الخادم ولا تظهر في المتصفح.</p>
        </div>
        <div className="shipping-secure-badge"><ShieldCheck size={15}/> ربط آمن</div>
      </div>

      {!pro ? (
        <div className="shipping-upgrade-card">
          <div className="shipping-upgrade-icon"><Truck size={22}/></div>
          <div><b>الشحن المتقدم متاح مع Pro</b><p>فعّل ربط شركات التوصيل، إنشاء الشحنات والتتبع من داخل لوحة التحكم.</p></div>
        </div>
      ) : (
        <>
          <div className="shipping-provider-grid">
            {SHIPPING_PROVIDERS.map((provider) => {
              const connection = shippingConnections.find((x) => x.provider === provider.id);
              const connected = connection?.status === "connected";
              const errored = connection?.status === "error";
              return (
                <article className={`shipping-provider-card ${connected ? "is-connected" : ""}`} key={provider.id}>
                  <div className="shipping-provider-top">
                    <div className="shipping-logo-mark" style={{ borderColor: provider.tone }} aria-hidden="true">
                      <div className="shipping-provider-logo">
  <img
    src={provider.logoUrl}
    alt=""
    loading="lazy"
    referrerPolicy="no-referrer"
    onError={(e) => {
      const img = e.currentTarget as HTMLImageElement;
      img.style.display = "none";
      const fallback = img.parentElement?.querySelector("[data-logo-fallback]") as HTMLElement | null;
      if (fallback) fallback.style.display = "flex";
    }}
  />
  <span data-logo-fallback style={{ display: "none" }}>
    {provider.id === "dhd" ? "DHD" : provider.name.slice(0, 2).toUpperCase()}
  </span>
</div>
                    </div>
                    <div className="shipping-provider-title"><b>{provider.name}</b><small>{provider.nameAr}</small></div>
                    {connected ? <CheckCircle2 className="shipping-status-icon" size={19}/> : errored ? <AlertCircle className="shipping-status-icon error" size={19}/> : null}
                  </div>
                  <p className="shipping-provider-tagline">{provider.tagline}</p>
                  <div className="shipping-provider-bottom">
                    <span className={`shipping-state ${connected ? "connected" : errored ? "error" : ""}`}>
                      {connected ? "مربوط" : errored ? "راجع بيانات الربط" : "غير مربوط"}
                    </span>
                    <div className="shipping-card-actions">
                      <button type="button" className={connected ? "ghost-btn" : "primary-btn"} onClick={() => openShippingModal(provider.id)}>
                        {connected ? "تعديل الربط" : "ربط الآن"}
                      </button>
                      {connected && <button type="button" className="icon-btn-danger" title="فصل الربط" onClick={() => disconnectShipping(provider.id)} disabled={shippingBusy}><Unplug size={16}/></button>}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
          {shippingLoading && <p className="shipping-loading">...جاري فحص حالة الربط</p>}
          {shippingMsg && <div className="shipping-inline-msg"><CheckCircle2 size={16}/>{shippingMsg}</div>}
        </>
      )}

      {shippingModal && (() => {
        const provider = SHIPPING_PROVIDERS.find((x) => x.id === shippingModal)!;
        return (
          <div className="shipping-modal-backdrop" role="dialog" aria-modal="true">
            <div className="shipping-modal">
              <div className="shipping-modal-head">
                <div><span className="ab-kicker">API CONNECTION</span><h4>ربط {provider.name}</h4><p>سيتم اختبار بيانات الاعتماد مباشرةً من الخادم قبل حفظها.</p></div>
                <button type="button" className="icon-btn" onClick={() => setShippingModal(null)}><X size={18}/></button>
              </div>
              <div className="shipping-modal-fields">
                {provider.credentials.map((field) => (
                  <label className="ab-field" key={field.key}>
                    <span>{field.label}</span>
                    <input type={"secret" in field && field.secret ? "password" : "text"} dir="ltr" autoComplete="off" placeholder={field.placeholder} value={shippingCredentials[field.key] || ""} onChange={(e) => setShippingCredentials((prev) => ({ ...prev, [field.key]: e.target.value }))}/>
                  </label>
                ))}
              </div>
              <div className="shipping-modal-note"><ShieldCheck size={15}/> لن نعرض الـ Token مرة أخرى بعد الحفظ.</div>
              {shippingMsg && <div className="shipping-modal-msg"><AlertCircle size={16}/>{shippingMsg}</div>}
              <div className="shipping-modal-actions">
                <button type="button" className="ghost-btn" onClick={() => setShippingModal(null)} disabled={shippingBusy}>إلغاء</button>
                <button type="button" className="primary-btn" onClick={saveShippingConnection} disabled={shippingBusy}>{shippingBusy ? "...جاري الاختبار" : "اختبار الاتصال وحفظ الربط"}</button>
              </div>
            </div>
          </div>
        );
      })()}

      <style>{`
        .shipping-panel-head{align-items:flex-start}.shipping-secure-badge{display:flex;align-items:center;gap:6px;padding:8px 11px;border:1px solid rgba(134,239,172,.2);background:rgba(134,239,172,.07);border-radius:999px;color:#86efac;font-size:12px;white-space:nowrap}
        .shipping-provider-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;margin-top:16px}
        .shipping-provider-card{border:1px solid rgba(255,255,255,.1);background:linear-gradient(145deg,rgba(255,255,255,.045),rgba(255,255,255,.018));border-radius:18px;padding:16px;transition:.2s;border-top:2px solid rgba(255,255,255,.08)}
        .shipping-provider-card:hover{transform:translateY(-2px);border-color:rgba(255,255,255,.18)}.shipping-provider-card.is-connected{border-color:rgba(134,239,172,.28);box-shadow:0 12px 30px rgba(0,0,0,.12)}
        .shipping-provider-top{display:flex;align-items:center;gap:11px}.shipping-logo-mark{width:76px;height:44px;border:1px solid;border-radius:12px;display:grid;place-items:center;background:#fff;padding:5px;overflow:hidden}.shipping-logo-mark img{width:100%;height:100%;object-fit:contain}.shipping-provider-title{min-width:0;flex:1}.shipping-provider-title b{display:block;font-size:15px}.shipping-provider-title small{display:block;opacity:.58;font-size:11px;margin-top:2px}.shipping-status-icon{color:#86efac}.shipping-status-icon.error{color:#fbbf24}.shipping-provider-tagline{font-size:12px;opacity:.65;margin:12px 0 16px;min-height:18px}.shipping-provider-bottom{display:flex;align-items:center;justify-content:space-between;gap:8px}.shipping-state{font-size:11px;padding:6px 9px;border-radius:999px;background:rgba(255,255,255,.06);opacity:.7}.shipping-state.connected{color:#86efac;background:rgba(134,239,172,.08);opacity:1}.shipping-state.error{color:#fbbf24;background:rgba(251,191,36,.08);opacity:1}.shipping-card-actions{display:flex;gap:7px;align-items:center}.icon-btn-danger{width:36px;height:36px;border-radius:10px;border:1px solid rgba(248,113,113,.2);background:rgba(248,113,113,.06);color:#fca5a5;display:grid;place-items:center;cursor:pointer}.shipping-loading{font-size:12px;opacity:.55;margin:12px 2px}.shipping-inline-msg{display:flex;align-items:center;gap:7px;margin-top:12px;color:#86efac;font-size:13px}.shipping-upgrade-card{display:flex;gap:12px;align-items:center;border:1px dashed rgba(255,255,255,.14);padding:16px;border-radius:16px;margin-top:12px}.shipping-upgrade-icon{width:42px;height:42px;border-radius:12px;background:rgba(124,58,237,.12);display:grid;place-items:center;color:#c4b5fd}.shipping-upgrade-card p{margin:4px 0 0;font-size:12px;opacity:.65}.shipping-modal-backdrop{position:fixed;inset:0;background:rgba(3,7,18,.72);backdrop-filter:blur(9px);display:grid;place-items:center;padding:18px;z-index:1000}.shipping-modal{width:min(560px,100%);background:#111827;border:1px solid rgba(255,255,255,.12);border-radius:22px;padding:20px;box-shadow:0 30px 90px rgba(0,0,0,.45)}.shipping-modal-head{display:flex;justify-content:space-between;gap:12px}.shipping-modal-head h4{margin:4px 0 5px;font-size:20px}.shipping-modal-head p{margin:0;font-size:12px;opacity:.6}.shipping-modal-fields{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:18px}.shipping-modal-fields .ab-field:only-child{grid-column:1/-1}.shipping-modal-note{display:flex;align-items:center;gap:7px;font-size:11px;opacity:.62;margin-top:12px}.shipping-modal-msg{display:flex;gap:7px;align-items:flex-start;margin-top:12px;padding:10px 12px;border-radius:12px;background:rgba(251,191,36,.08);color:#fde68a;font-size:12px}.shipping-modal-actions{display:flex;justify-content:flex-end;gap:8px;margin-top:18px}.icon-btn{width:36px;height:36px;border-radius:10px;border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.04);color:inherit;display:grid;place-items:center;cursor:pointer}@media(max-width:680px){.shipping-provider-grid{grid-template-columns:1fr}.shipping-modal-fields{grid-template-columns:1fr}.shipping-modal-actions{flex-direction:column-reverse}.shipping-modal-actions button{width:100%}.shipping-secure-badge{display:none}}
      `}</style>
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
      setBannerNotice("رجعنا لعرض شعار Dzair Store");
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
      <div className="form-grid"><Field label="اسم المتجر" value={settings.name} onChange={v=>setSettings(s=>({...s,name:v}))}/><Field label={language === "fr" ? "Numéro WhatsApp" : "رقم واتساب"} value={settings.whatsapp} onChange={v=>setSettings(s=>({...s,whatsapp:v}))} placeholder="2135XXXXXXXX"/><Field label="شريط الإعلان" value={settings.announcement} onChange={v=>setSettings(s=>({...s,announcement:v}))}/></div>
      <div className="info-box"><MessageCircle size={18}/><div><b>رقم واتساب</b><p>اكتب الرقم بصيغة دولية بدون + أو مسافات. سيُستخدم في أزرار الطلب والتواصل.</p></div></div>
    </div>

    <div className="panel large" style={{ marginTop: 16 }}>
      <div className="panel-head"><div><span className="ab-kicker">BRANDING · PRO</span><h3>بانر متجرك الخاص</h3><p>يظهر بدل شعار Dzair Store في أعلى متجرك أمام عملائك.</p></div></div>

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
              <p>{store?.hide_platform_brand ? "عملاؤك يرون هذا البانر بدل شعار Dzair Store." : "ارفع صورة لتفعيل بانرك الخاص."}</p>
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

    {shippingBox}
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
function ProductsPanel({products,onEdit,onDelete,onAdd,lowStockThreshold=5,storeSlug="",language,t}:{products:Product[],onEdit:(p:Product)=>void,onDelete:(id:string)=>void,onAdd:()=>void,lowStockThreshold?:number,storeSlug?:string,language:LanguageCode,t:typeof dashboardTranslations["ar"]}){
  const copyLink = async (productId: string) => {
    if (!storeSlug) return;
    const url = `${window.location.origin}/?store=${encodeURIComponent(storeSlug)}&product=${encodeURIComponent(productId)}`;
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      window.prompt("انسخ رابط المنتج:", url);
    }
  };
  return <div className="ab-content"><div className="panel large"><div className="panel-head"><div><span className="ab-kicker">{language === "fr" ? "CATALOGUE" : "CATALOG"}</span><h3>{t.products}</h3><p>{language === "fr" ? "Ajoutez, modifiez ou supprimez vos produits et gérez le stock. Le bouton lien sert au partage public." : "إضافة، تعديل، حذف، مخزون. زر الرابط = للإعلان على فيسبوك."}</p></div><button className="primary-btn" onClick={onAdd}><Plus size={17}/> {t.addProduct}</button></div>{products.length === 0 ? <div className="catalog-empty"><Package size={28}/><strong>لا توجد منتجات ظاهرة حالياً</strong><span>إذا كانت لديك منتجات في قاعدة البيانات، اضغط تحديث الصفحة. وإذا لم تكن موجودة أضف أول منتج من الزر أعلاه.</span><button type="button" className="secondary-btn" onClick={()=>window.location.reload()}>تحديث الصفحة</button></div> : <div className="product-table">{products.map(p=>{const st=p.trackStock?Number(p.stock??0):null;const low=st!==null&&st>0&&st<=lowStockThreshold;const empty=st===0;return <div className="product-row" key={p.id}><img src={p.image || productCharger} alt="" onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = productCharger; }}/><div className="product-name"><b>{p.name}</b><small>{p.category}</small>{empty&&<span className="stock-badge out">نفد</span>}{low&&!empty&&<span className="stock-badge low">بقي {st}</span>}</div><div className="product-price"><b>{p.price.toLocaleString("ar-DZ")} دج</b>{p.oldPrice ? <del>{p.oldPrice.toLocaleString("ar-DZ")} دج</del> : <small>بدون سعر قديم</small>}{p.trackStock&&<small style={{display:"block",opacity:.8}}>مخزون: {st ?? "—"}</small>}</div><span className="badge">{p.badge}</span><div className="row-actions"><button type="button" onClick={()=>copyLink(p.id)} aria-label="نسخ رابط المنتج" title="نسخ رابط للإعلان"><Link2 size={16}/></button><button onClick={()=>onEdit(p)} aria-label="تعديل"><Pencil size={16}/></button><button onClick={()=>onDelete(p.id)} aria-label="حذف" className="danger"><Trash2 size={16}/></button></div></div>})}</div>} </div></div>}
function MediaPanel({products,onUpload,language}:{products:Product[],onUpload:(file:File,id:string)=>void,language:LanguageCode}){return <div className="ab-content"><div className="panel large"><div className="panel-head"><div><span className="ab-kicker">{language === "fr" ? "BIBLIOTHÈQUE D’IMAGES" : "MEDIA LIBRARY"}</span><h3>صور المنتجات</h3><p>{language === "fr" ? "Téléversez une nouvelle image pour un produit et elle apparaîtra immédiatement dans l’aperçu." : "ارفع صورة جديدة لأي منتج وستظهر مباشرة في المعاينة."}</p></div></div><div className="media-grid">{products.map(p=><div className="media-card" key={p.id}><div className="media-preview"><img src={p.image || productCharger} alt={p.name} onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = productCharger; }}/><label><Upload size={16}/> تغيير الصورة<input type="file" accept="image/*" onChange={e=>e.target.files?.[0]&&onUpload(e.target.files[0],p.id)}/></label></div><b>{p.name}</b><small>{p.category}</small></div>)}</div></div></div>}
function HomepagePanel({settings,setSettings}:{settings:StoreSettings,setSettings:Dispatch<SetStateAction<StoreSettings>>}){return <div className="ab-content"><div className="panel large"><div className="panel-head"><div><span className="ab-kicker">HOMEPAGE COPY</span><h3>نصوص الواجهة الرئيسية</h3><p>غيّر العنوان الرئيسي، الوصف وشريط الإعلان دون تعديل ملفات الصفحة.</p></div></div><div className="form-grid"><Field label="العنوان الكبير" value={settings.heroTitle} onChange={v=>setSettings(s=>({...s,heroTitle:v}))}/><Field label="الجزء المميز" value={settings.heroEmphasis} onChange={v=>setSettings(s=>({...s,heroEmphasis:v}))}/><label className="ab-field full"><span>وصف البطل Hero</span><textarea value={settings.heroDescription} onChange={e=>setSettings(s=>({...s,heroDescription:e.target.value}))}/></label><Field label="عنوان التواصل" value={settings.contactTitle} onChange={v=>setSettings(s=>({...s,contactTitle:v}))}/><Field label="الجزء المميز للتواصل" value={settings.contactEmphasis} onChange={v=>setSettings(s=>({...s,contactEmphasis:v}))}/></div></div></div>}
function ChannelsPanel({settings,setSettings,channels,setChannels,socialLinks,setSocialLinks,language,t}:{settings:StoreSettings;setSettings:Dispatch<SetStateAction<StoreSettings>>;channels:ChannelState;setChannels:Dispatch<SetStateAction<ChannelState>>;socialLinks:Record<string,string>;setSocialLinks:Dispatch<SetStateAction<Record<string,string>>>;language:LanguageCode;t:typeof dashboardTranslations["ar"]}){
  const items=[
    ["Facebook", language === "fr" ? "Page de la boutique et communauté" : "صفحة المتجر والتفاعل"],
    ["Instagram", language === "fr" ? "Photos, offres et contenu" : "الصور والعروض والمحتوى"],
    ["Telegram", language === "fr" ? "Canal de la boutique et commandes" : "قناة المتجر والطلبات"],
    ["TikTok", language === "fr" ? "Vidéos et offres courtes" : "الفيديوهات والعروض القصيرة"],
  ] as const;
  const linkLabel = (name: string) => language === "fr" ? `Lien ${name}` : `رابط ${name}`;
  return <div className="ab-content">
    <div className="panel large">
      <div className="panel-head"><div><span className="ab-kicker">{language === "fr" ? "RÉSEAUX SOCIAUX" : "SOCIAL PRESENCE"}</span><h3>{t.social}</h3><p>{language === "fr" ? "Ajoutez vos liens. Une icône apparaît dans le footer public uniquement si le réseau est activé et possède une URL valide." : "أضف روابط صفحاتك. تظهر الأيقونة في Footer المتجر فقط عند تفعيل الشبكة ووجود رابط صالح."}</p></div></div>
      <div className="social-settings-grid">
        {items.map(([name,desc])=>{const on=Boolean(channels[name]);return <div className={`social-setting-card ${on?'is-on':''}`} key={name}>
          <div className="social-setting-top"><div className={`social-setting-icon social-setting-${name.toLowerCase()}`}><SocialIcon platform={name} /></div><div><b>{name}</b><small>{desc}</small></div><button type="button" className={`switch ${on?'is-on':''}`} aria-pressed={on} aria-label={language === "fr" ? `${on ? "Désactiver" : "Activer"} ${name}` : `${on ? "تعطيل" : "تفعيل"} ${name}`} onClick={()=>setChannels(prev=>({...prev,[name]:!prev[name]}))}><i/></button></div>
          <Field label={linkLabel(name)} value={socialLinks[name] || ""} onChange={v=>setSocialLinks(prev=>({...prev,[name]:v}))} placeholder={name === "Facebook" ? "https://facebook.com/..." : name === "Instagram" ? "https://instagram.com/..." : name === "Telegram" ? "https://t.me/..." : "https://tiktok.com/@..."}/>
        </div>})}
      </div>
      <div className="info-box"><Zap size={18}/><div><b>{language === "fr" ? "Conseil professionnel" : "نصيحة احترافية"}</b><p>{language === "fr" ? "Utilisez le lien direct de votre page ou profil. Après l’enregistrement, les réseaux activés avec une URL valide apparaissent automatiquement dans le footer de la boutique." : "استخدم الرابط المباشر لصفحة المتجر أو الحساب. بعد الحفظ ستظهر الشبكات المفعلة ذات الروابط الصالحة تلقائياً في Footer المتجر."}</p></div></div>
      <div className="form-grid one"><Field label={language === "fr" ? "Numéro WhatsApp" : "رقم واتساب"} value={settings.whatsapp} onChange={v=>setSettings(s=>({...s,whatsapp:v}))}/></div>
    </div>
  </div>
}
function SettingsPanel(){return <div className="ab-content"><div className="panel large"><div className="panel-head"><div><span className="ab-kicker">SYSTEM</span><h3>إعدادات المتجر</h3><p>إعدادات عامة للوحة التحكم.</p></div></div><div className="settings-list"><div><b>حفظ محلي</b><span>التغييرات تحفظ في المتصفح حالياً.</span><Check size={17}/></div><div><b>واجهة RTL</b><span>دعم كامل للغة العربية واتجاه RTL.</span><Check size={17}/></div><div><b>Responsive</b><span>اللوحة تعمل على الهاتف والكمبيوتر.</span><Check size={17}/></div></div></div></div>}
function ProductModal({product,onChange,onClose,onSave,onUpload,uploadRef,uploading}:{product:Product,onChange:(p:Partial<Product>)=>void,onClose:()=>void,onSave:()=>void,onUpload:(f:File)=>void,uploadRef:RefObject<HTMLInputElement|null>,uploading?:boolean}){return <div className="modal-backdrop"><div className="product-modal"><div className="modal-head"><div><span className="ab-kicker">PRODUCT EDITOR</span><h3>تعديل المنتج</h3></div><button onClick={onClose}><X size={18}/></button></div><div className="modal-body"><div className="modal-image"><img src={product.image || productCharger} alt="" onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = productCharger; }}/><button disabled={uploading} onClick={()=>uploadRef.current?.click()}><Upload size={15}/> {uploading ? "...جاري الرفع" : "تغيير الصورة"}</button><input ref={uploadRef} type="file" accept="image/*" hidden onChange={e=>e.target.files?.[0]&&onUpload(e.target.files[0])}/></div><div className="modal-fields"><Field label="اسم المنتج" value={product.name} onChange={v=>onChange({name:v})}/><Field label="التصنيف" value={product.category} onChange={v=>onChange({category:v})}/><Field label="السعر الحالي (دج)" value={String(product.price)} onChange={v=>onChange({price:Number(v)||0})}/><Field label="السعر القديم (اختياري)" value={product.oldPrice ? String(product.oldPrice) : ""} onChange={v=>onChange({oldPrice:v?Number(v):null})}/><Field label="الشارة" value={product.badge} onChange={v=>onChange({badge:v})}/><label className="ab-field"><span>تتبع المخزون</span><select value={product.trackStock?"1":"0"} onChange={e=>onChange({trackStock:e.target.value==="1", stock: e.target.value==="1" ? (product.stock ?? 0) : null})} style={{width:"100%",padding:"10px",borderRadius:10}}><option value="0">لا</option><option value="1">نعم</option></select></label>{product.trackStock && <Field label="الكمية المتبقية" value={String(product.stock ?? 0)} onChange={v=>onChange({stock:Number(v)||0})}/>}<label className="ab-field full"><span>الوصف</span><textarea value={product.description} onChange={e=>onChange({description:e.target.value})}/></label>{/* variants editor when clothing mode — basic lines */}{product.variants && product.variants.length>0 && <div className="ab-field full"><span>المتغيرات (لون / مقاس / قياس)</span><ul style={{fontSize:13,margin:0,paddingRight:18}}>{product.variants.map((v,i)=><li key={i}>{(v.color||"—")+" · "+(v.pointure||"—")+" · "+(v.taille||"—")+" · مخزون "+v.stock}</li>)}</ul></div>}</div></div><div className="modal-footer"><button className="ghost-btn" onClick={onClose}>إلغاء</button><button className="save-btn" onClick={onSave}><Save size={16}/> حفظ المنتج</button></div></div></div>}


/* Stock badges for catalog */
