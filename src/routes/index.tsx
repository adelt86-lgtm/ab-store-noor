import { createFileRoute } from "@tanstack/react-router";
import { ArrowLeft, ArrowUpLeft, Check, Headphones, Menu, MessageCircle, PackageCheck, Settings2 as Settings2Icon, ShieldCheck, Sparkles, Truck, X } from "lucide-react";
import { useEffect, useState } from "react";
import { loadPublicStore, storeToSettings } from "@/lib/storeData";
import { OrderModal } from "@/components/OrderModal";
import { showPlatformBrand, isStorePro } from "@/lib/pricing";
import { WhatsAppIcon } from "@/components/WhatsAppIcon";
import productCharger from "@/assets/product-charger.jpg";

import heroHeadphones from "@/assets/hero-headphones.jpg";
import productEarbuds from "@/assets/product-earbuds.jpg";
import productWatch from "@/assets/product-watch.jpg";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "متجر النور | إلكترونيات بتصميم استثنائي" },
      { name: "description", content: "تسوّق إلكترونيات مختارة بعناية مع الدفع عند الاستلام والتوصيل إلى 58 ولاية." },
      { property: "og:title", content: "متجر النور | إلكترونيات بتصميم استثنائي" },
      { property: "og:description", content: "منتجات تقنية أصلية، أسعار استثنائية، وطلب سريع عبر واتساب." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Storefront,
});

const whatsappNumber = "213555000000";

const STORE_DEFAULTS = { name: "متجر النور", whatsapp: whatsappNumber, announcement: "توصيل مجاني للطلبات فوق 15,000 دج", heroTitle: "الصوت،", heroEmphasis: "كما يجب أن يُسمع.", heroDescription: "هندسة صوتية دقيقة. هدوء بلا حدود. تصميم صُنع ليبقى.", contactTitle: "نحن أقرب", contactEmphasis: "مما تتخيّل." };

const products = [
  {
    id: 1,
    name: "سماعات Noir Pro",
    category: "صوتيات",
    description: "عزل نشط للضوضاء وصوت مكاني بتفاصيل استثنائية.",
    price: 24900,
    oldPrice: 28900,
    badge: "اختيارنا",
    image: heroHeadphones,
  },
  {
    id: 2,
    name: "سماعات Aero Buds",
    category: "صوتيات",
    description: "صوت نقي، راحة طوال اليوم، وعلبة شحن صغيرة.",
    price: 8900,
    oldPrice: 10500,
    badge: "الأكثر طلباً",
    image: productEarbuds,
  },
  {
    id: 3,
    name: "ساعة Mono S1",
    category: "أجهزة ذكية",
    description: "شاشة فائقة الوضوح ومتابعة متقدمة لنشاطك اليومي.",
    price: 14500,
    oldPrice: null,
    badge: "جديد",
    image: productWatch,
  },
  {
    id: 4,
    name: "شاحن Flux 65W",
    category: "إكسسوارات",
    description: "طاقة سريعة بحجم صغير مع كابل مضفّر متين.",
    price: 3900,
    oldPrice: 4700,
    badge: "عرض",
    image: productCharger,
  },
];

function formatPrice(value: number) {
  return `${value.toLocaleString("ar-DZ")} دج`;
}

export function Storefront() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [storeSettings, setStoreSettings] = useState(STORE_DEFAULTS);
  const [storeProducts, setStoreProducts] = useState(products);
  const [storeId, setStoreId] = useState<string | null>(null);
  const [orderProduct, setOrderProduct] = useState<(typeof products)[number] | null>(null);
  const [merchantLogo, setMerchantLogo] = useState<string | null>(null);
  const [platformBrand, setPlatformBrand] = useState(true);
  const [storePlan, setStorePlan] = useState<string>("free");
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const params = new URLSearchParams(window.location.search);
        const slug = params.get("store") || (import.meta as any).env?.VITE_DEFAULT_STORE_SLUG || "noor";
        const pub = await loadPublicStore(String(slug));
        if (cancelled || !pub) return;
        setStoreId(pub.store.id);
          setStoreSettings({ ...STORE_DEFAULTS, ...storeToSettings(pub.store) });
          setMerchantLogo(pub.store.merchant_logo_url || null);
          setPlatformBrand(showPlatformBrand(pub.store));
          setStorePlan(isStorePro(pub.store) ? "pro" : "free");
        if (pub.products.length) {
          setStoreProducts(pub.products.map((p) => ({
            id: p.id as any,
            name: p.name,
            category: p.category,
            description: p.description,
            price: p.price,
            oldPrice: p.oldPrice,
            badge: p.badge,
            image: p.image || productCharger,
          })));
        }
      } catch (e) {
        console.warn("[storefront] load failed", e);
      }
    })();
    return () => { cancelled = true; };
  }, []);
  const featuredProduct = storeProducts[0];
  const whatsappUrl = (product?: (typeof storeProducts)[number]) => {
    const message = product ? `السلام عليكم، أريد طلب ${product.name} بسعر ${formatPrice(product.price)} من ${storeSettings.name}.` : `السلام عليكم، أريد الاستفسار عن منتجات ${storeSettings.name}.`;
    return `https://wa.me/${storeSettings.whatsapp || whatsappNumber}?text=${encodeURIComponent(message)}`;
  };

  if (!featuredProduct) {
    return (
      <main dir="rtl" className="min-h-screen bg-background text-foreground grid place-items-center p-6">
        <div className="empty-store-card">
          <h1>المتجر جاهز</h1>
          <p>أضف أول منتج من لوحة التحكم لبدء عرض المتجر.</p>
          <Button asChild><a href="/dashboard">فتح لوحة التحكم</a></Button>
        </div>
      </main>
    );
  }

  return (
    <main dir="rtl" className="min-h-screen overflow-hidden bg-background text-foreground">
      <div className="announcement">
        <p><Sparkles aria-hidden="true" /> {storeSettings.announcement}</p>
      </div>

      <header className="site-header">
        <div className="store-container flex h-16 items-center justify-between">
          <a href="#top" className="brand brand-with-logo" aria-label={storeSettings.name}>
            {platformBrand ? (
              <img src="/logo-ab.png" alt="AB Store Noor" className="brand-logo brand-logo-platform" width={160} height={48} />
            ) : merchantLogo ? (
              <img src={merchantLogo} alt={storeSettings.name} className="brand-logo brand-logo-merchant" width={160} height={48} />
            ) : (
              <span className="brand-symbol" aria-hidden="true" />
            )}
            <span className="brand-store-name">{storeSettings.name.replace("متجر ", "")}</span>
          </a>

          <nav className="hidden items-center gap-8 md:flex" aria-label="التنقل الرئيسي">
            <a className="nav-link" href="#products">المتجر</a>
            <a className="nav-link" href="#experience">تجربتنا</a>
            <a className="nav-link" href="#contact">تواصل معنا</a>
          </nav>

          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" className="hidden sm:inline-flex store-admin-link">
              <a href="/dashboard"><Settings2Icon /> إدارة المتجر</a>
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
        <img
          className="hero-image"
          src={featuredProduct.image}
          alt={featuredProduct.name}
          width={1536}
          height={1024}
        />
        <div className="hero-shade" />
        <div className="store-container hero-content">
          <div className="hero-copy">
            <span className="eyebrow">NOIR PRO · الإصدار 01</span>
            <h1>{storeSettings.heroTitle}<br /><em>{storeSettings.heroEmphasis}</em></h1>
            <p>{storeSettings.heroDescription}</p>
            <div className="flex flex-wrap items-center gap-3">
              <Button size="lg" className="hero-button" type="button" onClick={() => setOrderProduct(featuredProduct)}>
                  اطلب الآن <ArrowUpLeft />
              </Button>
              <a href="#products" className="text-link">اكتشف المجموعة <ArrowLeft /></a>
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
          <div><Truck /><span><strong>توصيل إلى 58 ولاية</strong><small>سريع وآمن إلى بابك</small></span></div>
          <div><PackageCheck /><span><strong>الدفع عند الاستلام</strong><small>ادفع بعد وصول طلبك</small></span></div>
          <div><ShieldCheck /><span><strong>ضمان حقيقي</strong><small>منتجات مختارة بعناية</small></span></div>
        </div>
      </section>

      <section id="products" className="products-section">
        <div className="store-container">
          <div className="section-heading">
            <div>
              <span className="eyebrow eyebrow-dark">المجموعة المختارة</span>
              <h2>أدوات يومية،<br /><em>بتنفيذ استثنائي.</em></h2>
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
                  <Button size="icon" className="product-action" type="button" aria-label={`اطلب ${product.name}`} onClick={() => setOrderProduct(product)}>
                    <ArrowUpLeft />
                  </Button>
                </div>
                <div className="product-info">
                  <span>{product.category}</span>
                  <h3>{product.name}</h3>
                  <p>{product.description}</p>
                  <div className="price-line">
                    <strong>{formatPrice(product.price)}</strong>
                    {product.oldPrice && <del>{formatPrice(product.oldPrice)}</del>}
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
            <h2>تجربة بسيطة.<br /><em>ثقة كاملة.</em></h2>
          </div>
          <ol className="steps-list">
            <li><span>01</span><div><h3>اختر منتجك</h3><p>تصفّح المجموعة واعثر على القطعة المناسبة.</p></div></li>
            <li><span>02</span><div><h3>أرسل طلبك</h3><p>رسالة واتساب جاهزة بتفاصيل المنتج والسعر.</p></div></li>
            <li><span>03</span><div><h3>استلمه بأمان</h3><p>نؤكد الطلب ونوصله إليك، والدفع عند الاستلام.</p></div></li>
          </ol>
        </div>
      </section>

      <section id="contact" className="contact-section">
        <div className="store-container contact-inner">
          <span className="eyebrow eyebrow-dark">هل تحتاج مساعدة؟</span>
          <h2>{storeSettings.contactTitle}<br /><em>{storeSettings.contactEmphasis}</em></h2>
          <Button asChild size="lg" className="wa-green-btn">
            <a href={whatsappUrl()} target="_blank" rel="noreferrer"><WhatsAppIcon size={20} /> تحدث معنا</a>
          </Button>
        </div>
      </section>

      <footer className="site-footer">
        <div className="store-container footer-top">
          <a href="#top" className="brand"><span className="brand-symbol" aria-hidden="true" /><span>{storeSettings.name.replace("متجر ", "")}</span></a>
          <p>تقنية مختارة بذوق. تجربة بلا تعقيد.</p>
        </div>
        <div className="store-container footer-bottom">
          <span>© 2026 متجر النور. جميع الحقوق محفوظة.</span>
          <span className="footer-status"><i /> نستقبل الطلبات الآن</span>
          <a className="owner-link" href="/dashboard">دخول صاحب المتجر · لوحة التحكم</a>
        </div>
      </footer>

      {platformBrand && (
        <div className="powered-by-ab">
          <a href="https://ab-store-noor.vercel.app" target="_blank" rel="noreferrer">
            <img src="/logo-ab.png" alt="" width={20} height={20} />
            <span>مدعوم بواسطة <strong>AB Store Noor</strong> · متاجر النور</span>
          </a>
        </div>
      )}

      <Button asChild size="icon" className="floating-whatsapp" aria-label="تواصل معنا عبر واتساب">
        <a href={whatsappUrl()} target="_blank" rel="noreferrer"><WhatsAppIcon size={24} /></a>
      </Button>

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
