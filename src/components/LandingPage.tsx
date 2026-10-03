import { useEffect, useState } from "react";
import {
  ArrowLeft,
  BadgeCheck,
  Check,
  Headphones,
  Package,
  PhoneCall,
  Rocket,
  Settings2,
  ShieldCheck,
  ShoppingBag,
  Star,
  Store,
  Truck,
  Users,
  Zap,
} from "lucide-react";
import { PRICING } from "@/lib/pricing";
import { getLanguage } from "@/i18n";
import { platformTranslations } from "@/i18n/platform";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { loadPlatformStats, recordPlatformVisit, type PlatformStats } from "@/lib/storeData";
import { initMetaPixel, trackMetaEvent } from "@/lib/metaPixel";
import heroHeadphones from "@/assets/hero-headphones.jpg";
import productWatch from "@/assets/product-watch.jpg";
import productEarbuds from "@/assets/product-earbuds.jpg";

const TRUST = [
  { icon: Users, label: "+50,000", ar: "عميل سعيد", fr: "Clients satisfaits" },
  { icon: Star, label: "4.8/5", ar: "تقييم المنصة", fr: "Note de la plateforme" },
  { icon: ShieldCheck, label: "100%", ar: "منتجات آمنة", fr: "Produits sûrs" },
  { icon: Truck, label: "24/72 ساعة", ar: "متوسط التوصيل", fr: "Délai moyen de livraison" },
] as const;

const HOW = [
  { n: "1", icon: Store, ar: ["تصفح واختر", "المنتجات التي تناسبك من متجرك"], fr: ["Parcourez et choisissez", "Les produits qui vous conviennent"] },
  { n: "2", icon: PhoneCall, ar: ["تأكيد عبر واتساب", "للتواصل معك لتأكيد الطلب والتفاصيل"], fr: ["Confirmation sur WhatsApp", "Pour confirmer la commande et les détails"] },
  { n: "3", icon: Package, ar: ["تجهيز الطلب", "نؤكد طلبك ونعدّ الشحنة"], fr: ["Préparation", "Nous confirmons et préparons votre colis"] },
  { n: "4", icon: Truck, ar: ["شحن وتوصيل", "توصيل سريع إلى بابك في أسرع وقت"], fr: ["Expédition et livraison", "Livraison rapide jusqu’à votre porte"] },
] as const;

const FEATURES = [
  { icon: Headphones, ar: ["دعم فني متواصل", "نساعدك في كل خطوة"], fr: ["Support continu", "Nous vous accompagnons à chaque étape"] },
  { icon: ShieldCheck, ar: ["أمان عالي", "لبياناتك وطلباتك"], fr: ["Haute sécurité", "Pour vos données et vos commandes"] },
  { icon: Store, ar: ["تصميم احترافي", "متجاوب مع جميع الأجهزة"], fr: ["Design professionnel", "Adapté à tous les appareils"] },
  { icon: Settings2, ar: ["إعدادات مرنة", "حسب احتياجاتك"], fr: ["Paramètres flexibles", "Selon vos besoins"] },
  { icon: Rocket, ar: ["نمو أعمالك", "مع أدوات التسويق"], fr: ["Développez votre activité", "Avec des outils marketing"] },
] as const;

function formatMoney(n: number) {
  return Math.round(Number(n) || 0)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, "\u202F");
}

export function LandingPage() {
  const language = getLanguage();
  const t = platformTranslations[language].landing;
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [cycle, setCycle] = useState<"monthly" | "yearly">("monthly");

  useEffect(() => {
    initMetaPixel();
    const visitKey = "dzair_platform_visit";
    const today = new Date().toISOString().slice(0, 10);
    if (window.localStorage.getItem(visitKey) !== today) {
      void recordPlatformVisit().then((count) => {
        if (count != null) window.localStorage.setItem(visitKey, today);
      });
    }
    void loadPlatformStats().then(setStats);
  }, []);

  const track = (source: string) => {
    trackMetaEvent("Lead", { content_name: "Landing CTA", content_category: source });
  };

  const proPrice = cycle === "yearly" ? PRICING.pro.priceYearly : PRICING.pro.priceMonthly;
  const shipPrice = cycle === "yearly" ? PRICING.pro_shipping.priceYearly : PRICING.pro_shipping.priceMonthly;

  return (
    <div className="dz-green" dir={language === "fr" ? "ltr" : "rtl"}>
      <header className="dzg-header">
        <a href="/" className="dzg-brand">
          <span className="dzg-logo" aria-hidden><ShoppingBag size={18} /></span>
          <span>
            <strong>Dzair Store</strong>
            <small>{t.brandTag}</small>
          </span>
        </a>
        <nav className="dzg-nav">
          <a href="#home" className="on">{t.navHome}</a>
          <a href="#features">{t.navFeatures}</a>
          <a href="#how">{t.navHow}</a>
          <a href="#pricing">{t.navPricing}</a>
          <a href="#faq">{t.navFaq}</a>
          <a href="/dashboard">{t.contact}</a>
        </nav>
        <div className="dzg-header-actions">
          <LanguageSwitcher />
          <a href="/dashboard" className="dzg-link-login">{t.login}</a>
          <a href="/dashboard" className="dzg-btn" onClick={() => track("header")}>{t.startFree}</a>
        </div>
      </header>

      <main id="home">
        <section className="dzg-hero">
          <div className="dzg-hero-copy">
            <div className="dzg-pill"><i />{t.heroPill}</div>
            <h1>{t.heroTitle}<br />{t.heroTitle2}</h1>
            <p>{t.heroDesc}</p>
            <div className="dzg-hero-actions">
              <a href="/dashboard" className="dzg-btn dzg-btn-lg" onClick={() => track("hero")}>{t.startFree} <ArrowLeft size={18} /></a>
              <a href="#features" className="dzg-btn-outline dzg-btn-lg">{t.discover}</a>
            </div>
            <ul className="dzg-mini-feats">
              <li><Truck size={16} />{t.noCommission}</li>
              <li><Package size={16} />{t.allWilayas}</li>
              <li><ShieldCheck size={16} />{t.secure}</li>
              <li><Zap size={16} />{t.ready}</li>
            </ul>
          </div>
          <div className="dzg-hero-visual" aria-hidden>
            <div className="dzg-badge-float">{t.anyPlace}</div>
            <div className="dzg-laptop">
              <div className="dzg-laptop-bar"><b>DZAIR STORE</b><span>{t.onlineStore}</span></div>
              <div className="dzg-laptop-body">
                <div className="dzg-laptop-main">
                  <img src={heroHeadphones} alt="" />
                  <div><small>{t.original}</small><strong>{t.onePlace}</strong></div>
                </div>
                <div className="dzg-laptop-grid">
                  <div><img src={productWatch} alt="" /><span>{language === "fr" ? "Montre connectée" : "ساعة ذكية"}</span><b>6 900 دج</b></div>
                  <div><img src={productEarbuds} alt="" /><span>{language === "fr" ? "Écouteurs sans fil" : "سماعات لاسلكية"}</span><b>3 500 دج</b></div>
                  <div><img src={heroHeadphones} alt="" /><span>{language === "fr" ? "Casque" : "سماعات"}</span><b>4 900 دج</b></div>
                </div>
              </div>
            </div>
            <div className="dzg-phone">
              <div className="dzg-phone-head"><b>{t.newOrder}</b><small>{t.now}</small></div>
              <div className="dzg-phone-card">
                <div className="dzg-avatar">أ</div>
                <div><b>{t.fromAhmed}</b><span>2 400 دج</span></div>
                <BadgeCheck size={16} />
              </div>
              <button type="button" className="dzg-wa">{t.confirmWhatsapp}</button>
            </div>
          </div>
        </section>

        <section className="dzg-trust">
          {TRUST.map(({ icon: Icon, label, ar, fr }) => (
            <div key={label}><Icon size={20} /><div><b>{label}</b><span>{language === "fr" ? fr : ar}</span></div></div>
          ))}
        </section>

        <section className="dzg-split">
          <article className="dzg-problem">
            <span className="dzg-tag danger">{t.problem}</span>
            <h2>{t.problemsTitle}</h2>
            <ul>
              <li>{t.problem1}</li>
              <li>{t.problem2}</li>
              <li>{t.problem3}</li>
              <li>{t.problem4}</li>
            </ul>
          </article>
          <article className="dzg-solution">
            <span className="dzg-tag ok">{t.solution}</span>
            <h2>{t.solutionTitle} <em>Dzair Store</em></h2>
            <p>{t.solutionDesc}</p>
            <div className="dzg-wa-line"><Check size={16} />{t.whatsappConfirm}</div>
          </article>
        </section>

        <section id="how" className="dzg-how">
          <div className="dzg-section-head"><span className="dzg-tag">{t.howTag}</span><h2>{t.howTitle}</h2></div>
          <div className="dzg-how-grid">
            {[...HOW].reverse().map(({ n, icon: Icon, ar, fr }) => { const copy = language === "fr" ? fr : ar; return (
              <article key={n}>
                <div className="dzg-how-icon"><Icon size={22} /><i>{n}</i></div>
                <h3>{copy[0]}</h3>
                <p>{copy[1]}</p>
              </article>
            ); })}
          </div>
        </section>

        <section className="dzg-dash-preview">
          <div className="dzg-dash-copy">
            <span className="dzg-tag">{t.dashTag}</span>
            <h2>{t.dashTitle}<br />{t.dashTitle2}</h2>
            <p>{t.dashDesc}</p>
            <ul>
              <li><Check size={16} /> {t.dash1}</li>
              <li><Check size={16} /> {t.dash2}</li>
              <li><Check size={16} /> {t.dash3}</li>
              <li><Check size={16} /> {t.dash4}</li>
            </ul>
          </div>
          <div className="dzg-dash-mock" aria-hidden>
            <div className="dzg-dash-screen">
              <div className="dzg-dash-top"><b>Dzair Store</b><span>{t.dashTag}</span></div>
              <div className="dzg-dash-stats">
                <div><small>{t.stores}</small><strong>{stats?.stores ? formatMoney(stats.stores) : "248"}</strong></div>
                <div><small>{t.products}</small><strong>{stats?.products ? formatMoney(stats.products) : "1 235"}</strong></div>
              </div>
              <div className="dzg-dash-rows">
                <div><b>#ORD-4832</b><span>{t.confirmed}</span></div>
                <div><b>#ORD-4831</b><span className="new">{t.new}</span></div>
                <div><b>#ORD-4830</b><span>{t.shipping}</span></div>
              </div>
            </div>
          </div>
        </section>

        <section id="features" className="dzg-features">
          <div className="dzg-section-head"><span className="dzg-tag">{t.featuresTag}</span><h2>{t.featuresTitle}</h2></div>
          <div className="dzg-feat-grid">
            {FEATURES.map(({ icon: Icon, ar, fr }) => { const copy = language === "fr" ? fr : ar; return (
              <article key={copy[0]}>
                <div className="dzg-feat-icon"><Icon size={22} /></div>
                <h3>{copy[0]}</h3>
                <p>{copy[1]}</p>
              </article>
            ); })}
          </div>
        </section>

        <section id="pricing" className="dzg-pricing">
          <div className="dzg-section-head">
            <span className="dzg-tag">{t.pricingTag}</span>
            <h2>{t.pricingTitle}</h2>
            <div className="dzg-cycle">
              <button type="button" className={cycle === "monthly" ? "on" : ""} onClick={() => setCycle("monthly")}>{t.monthly}</button>
              <button type="button" className={cycle === "yearly" ? "on" : ""} onClick={() => setCycle("yearly")}>{t.yearly}</button>
            </div>
          </div>
          <div className="dzg-price-grid dzg-price-grid-3">
            <article>
              <h3>{t.free}</h3>
              <p className="dzg-price">0 <small>دج</small></p>
              <ul>
                <li>{t.upTo} {PRICING.free.productsLimit} {language === "fr" ? "produits" : "منتجات"}</li>
                <li>{t.upTo} {PRICING.free.ordersLimitPerMonth} {t.ordersMonth}</li>
                <li>{t.whatsapp58}</li>
                <li>{t.noCommission}</li>
              </ul>
              <a href="/dashboard" className="dzg-btn-outline" onClick={() => track("pricing-free")}>{t.startFree}</a>
            </article>
            <article className="featured">
              <span className="dzg-badge">{t.proPopular}</span>
              <h3>Pro</h3>
              <p className="dzg-price">{formatMoney(proPrice)} <small>{language === "fr" ? `DZD / ${cycle === "yearly" ? "an" : "mois"}` : `دج / ${cycle === "yearly" ? "سنة" : "شهر"}`}</small></p>
              <ul>
                <li>{t.unlimited}</li>
                <li>{t.removeBrand}</li>
                <li>{t.excel}</li>
                <li>{t.priority}</li>
              </ul>
              <a href="/dashboard" className="dzg-btn" onClick={() => track("pricing-pro")}>{t.upgradePro}</a>
            </article>
            <article>
              <span className="dzg-badge dzg-badge-ship">{t.shippingPlan}</span>
              <h3>{t.proShipping}</h3>
              <p className="dzg-price">{formatMoney(shipPrice)} <small>{language === "fr" ? `DZD / ${cycle === "yearly" ? "an" : "mois"}` : `دج / ${cycle === "yearly" ? "سنة" : "شهر"}`}</small></p>
              <ul>
                <li>{t.allPro}</li>
                <li>{t.carrier}</li>
                <li>{t.tracking}</li>
                <li>{t.topPriority}</li>
              </ul>
              <a href="/dashboard" className="dzg-btn-outline" onClick={() => track("pricing-ship")}>{t.proShipping}</a>
            </article>
          </div>
          <p className="dzg-ship-note">{t.shippingNote}</p>
        </section>

        <section id="faq" className="dzg-faq">
          <div className="dzg-section-head"><span className="dzg-tag">{t.faqTag}</span><h2>{t.faqTitle}</h2></div>
          <div className="dzg-faq-list">
            <details open><summary>{t.q1}</summary><p>{t.a1}</p></details>
            <details><summary>{t.q2}</summary><p>{t.a2}</p></details>
            <details><summary>{t.q3}</summary><p>{t.a3}</p></details>
          </div>
        </section>

        <section className="dzg-final">
          <div>
            <ShoppingBag size={28} />
            <h2>{t.finalTitle}</h2>
            <p>{t.finalDesc}</p>
          </div>
          <a href="/dashboard" className="dzg-btn dzg-btn-lg" onClick={() => track("final")}>{t.startNow} <ArrowLeft size={18} /></a>
        </section>
      </main>

      <footer className="dzg-footer">
        <div className="dzg-footer-brand">
          <span className="dzg-logo"><ShoppingBag size={16} /></span>
          <div><strong>Dzair Store</strong><small>{t.brandTag}</small></div>
        </div>
        <nav>
          <a href="#home">{t.navHome}</a>
          <a href="#features">{t.navFeatures}</a>
          <a href="#how">{t.navHow}</a>
          <a href="#faq">{t.navFaq}</a>
          <a href="/dashboard">{t.contact}</a>
        </nav>
        <p>© {new Date().getFullYear()} Dzair Store — {t.rights}</p>
      </footer>
    </div>
  );
}
