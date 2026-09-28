import { createFileRoute } from "@tanstack/react-router";
import { ArrowLeft, ArrowUpLeft, Menu, PackageCheck, Settings2 as Settings2Icon, ShieldCheck, ShoppingCart, Sparkles, Trash2, Truck, X } from "lucide-react";
import { useEffect, useState } from "react";
import { loadPublicStore, recordStoreVisit, storeToSettings } from "@/lib/storeData";
import { isStorePro, showPlatformBrand } from "@/lib/pricing";
import { OrderModal } from "@/components/OrderModal";
import { WhatsAppIcon } from "@/components/WhatsAppIcon";
import { LandingPage } from "@/components/LandingPage";
import productCharger from "@/assets/product-charger.jpg";
import { Button } from "@/components/ui/button";

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

function formatPrice(value: number) {
  return `${value.toLocaleString("en-US")} دج`;
}

/** / → صفحة الهبوط · /?store=slug → واجهة المتجر */
function HomePage() {
  const [mode, setMode] = useState<"boot" | "landing" | "store">("boot");
  const [slug, setSlug] = useState<string | null>(null);
  const [productId, setProductId] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const s = params.get("store")?.trim() || null;
    const pid = params.get("product")?.trim() || params.get("p")?.trim() || null;
    if (!s) {
      setMode("landing");
      setSlug(null);
      setProductId(null);
      return;
    }
    setSlug(s);
    setProductId(pid);
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
  return slug ? <Storefront slug={slug} focusProductId={productId} /> : <LandingPage />;
}

function Storefront({ slug, focusProductId }: { slug: string; focusProductId?: string | null }) {
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
      <main dir="rtl" className="storefront-empty">
        <div className="empty-store-card">
          <span className="empty-store-mark">DZAIR STORE / 404</span>
          <h1>المتجر غير متاح</h1>
          <p>الرابط غير صحيح أو المتجر غير منشور بعد.</p>
          <Button asChild><a href="/">العودة لصفحة المنصة <ArrowUpLeft size={16} /></a></Button>
        </div>
      </main>
    );
  }

  if (!featuredProduct) {
    return (
      <main dir="rtl" className="storefront-empty">
        <div className="empty-store-card">
          <span className="empty-store-mark">DZAIR STORE / قريباً</span>
          <h1>المتجر قيد الإعداد</h1>
          <p>لم يُضف صاحب المتجر منتجات بعد. تفقّد الرابط لاحقاً.</p>
          <Button asChild><a href="/">العودة لصفحة المنصة <ArrowUpLeft size={16} /></a></Button>
        </div>
      </main>
    );
  }

  return (
    <>
      {storeIsOpen === false && (
        <div className="store-rideau store-rideau-top" role="status">
          <strong>المتجر مغلق حالياً</strong>
          <small>التصفح متاح — استقبال الطلبات متوقف حتى يفتح التاجر</small>
        </div>
      )}

    <main dir="rtl" className="storefront min-h-screen overflow-hidden bg-background text-foreground">
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
            <span className="ab-platform-tag">دزاير ستور</span>
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
                اكتشف المنتجات <ArrowLeft />
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
                <span>السعر</span>
                <strong>{formatPrice(featuredProduct.price)}</strong>
              </div>
              <div className="hero-product-offer-actions">
                <span className="hero-offer-note">✓ الدفع عند الاستلام · توصيل إلى 58 ولاية</span>
                <button className="hero-offer-cta" type="button" onClick={() => setOrderProduct(featuredProduct)}>
                  اطلب المنتج الآن <ArrowUpLeft size={15} />
                </button>
              </div>
            </div>
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

      {storeProducts.length > 1 && (
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
            <p>اكتشف منتجات {storeSettings.name} واختر ما يناسبك.</p>
          </div>

          <div className="product-grid">
            {storeProducts.slice(1).map((product) => (
              <article id={`product-${product.id}`} className="product-card" key={product.id}>
                <div className="product-media">
                  <img
                    src={product.image}
                    alt={product.name}
                    loading="lazy"
                    width={1024}
                    height={1024}
                  />
                  <span className="product-badge">{product.badge}</span>
                </div>
                <div className="product-info">
                  <span>{product.category}</span>
                  <h3>{product.name}</h3>
                  <p>{product.description}</p>
                  <div className="price-line">
                    <strong>{formatPrice(product.price)}</strong>
                    {product.oldPrice ? <del>{formatPrice(product.oldPrice)}</del> : null}
                  </div>
                  <div className="product-actions-row">
                    <Button
                      size="icon"
                      variant="outline"
                      className="product-cart-btn"
                      type="button"
                      aria-label={`أضف ${product.name} إلى السلة`}
                      title="أضف إلى السلة"
                      onClick={() => {
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
                      اطلب الآن
                    </Button>
                    <Button
                      size="icon"
                      className="product-wa-btn"
                      type="button"
                      aria-label={`واتساب — ${product.name}`}
                      title="طلب عبر واتساب"
                      asChild
                    >
                      <a href={whatsappUrl(product)} target="_blank" rel="noreferrer">
                        <WhatsAppIcon size={16} />
                      </a>
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
            {!isPro && <span className="footer-ab-mark">DZAIR STORE</span>}
            <span>{storeSettings.name}</span>
          </a>
          <p>تسوّق بكل سهولة، واطلب ما يعجبك.</p>
          {workingHours ? <p className="store-hours-line">ساعات العمل: {workingHours}</p> : null}
        </div>
        <div className="store-container footer-bottom">
          <span>© {new Date().getFullYear()} {storeSettings.name}. جميع الحقوق محفوظة.</span>
          <span className={`footer-status ${storeIsOpen ? "is-open" : "is-closed"}`}>
            <i />
            {storeIsOpen ? "نستقبل الطلبات الآن" : "المتجر مغلق — لا نستقبل طلبات الآن"}
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


      {cart.length > 0 && (
        <Button type="button" className="cart-fab" onClick={() => setCartOpen(true)} aria-label="السلة">
          <ShoppingCart size={22} />
          <span className="cart-fab-count numeric">{cart.reduce((s, x) => s + x.qty, 0)}</span>
        </Button>
      )}

      {cartOpen && (
        <>
          <div className="cart-drawer-overlay" onClick={() => setCartOpen(false)} />
          <aside className="cart-drawer" dir="rtl">
            <div className="cart-drawer-heading"><div><small>طلباتك المختارة</small><h3>سلتك</h3></div><Button variant="ghost" size="icon" type="button" aria-label="إغلاق السلة" onClick={() => setCartOpen(false)}><X size={18} /></Button></div>
            {cart.map((l) => (
              <div key={l.id} className="cart-line">
                <span>{l.name} × {l.qty}</span>
                <span>{(l.price * l.qty).toLocaleString("ar-DZ")} دج</span>
                <Button variant="ghost" size="icon" type="button" aria-label={`حذف ${l.name}`} onClick={() => setCart((c) => c.filter((x) => x.id !== l.id))}><Trash2 size={16} /></Button>
              </div>
            ))}
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
              إتمام الطلب
            </Button>
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
