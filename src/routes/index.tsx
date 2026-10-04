import { createFileRoute } from "@tanstack/react-router";
import { ArrowLeft, ArrowUpLeft, Menu, Minus, PackageCheck, Plus, Settings2 as Settings2Icon, ShieldCheck, ShoppingCart, Sparkles, Trash2, Truck, X } from "lucide-react";
import { useEffect, useState } from "react";
import { loadPublicSocialLinks, loadPublicStore, recordStoreVisit, storeToSettings } from "@/lib/storeData";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { isStorePro, showPlatformBrand } from "@/lib/pricing";
import { OrderModal } from "@/components/OrderModal";
import { WhatsAppIcon } from "@/components/WhatsAppIcon";
import { LandingPage } from "@/components/LandingPage";
import productCharger from "@/assets/product-charger.jpg";
import { Button } from "@/components/ui/button";
import { SocialIcon, type SocialPlatform } from "@/components/SocialIcon";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { getLanguage } from "@/i18n";
import { platformTranslations } from "@/i18n/platform";

import { safeSocialUrl } from "../lib/safeUrl";
export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dzair Store | دزاير ستور — أنشئ متجرك الإلكتروني في الجزائر" },
      { name: "description", content: "منصة جزائرية لإنشاء متاجر إلكترونية مع طلبات واتساب، 58 ولاية، وخطط مجانية وPro. بدون عمولة على المبيعات." },
      { property: "og:title", content: "Dzair Store | دزاير ستور" },
      { property: "og:description", content: "متجرك جاهز ويبيع — ابدأ مجاناً، وترقَّ لـ Pro لإزالة شعار المنصة." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: HomePage,
});

const whatsappNumber = "213555000000";

const STORE_DEFAULTS = {
  name: "متجري",
  whatsapp: whatsappNumber,
  announcement: "توصيل سريع · الدفع عند الاستلام",
  heroTitle: "مرحباً بك",
  heroEmphasis: "في متجرك.",
  heroDescription: "عدّل المنتجات والنصوص من لوحة التحكم.",
  contactTitle: "تواصل معنا",
  contactEmphasis: "عبر واتساب.",
};

type UiProduct = {
  id: string;
  name: string;
  category: string;
  description: string;
  price: number;
  oldPrice?: number | null;
  badge: string;
  image: string;
};

function formatPrice(value: number, language: "ar" | "fr" = "ar") {
  return `${value.toLocaleString(language === "fr" ? "fr-DZ" : "en-US")} ${language === "fr" ? "DZD" : "دج"}`;
}

/** / → صفحة الهبوط · /?store=slug → واجهة المتجر */
function HomePage() {
  const language = getLanguage();
  const t = platformTranslations[language].store;
  const [mode, setMode] = useState<"boot" | "landing" | "store">("boot");
  const [slug, setSlug] = useState<string | null>(null);
  const [productId, setProductId] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const s = params.get("store")?.trim() || null;
    const pid = params.get("product")?.trim() || params.get("p")?.trim() || null;

    // متجر عام: لا نقطع تجربة الزبون (حتى لو كان التاجر مسجّلاً)
    if (s) {
      setSlug(s);
      setProductId(pid);
      setMode("store");
      return;
    }

    let cancelled = false;

    const goDashboard = () => {
      if (cancelled) return;
      window.location.replace("/dashboard");
    };

    const waitForSession = async () => {
      if (!isSupabaseConfigured) return null;

      const hash = window.location.hash || "";
      const hasAuthInUrl =
        params.has("code") ||
        hash.includes("access_token") ||
        hash.includes("refresh_token") ||
        hash.includes("error=");

      // PKCE: ?code=... يحتاج تبادل صريح أحياناً
      if (params.has("code")) {
        try {
          await supabase.auth.exchangeCodeForSession(window.location.href);
        } catch {
          /* قد يكون العميل عالجه تلقائياً */
        }
      }

      // انتظر detectSessionInUrl + التخزين المحلي (مهم بعد Google)
      for (let i = 0; i < 12; i++) {
        if (cancelled) return null;
        const { data } = await supabase.auth.getSession();
        if (data.session?.user) return data.session;
        await new Promise((r) => setTimeout(r, hasAuthInUrl ? 150 : 80));
      }
      return null;
    };

    (async () => {
      try {
        const session = await waitForSession();
        if (cancelled) return;
        if (session?.user) {
          goDashboard();
          return;
        }
      } catch {
        /* نعرض الهبوط */
      }

      if (!cancelled) {
        setMode("landing");
        setSlug(null);
        setProductId(null);
      }
    })();

    // إن تأخرت الجلسة (SIGNED_IN بعد الرسم)
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (cancelled) return;
      if ((event === "SIGNED_IN" || event === "INITIAL_SESSION") && session?.user) {
        // فقط على الجذر بدون ?store=
        if (!new URLSearchParams(window.location.search).get("store")) {
          goDashboard();
        }
      }
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  if (mode === "boot") {
    return (
      <main dir="rtl" className="min-h-screen grid place-items-center bg-background text-foreground">
        <p className="text-muted-foreground text-sm">{platformTranslations[language].store.loading}</p>
      </main>
    );
  }
  if (mode === "landing") return <LandingPage />;
  return slug ? <Storefront slug={slug} focusProductId={productId} /> : <LandingPage />;
}

function Storefront({ slug, focusProductId }: { slug: string; focusProductId?: string | null }) {
  const language = getLanguage();
  const t = platformTranslations[language].store;
  const [menuOpen, setMenuOpen] = useState(false);
  const [storeSettings, setStoreSettings] = useState(STORE_DEFAULTS);
  const [storeProducts, setStoreProducts] = useState<UiProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [storeId, setStoreId] = useState<string | null>(null);
  const [storeIsOpen, setStoreIsOpen] = useState(true);
  const [workingHours, setWorkingHours] = useState("");
  type CartLine = {id:string;name:string;price:number;image?:string;qty:number};
  const cartKey = storeId ? `ab-cart-${storeId}` : "";
  const [cart, setCart] = useState<CartLine[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [cartPulse, setCartPulse] = useState(false);
  const [socialLinks, setSocialLinks] = useState<Record<string, string>>({});

  // استعادة السلة من localStorage عند جاهزية المتجر
  useEffect(() => {
    if (!cartKey || typeof window === "undefined") return;
    try {
      const raw = localStorage.getItem(cartKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) setCart(parsed);
      }
    } catch { /* ignore */ }
  }, [cartKey]);

  // حفظ السلة
  useEffect(() => {
    if (!cartKey || typeof window === "undefined") return;
    try {
      localStorage.setItem(cartKey, JSON.stringify(cart));
    } catch { /* ignore */ }
  }, [cart, cartKey]);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [isPro, setIsPro] = useState(false);
  const [merchantLogo, setMerchantLogo] = useState<string | null>(null);
  const [deliveryConfig, setDeliveryConfig] = useState<{ mode: "national" | "local_flat"; price: number; freeOver: number | null }>({ mode: "national", price: 0, freeOver: null });
  const [orderProduct, setOrderProduct] = useState<UiProduct | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const pub = await loadPublicStore(String(slug));
        if (cancelled) return;
        if (!pub) {
          setNotFound(true);
          return;
        }
        setStoreId(pub.store.id);
        setSocialLinks(await loadPublicSocialLinks(pub.store.id));
        setStoreIsOpen(pub.store.is_open !== false);
        setWorkingHours(pub.store.working_hours || "");
        const pro = isStorePro(pub.store);
        setIsPro(pro);
        setMerchantLogo(
          pro && pub.store.merchant_logo_url ? String(pub.store.merchant_logo_url) : null
        );
        setDeliveryConfig({
          mode: (pub.store as any).delivery_mode === "local_flat" ? "local_flat" : "national",
          price: Number((pub.store as any).local_delivery_price) || 0,
          freeOver:
            (pub.store as any).local_delivery_free_over != null
              ? Number((pub.store as any).local_delivery_free_over)
              : null,
        });
        setStoreSettings({ ...STORE_DEFAULTS, ...storeToSettings(pub.store) });
        if (pub.products.length) {
          setStoreProducts(
            pub.products.map((p) => ({
              id: String(p.id),
              name: p.name,
              category: p.category,
              description: p.description,
              price: p.price,
              ...(p.oldPrice !== undefined ? { oldPrice: p.oldPrice } : {}),
              badge: p.badge,
              image: p.image || productCharger,
            }))
          );
        }
      } catch (e) {
        console.warn("[storefront] load failed", e);
        if (!cancelled) setNotFound(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [slug]);
  useEffect(() => {
    if (!slug) return;
    // زيارة واحدة لكل تحميل صفحة المتجر (بدون تتبع هوية الزائر)
    void recordStoreVisit(slug);
  }, [slug]);


  // رابط إعلان فيسبوك: /?store=slug&product=id → يفتح المنتج مباشرة
  useEffect(() => {
    if (!focusProductId || loading || !storeProducts.length) return;
    const target = storeProducts.find((x) => String(x.id) === String(focusProductId));
    if (!target) return;
    const el = document.getElementById(`product-${target.id}`);
    if (el) {
      setTimeout(() => el.scrollIntoView({ behavior: "smooth", block: "center" }), 120);
      el.classList.add("product-card-focus");
      setTimeout(() => el.classList.remove("product-card-focus"), 2500);
    }
    setOrderProduct(target);
  }, [focusProductId, loading, storeProducts]);


  const featuredProduct = storeProducts[0];
  const whatsappUrl = (product?: UiProduct) => {
    const message = product
      ? `السلام عليكم، أريد طلب ${product.name} بسعر ${formatPrice(product.price, language)} من ${storeSettings.name}.`
      : `السلام عليكم، أريد الاستفسار عن منتجات ${storeSettings.name}.`;
    return `https://wa.me/${storeSettings.whatsapp || whatsappNumber}?text=${encodeURIComponent(message)}`;
  };

  if (loading) {
    return (
      <main dir={language === "fr" ? "ltr" : "rtl"} className="min-h-screen bg-background text-foreground grid place-items-center p-6">
        <p className="text-muted-foreground">{t.loading}</p>
      </main>
    );
  }

  if (notFound) {
    return (
      <main dir={language === "fr" ? "ltr" : "rtl"} className="storefront-empty">
        <div className="empty-store-card">
          <span className="empty-store-mark">DZAIR STORE / 404</span>
          <h1>{t.unavailable}</h1>
          <p>{t.invalidStore}</p>
          <Button asChild><a href="/">{t.backPlatform} <ArrowUpLeft size={16} /></a></Button>
        </div>
      </main>
    );
  }

  if (!featuredProduct) {
    return (
      <main dir={language === "fr" ? "ltr" : "rtl"} className="storefront-empty">
        <div className="empty-store-card">
          <span className="empty-store-mark">DZAIR STORE / قريباً</span>
          <h1>{t.preparing}</h1>
          <p>{t.noProducts}</p>
          <Button asChild><a href="/">{t.backPlatform} <ArrowUpLeft size={16} /></a></Button>
        </div>
      </main>
    );
  }

  return (
    <>
      {storeIsOpen === false && (
        <div className="store-rideau store-rideau-top" role="status">
          <strong>{t.closed}</strong>
          <small>{t.closedD}</small>
        </div>
      )}

    <main dir={language === "fr" ? "ltr" : "rtl"} className="storefront min-h-screen overflow-hidden bg-background text-foreground">
      <div className="announcement">
        <p>
          <Sparkles aria-hidden="true" /> {storeSettings.announcement}
        </p>
      </div>

      {/* Free: بانر المنصة بعرض كامل · Pro: يُخفى ويبقى اسم المتجر فقط */}
      {!isPro && (
        <div className="ab-platform-banner" role="banner">
          <div className="ab-platform-banner-inner">
            <span className="ab-platform-wordmark">DZAIR STORE</span>
            <span className="ab-platform-tag">Dzair Store</span>
          </div>
        </div>
      )}

      <header className="site-header">
        <div className="store-container flex h-16 items-center justify-between">
          <a
            href={`/?store=${encodeURIComponent(slug)}`}
            className={`brand ${isPro ? "brand-pro" : "brand-free"}`}
            aria-label={storeSettings.name}
          >
            {isPro && merchantLogo ? (
              <img
                src={merchantLogo}
                alt={storeSettings.name}
                className="brand-logo brand-logo-merchant"
                width={140}
                height={40}
              />
            ) : null}
            <span className="brand-store-identity">
              <span className="brand-store-name-main">{storeSettings.name || "متجري"}</span>
              <small className="brand-store-slug">/{slug}</small>
            </span>
          </a>

          <nav className="hidden items-center gap-8 md:flex" aria-label={language === "fr" ? "Navigation principale" : "التنقل الرئيسي"}>
            <a className="nav-link" href="#products">{t.navStore}</a>
            <a className="nav-link" href="#experience">{t.navExperience}</a>
            <a className="nav-link" href="#contact">{t.navContact}</a>
          </nav>

          <div className="flex items-center gap-2"><LanguageSwitcher />
            <Button asChild variant="ghost" className="hidden sm:inline-flex store-admin-link">
              <a href="/dashboard">
                <Settings2Icon /> {t.manage}
              </a>
            </Button>
            <Button asChild variant="outline" className="hidden sm:inline-flex">
              <a href={whatsappUrl()} target="_blank" rel="noreferrer">
                <WhatsAppIcon size={18} /> {t.whatsapp}
              </a>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setMenuOpen((value) => !value)}
              aria-label={menuOpen ? t.closeMenu : t.openMenu}
              aria-expanded={menuOpen}
            >
              {menuOpen ? <X /> : <Menu />}
            </Button>
          </div>
        </div>
        {menuOpen && (
          <nav className="mobile-menu" aria-label={language === "fr" ? "Menu mobile" : "قائمة الهاتف"}>
            <a href="#products" onClick={() => setMenuOpen(false)}>{t.navStore}</a>
            <a href="#experience" onClick={() => setMenuOpen(false)}>{t.navExperience}</a>
            <a href="#contact" onClick={() => setMenuOpen(false)}>{t.navContact}</a>
          </nav>
        )}
      </header>

      <section id="top" className="hero-section">
        <div className="store-container hero-layout">
          <div className="hero-copy hero-reveal" style={{ animationDelay: "0.05s" }}>
            <div className="hero-storeline">
              <span className="hero-storemark" aria-hidden="true" />
              <strong>{storeSettings.name || "متجري"}</strong>
              <small>/{slug}</small>
            </div>
            <span className="eyebrow hero-reveal" style={{ animationDelay: "0.15s" }}>{featuredProduct.badge || "اختيار اليوم"}</span>
            <h1 className="hero-reveal" style={{ animationDelay: "0.28s" }}>
              {storeSettings.heroTitle}
              <br />
              <em>{storeSettings.heroEmphasis}</em>
            </h1>
            <p className="hero-reveal" style={{ animationDelay: "0.42s" }}>{storeSettings.heroDescription}</p>
            <div className="flex flex-wrap items-center gap-3 hero-reveal" style={{ animationDelay: "0.55s" }}>
              <a href="#products" className="text-link">
                {t.discoverProducts} <ArrowLeft />
              </a>
            </div>
          </div>
          <div className="hero-visual hero-reveal" style={{ animationDelay: "0.18s" }}>
            <div className="hero-image-frame">
              <img
                className="hero-image"
                src={featuredProduct.image || productCharger}
                alt={featuredProduct.name}
                width={1536}
                height={1024}
                onError={(event) => {
                  event.currentTarget.onerror = null;
                  event.currentTarget.src = productCharger;
                }}
              />
              <span className="hero-image-badge">{featuredProduct.badge || "مميز"}</span>
              <span className="hero-image-number numeric">01</span>
            </div>
            <div className="hero-product-offer">
              <div className="hero-product-offer-copy">
                <small>{featuredProduct.category}</small>
                <h2>{featuredProduct.name}</h2>
                <p>{featuredProduct.description || "منتج مختار بعناية، جاهز للطلب والتوصيل."}</p>
              </div>
              <div className="hero-product-offer-price">
                <span>{t.price}</span>
                <strong>{formatPrice(featuredProduct.price, language)}</strong>
              </div>
              <div className="hero-product-offer-actions">
                <span className="hero-offer-note">{t.cod}</span>
                <button className="hero-offer-cta" type="button" onClick={() => setOrderProduct(featuredProduct)}>
                  {t.orderNow} <ArrowUpLeft size={15} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="trust-strip" aria-label={language === "fr" ? "Avantages de la boutique" : "مزايا المتجر"}>
        <div className="store-container trust-grid">
          <div>
            <Truck />
            <span>
              <strong>{t.delivery58}</strong>
              <small>{t.fastSafe}</small>
            </span>
          </div>
          <div>
            <PackageCheck />
            <span>
              <strong>{t.codTitle}</strong>
              <small>{t.payAfter}</small>
            </span>
          </div>
          <div>
            <ShieldCheck />
            <span>
              <strong>{t.guarantee}</strong>
              <small>{t.carefullySelected}</small>
            </span>
          </div>
        </div>
      </section>

      {storeProducts.length > 1 && (
      <section id="products" className="products-section">
        <div className="store-container">
          <div className="section-heading">
            <div>
              <span className="eyebrow eyebrow-dark">{t.collection}</span>
              <h2>{t.collectionTitle}<br /><em>{t.collectionTitle2}</em></h2>
            </div>
            <p>{t.discoverStore.replace("المتجر", storeSettings.name)}</p>
          </div>

          <div className="product-grid">
            {storeProducts.slice(1).map((product) => (
              <article id={`product-${product.id}`} className="product-card" key={product.id}>
                <div className="product-media">
                  <img
                    src={product.image || productCharger}
                    alt={product.name}
                    loading="lazy"
                    width={1024}
                    height={1024}
                    onError={(event) => {
                      event.currentTarget.onerror = null;
                      event.currentTarget.src = productCharger;
                    }}
                  />
                  <span className="product-badge">{product.badge}</span>
                </div>
                <div className="product-info">
                  <span>{product.category}</span>
                  <h3>{product.name}</h3>
                  <p>{product.description}</p>
                  <div className="price-line">
                    <strong>{formatPrice(product.price, language)}</strong>
                    {product.oldPrice ? <del>{formatPrice(product.oldPrice, language)}</del> : null}
                  </div>
                  <div className="product-actions-row">
                    <Button
                      size="icon"
                      variant="outline"
                      className="product-cart-btn"
                      type="button"
                      aria-label={`${t.addToCart}: ${product.name}`}
                      title={t.addToCart}
                      onClick={() => {
                        setCartPulse(true);
                        window.setTimeout(() => setCartPulse(false), 850);
                        setCart((c) => {
                          const i = c.findIndex((x) => x.id === product.id);
                          if (i >= 0) {
                            const n = [...c];
                            const line = n[i];
                             if (!line) return c;
                             n[i] = { ...line, qty: line.qty + 1 };
                            return n;
                          }
                          return [...c, { id: String(product.id), name: product.name, price: product.price, image: product.image, qty: 1 }];
                        });
                      }}
                    >
                      <ShoppingCart size={16} />
                    </Button>
                    <Button
                      size="sm"
                      className="product-order-now"
                      type="button"
                      onClick={() => setOrderProduct(product)}
                    >
                      {t.orderNow}
                    </Button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>
      )}

      <section id="experience" className="experience-section">
        <div className="store-container experience-grid">
          <div>
            <span className="eyebrow">{t.experience}</span>
            <h2>{t.simple}<br /><em>{t.fullTrust}</em></h2>
          </div>
          <ol className="steps-list">
            <li>
              <span>01</span>
              <div>
                <h3>{t.chooseProduct}</h3>
                <p>{t.chooseProductD}</p>
              </div>
            </li>
            <li>
              <span>02</span>
              <div>
                <h3>{t.sendOrder}</h3>
                <p>{t.sendOrderD}</p>
              </div>
            </li>
            <li>
              <span>03</span>
              <div>
                <h3>{t.receiveSafe}</h3>
                <p>{t.receiveSafeD}</p>
              </div>
            </li>
          </ol>
        </div>
      </section>

      <section id="contact" className="contact-section">
        <div className="store-container contact-inner">
          <span className="eyebrow eyebrow-dark">{t.help}</span>
          <h2>
            {storeSettings.contactTitle}
            <br />
            <em>{storeSettings.contactEmphasis}</em>
          </h2>
          <Button asChild size="lg" className="wa-green-btn">
            <a href={whatsappUrl()} target="_blank" rel="noreferrer">
              <WhatsAppIcon size={20} /> {t.talk}
            </a>
          </Button>
        </div>
      </section>

      <footer className="site-footer">
        <div className="store-container footer-top">
          <a href={`/?store=${encodeURIComponent(slug)}`} className="brand">
            <span>{storeSettings.name}</span>
          </a>
          <p>{t.shopEasy}</p>
          {workingHours ? <p className="store-hours-line">{t.workingHours} {workingHours}</p> : null}
          {Object.entries(socialLinks).length > 0 ? (
            <nav className="store-socials" aria-label={language === "fr" ? "Réseaux sociaux" : "روابط التواصل الاجتماعي"}>
              {(["Facebook", "Instagram", "Telegram", "TikTok"] as SocialPlatform[]).map((platform) => {
                const href = safeSocialUrl(platform, socialLinks[platform]);
                return href ? <a key={platform} href={href} target="_blank" rel="noreferrer" className="store-social-link" aria-label={platform} title={platform}><SocialIcon platform={platform} /></a> : null;
              })}
            </nav>
          ) : null}
        </div>
        {!isPro && (
          <div className="free-platform-branding">
            <span className="free-platform-branding-line" aria-hidden="true"></span>
            <a href="/" className="free-platform-branding-link" aria-label="Powered by Dzair Store">
              <span className="free-platform-branding-icon">✦</span>
              <span>
                <small>Powered by</small>
                <strong>DZAIR STORE</strong>
              </span>
            </a>
            <span className="free-platform-branding-note">{t.createStore}</span>
          </div>
        )}
        <div className="store-container footer-bottom">
          <span>© {new Date().getFullYear()} {storeSettings.name}. {language === "fr" ? "Tous droits réservés." : "جميع الحقوق محفوظة."}</span>
          <span className={`footer-status ${storeIsOpen ? "is-open" : "is-closed"}`}>
            <i />
            {storeIsOpen ? t.receiving : t.closedOrders}
          </span>
          <a className="owner-link" href="/dashboard">{t.ownerLogin}</a>
        </div>
      </footer>

      <Button asChild size="icon" className="floating-whatsapp" aria-label={t.contactWhatsapp}>
        <a href={whatsappUrl()} target="_blank" rel="noreferrer">
          <WhatsAppIcon size={24} />
        </a>
      </Button>


      <Button type="button" className={`cart-fab ${cartPulse ? "is-pulsing" : ""}`} onClick={() => setCartOpen(true)} aria-label={t.cart} title={t.openCart}>
          <ShoppingCart size={22} />
          <span className="cart-fab-count numeric">{cart.reduce((s, x) => s + x.qty, 0)}</span>
        </Button>

      {cartOpen && (
        <>
          <div className="cart-drawer-overlay" onClick={() => setCartOpen(false)} />
          <aside className="cart-drawer" dir={language === "fr" ? "ltr" : "rtl"}>
            <div className="cart-drawer-heading"><div><small>{t.selectedOrders}</small><h3>{t.cart}</h3></div><Button variant="ghost" size="icon" type="button" aria-label={t.closeCart} onClick={() => setCartOpen(false)}><X size={18} /></Button></div>
            {cart.length === 0 ? (
              <div className="cart-empty">
                <ShoppingCart size={34} />
                <strong>{t.emptyCart}</strong>
                <span>{t.emptyCartD}</span>
              </div>
            ) : (
              <>
                <div className="cart-lines">
                  {cart.map((l) => (
                    <div key={l.id} className="cart-line">
                      <div className="cart-line-main">
                        <img src={l.image || productCharger} alt="" onError={(event) => { event.currentTarget.onerror = null; event.currentTarget.src = productCharger; }} />
                        <div className="cart-line-info">
                          <strong>{l.name}</strong>
                          <span>{(l.price * l.qty).toLocaleString("ar-DZ")} دج</span>
                          <div className="cart-qty" aria-label={`كمية ${l.name}`}>
                            <button type="button" onClick={() => setCart((c) => c.flatMap((x) => x.id !== l.id ? [x] : x.qty > 1 ? [{ ...x, qty: x.qty - 1 }] : []))} aria-label={t.decrease}><Minus size={13} /></button>
                            <b className="numeric">{l.qty}</b>
                            <button type="button" onClick={() => setCart((c) => c.map((x) => x.id === l.id ? { ...x, qty: x.qty + 1 } : x))} aria-label={t.increase}><Plus size={13} /></button>
                          </div>
                        </div>
                      </div>
                      <button className="cart-remove" type="button" aria-label={`حذف ${l.name}`} onClick={() => setCart((c) => c.filter((x) => x.id !== l.id))}>
                        <Trash2 size={15} /> <span>{t.remove}</span>
                      </button>
                    </div>
                  ))}
                </div>
                <div className="cart-total-row"><span>{t.total}</span><strong className="numeric">{cart.reduce((sum, l) => sum + l.price * l.qty, 0).toLocaleString("ar-DZ")} دج</strong></div>
                <Button
                  type="button"
                  className="cart-checkout"
                  disabled={!storeIsOpen}
                  onClick={() => {
                    if (!storeIsOpen) return;
                    setCartOpen(false);
                    setCheckoutOpen(true);
                  }}
                >
                  {t.checkout} <ArrowLeft size={17} />
                </Button>
              </>
            )}
          </aside>
        </>
      )}

      <OrderModal
        open={checkoutOpen}
        onClose={() => setCheckoutOpen(false)}
        cartLines={cart}
        storeId={storeId}
        storeName={storeSettings.name}
        whatsapp={storeSettings.whatsapp || whatsappNumber}
        deliveryConfig={deliveryConfig}
        onSuccess={() => { setCart([]); setCartOpen(false); setCheckoutOpen(false); }}
      />

      <OrderModal
        open={Boolean(orderProduct)}
        onClose={() => setOrderProduct(null)}
        product={orderProduct}
        storeId={storeId}
        storeName={storeSettings.name}
        whatsapp={storeSettings.whatsapp || whatsappNumber}
        deliveryConfig={deliveryConfig}
      />
    </main>
    </>
  );
}
