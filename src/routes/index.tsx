import { createFileRoute } from "@tanstack/react-router";
import { ArrowLeft, ArrowUpLeft, Menu, PackageCheck, Settings2 as Settings2Icon, ShieldCheck, Sparkles, Truck, X } from "lucide-react";
import { useEffect, useState } from "react";
import { loadPublicStore, storeToSettings } from "@/lib/storeData";
import { isStorePro, showPlatformBrand } from "@/lib/pricing";
import { OrderModal } from "@/components/OrderModal";
import { WhatsAppIcon } from "@/components/WhatsAppIcon";
import { LandingPage } from "@/components/LandingPage";
import productCharger from "@/assets/product-charger.jpg";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "AB Store Noor | متاجر النور — أنشئ متجرك الإلكتروني في الجزائر" },
      { name: "description", content: "منصة جزائرية لإنشاء متاجر إلكترونية مع طلبات واتساب، 58 ولاية، وخطط مجانية وPro. بدون عمولة على المبيعات." },
      { property: "og:title", content: "AB Store Noor | متاجر النور" },
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

function formatPrice(value: number) {
  return `${value.toLocaleString("ar-DZ")} دج`;
}

/** / → صفحة الهبوط · /?store=slug → واجهة المتجر */
function HomePage() {
  const [mode, setMode] = useState<"boot" | "landing" | "store">("boot");
  const [slug, setSlug] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const s = params.get("store")?.trim() || null;
    if (!s) {
      setMode("landing");
      setSlug(null);
      return;
    }
    setSlug(s);
    setMode("store");
  }, []);

  if (mode === "boot") {
    return (
      <main dir="rtl" className="min-h-screen grid place-items-center bg-background text-foreground">
        <p className="text-muted-foreground text-sm">جاري التحميل…</p>
      </main>
    );
  }
  if (mode === "landing") return <LandingPage />;
  return <Storefront slug={slug!} />;
}

function Storefront({ slug }: { slug: string }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [storeSettings, setStoreSettings] = useState(STORE_DEFAULTS);
  const [storeProducts, setStoreProducts] = useState<UiProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [storeId, setStoreId] = useState<string | null>(null);
  const [storeIsOpen, setStoreIsOpen] = useState(true);
  const [cart, setCart] = useState<{id:string;name:string;price:number;image?:string;qty:number}[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [isPro, setIsPro] = useState(false);
  const [merchantLogo, setMerchantLogo] = useState<string | null>(null);
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
        setStoreIsOpen(pub.store.is_open !== false);
        const pro = isStorePro(pub.store);
        setIsPro(pro);
        setMerchantLogo(
          pro && pub.store.merchant_logo_url ? String(pub.store.merchant_logo_url) : null
        );
        setStoreSettings({ ...STORE_DEFAULTS, ...storeToSettings(pub.store) });
        if (pub.products.length) {
          setStoreProducts(
            pub.products.map((p) => ({
              id: String(p.id),
              name: p.name,
              category: p.category,
              description: p.description,
              price: p.price,
              oldPrice: p.oldPrice,
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

  const featuredProduct = storeProducts[0];
  const whatsappUrl = (product?: UiProduct) => {
    const message = product
      ? `السلام عليكم، أريد طلب ${product.name} بسعر ${formatPrice(product.price)} من ${storeSettings.name}.`
      : `السلام عليكم، أريد الاستفسار عن منتجات ${storeSettings.name}.`;
    return `https://wa.me/${storeSettings.whatsapp || whatsappNumber}?text=${encodeURIComponent(message)}`;
  };

  if (loading) {
    return (
      <main dir="rtl" className="min-h-screen bg-background text-foreground grid place-items-center p-6">
        <p className="text-muted-foreground">جاري تحميل المتجر…</p>
      </main>
    );
  }

  if (notFound) {
    return (
      <main dir="rtl" className="min-h-screen bg-[#0b1220] text-white grid place-items-center p-6">
        <div className="empty-store-card" style={{ background: "#111827", color: "#f8fafc", padding: "28px 32px", borderRadius: 20, textAlign: "center", maxWidth: 420 }}>
          <h1 style={{ color: "#f8fafc", marginBottom: 8 }}>المتجر غير متاح</h1>
          <p style={{ color: "#94a3b8", marginBottom: 16 }}>الرابط غير صحيح أو المتجر غير منشور بعد.</p>
          <a href="/" style={{ color: "#38bdf8", fontWeight: 700 }}>العودة لصفحة المنصة</a>
        </div>
      </main>
    );
  }

  if (!featuredProduct) {
    return (
      <main dir="rtl" className="min-h-screen bg-[#0b1220] text-white grid place-items-center p-6">
        <div className="empty-store-card" style={{ background: "#111827", color: "#f8fafc", padding: "28px 32px", borderRadius: 20, textAlign: "center", maxWidth: 420 }}>
          <h1 style={{ color: "#f8fafc", marginBottom: 8 }}>المتجر قيد الإعداد</h1>
          <p style={{ color: "#94a3b8", marginBottom: 16 }}>لم يُضف صاحب المتجر منتجات بعد. تفقّد الرابط لاحقاً.</p>
          <a href="/" style={{ color: "#38bdf8", fontWeight: 700 }}>العودة لصفحة المنصة</a>
        </div>
      </main>
    );
  }

  return (
    <main dir="rtl" className="min-h-screen overflow-hidden bg-background text-foreground">
      <div className="announcement">
        <p>
          <Sparkles aria-hidden="true" /> {storeSettings.announcement}
        </p>
      </div>

      {/* Free: بانر المنصة بعرض كامل · Pro: يُخفى ويبقى اسم المتجر فقط */}
      {!isPro && (
        <div className="ab-platform-banner" role="banner">
          <div className="ab-platform-banner-inner">
            <span className="ab-platform-wordmark">AB STORE</span>
            <span className="ab-platform-tag">متاجر النور · NOOR</span>
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
            <span className="brand-store-name-main">
              {storeSettings.name || "متجري"}
            </span>
          </a>

          <nav className="hidden items-center gap-8 md:flex" aria-label="التنقل الرئيسي">
            <a className="nav-link" href="#products">المتجر</a>
            <a className="nav-link" href="#experience">تجربتنا</a>
            <a className="nav-link" href="#contact">تواصل معنا</a>
          </nav>

          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" className="hidden sm:inline-flex store-admin-link">
              <a href="/dashboard">
                <Settings2Icon /> إدارة المتجر
              </a>
            </Button>
            <Button asChild variant="outline" className="hidden sm:inline-flex">
              <a href={whatsappUrl()} target="_blank" rel="noreferrer">
                <WhatsAppIcon size={18} /> واتساب
              </a>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setMenuOpen((value) => !value)}
              aria-label={menuOpen ? "إغلاق القائمة" : "فتح القائمة"}
              aria-expanded={menuOpen}
            >
              {menuOpen ? <X /> : <Menu />}
            </Button>
          </div>
        </div>
        {menuOpen && (
          <nav className="mobile-menu" aria-label="قائمة الهاتف">
            <a href="#products" onClick={() => setMenuOpen(false)}>المتجر</a>
            <a href="#experience" onClick={() => setMenuOpen(false)}>تجربتنا</a>
            <a href="#contact" onClick={() => setMenuOpen(false)}>تواصل معنا</a>
          </nav>
        )}
      </header>

      <section id="top" className="hero-section">
        <img className="hero-image" src={featuredProduct.image} alt={featuredProduct.name} width={1536} height={1024} />
        <div className="hero-shade" />
        <div className="store-container hero-content">
          <div className="hero-copy">
            <span className="eyebrow">{featuredProduct.badge || "منتجاتنا"}</span>
            <h1>
              {storeSettings.heroTitle}
              <br />
              <em>{storeSettings.heroEmphasis}</em>
            </h1>
            <p>{storeSettings.heroDescription}</p>
            <div className="flex flex-wrap items-center gap-3">
              <Button size="lg" className="hero-button" type="button" onClick={() => setOrderProduct(featuredProduct)}>
                اطلب الآن <ArrowUpLeft />
              </Button>
              <a href="#products" className="text-link">
                اكتشف المجموعة <ArrowLeft />
              </a>
            </div>
          </div>
          <div className="hero-price">
            <span>ابتداءً من</span>
            <strong>{formatPrice(featuredProduct.price)}</strong>
          </div>
        </div>
      </section>

      <section className="trust-strip" aria-label="مزايا المتجر">
        <div className="store-container trust-grid">
          <div>
            <Truck />
            <span>
              <strong>توصيل إلى 58 ولاية</strong>
              <small>سريع وآمن إلى بابك</small>
            </span>
          </div>
          <div>
            <PackageCheck />
            <span>
              <strong>الدفع عند الاستلام</strong>
              <small>ادفع بعد وصول طلبك</small>
            </span>
          </div>
          <div>
            <ShieldCheck />
            <span>
              <strong>ضمان حقيقي</strong>
              <small>منتجات مختارة بعناية</small>
            </span>
          </div>
        </div>
      </section>

      <section id="products" className="products-section">
        <div className="store-container">
          <div className="section-heading">
            <div>
              <span className="eyebrow eyebrow-dark">المجموعة المختارة</span>
              <h2>
                أدوات يومية،
                <br />
                <em>بتنفيذ استثنائي.</em>
              </h2>
            </div>
            <p>نختار كل قطعة لجودتها، بساطتها، وقدرتها على تحسين تفاصيل يومك.</p>
          </div>

          <div className="product-grid">
            {storeProducts.map((product, index) => (
              <article className={`product-card ${index === 0 ? "product-card-featured" : ""}`} key={product.id}>
                <div className="product-media">
                  <img
                    src={product.image}
                    alt={product.name}
                    loading="lazy"
                    width={index === 0 ? 1536 : 1024}
                    height={1024}
                  />
                  <span className="product-badge">{product.badge}</span>
                  <Button
                    size="icon"
                    className="product-action"
                    type="button"
                    aria-label={`اطلب ${product.name}`}
                    onClick={() => {
                      setCart((c) => {
                        const i = c.findIndex((x) => x.id === product.id);
                        if (i >= 0) {
                          const n = [...c];
                          n[i] = { ...n[i], qty: n[i].qty + 1 };
                          return n;
                        }
                        return [...c, { id: String(product.id), name: product.name, price: product.price, image: product.image, qty: 1 }];
                      });
                    }}
                  >
                    <ArrowUpLeft />
                  </Button>
                </div>
                <div className="product-info">
                  <span>{product.category}</span>
                  <h3>{product.name}</h3>
                  <p>{product.description}</p>
                  <div className="price-line">
                    <strong>{formatPrice(product.price)}</strong>
                    {product.oldPrice ? <del>{formatPrice(product.oldPrice)}</del> : null}
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="experience" className="experience-section">
        <div className="store-container experience-grid">
          <div>
            <span className="eyebrow">من الاختيار إلى بابك</span>
            <h2>
              تجربة بسيطة.
              <br />
              <em>ثقة كاملة.</em>
            </h2>
          </div>
          <ol className="steps-list">
            <li>
              <span>01</span>
              <div>
                <h3>اختر منتجك</h3>
                <p>تصفّح المجموعة واعثر على القطعة المناسبة.</p>
              </div>
            </li>
            <li>
              <span>02</span>
              <div>
                <h3>أرسل طلبك</h3>
                <p>نموذج سريع + واتساب بتفاصيل المنتج والسعر.</p>
              </div>
            </li>
            <li>
              <span>03</span>
              <div>
                <h3>استلمه بأمان</h3>
                <p>نؤكد الطلب ونوصله إليك، والدفع عند الاستلام.</p>
              </div>
            </li>
          </ol>
        </div>
      </section>

      <section id="contact" className="contact-section">
        <div className="store-container contact-inner">
          <span className="eyebrow eyebrow-dark">هل تحتاج مساعدة؟</span>
          <h2>
            {storeSettings.contactTitle}
            <br />
            <em>{storeSettings.contactEmphasis}</em>
          </h2>
          <Button asChild size="lg" className="wa-green-btn">
            <a href={whatsappUrl()} target="_blank" rel="noreferrer">
              <WhatsAppIcon size={20} /> تحدث معنا
            </a>
          </Button>
        </div>
      </section>

      <footer className="site-footer">
        <div className="store-container footer-top">
          <a href={`/?store=${encodeURIComponent(slug)}`} className="brand">
            {!isPro && <span className="footer-ab-mark">AB STORE</span>}
            <span>{storeSettings.name}</span>
          </a>
          <p>تقنية مختارة بذوق. تجربة بلا تعقيد.</p>
        </div>
        <div className="store-container footer-bottom">
          <span>© {new Date().getFullYear()} {storeSettings.name}. جميع الحقوق محفوظة.</span>
          <span className="footer-status">
            <i /> نستقبل الطلبات الآن
          </span>
          <a className="owner-link" href="/dashboard">
            دخول صاحب المتجر · لوحة التحكم
          </a>
        </div>
      </footer>

      <Button asChild size="icon" className="floating-whatsapp" aria-label="تواصل معنا عبر واتساب">
        <a href={whatsappUrl()} target="_blank" rel="noreferrer">
          <WhatsAppIcon size={24} />
        </a>
      </Button>

      
      {storeIsOpen === false && mode === "store" && (
        <div className="store-rideau">
          المتجر مغلق حالياً
          <small>التصفح متاح — استقبال الطلبات متوقف حتى يفتح التاجر الريدو</small>
        </div>
      )}

      {mode === "store" && cart.length > 0 && (
        <button type="button" className="cart-fab" onClick={() => setCartOpen(true)} aria-label="السلة">
          🛒
          <span className="cart-fab-count">{cart.reduce((s, x) => s + x.qty, 0)}</span>
        </button>
      )}

      {cartOpen && (
        <>
          <div className="cart-drawer-overlay" onClick={() => setCartOpen(false)} />
          <aside className="cart-drawer" dir="rtl">
            <h3>سلتك</h3>
            {cart.map((l) => (
              <div key={l.id} className="cart-line">
                <span>{l.name} × {l.qty}</span>
                <span>{(l.price * l.qty).toLocaleString("ar-DZ")} دج</span>
                <button type="button" onClick={() => setCart((c) => c.filter((x) => x.id !== l.id))}>حذف</button>
              </div>
            ))}
            <button
              type="button"
              className="cart-checkout"
              disabled={!storeIsOpen}
              onClick={() => {
                if (!storeIsOpen) return;
                setCartOpen(false);
                setCheckoutOpen(true);
              }}
            >
              إتمام الطلب
            </button>
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
        onSuccess={() => setCart([])}
      />

      <OrderModal
        open={Boolean(orderProduct)}
        onClose={() => setOrderProduct(null)}
        product={orderProduct}
        storeId={storeId}
        storeName={storeSettings.name}
        whatsapp={storeSettings.whatsapp || whatsappNumber}
      />
    </main>
  );
}
