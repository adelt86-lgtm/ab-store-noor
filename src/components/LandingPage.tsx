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
import landingFashion from "@/assets/landing-fashion.webp";
import landingElectronics from "@/assets/landing-electronics.webp";
import landingFood from "@/assets/landing-food.webp";
import landingBeauty from "@/assets/landing-beauty.webp";
import landingFurniture from "@/assets/landing-furniture.webp";
import landingKids from "@/assets/landing-kids.webp";
import landingSports from "@/assets/landing-sports.webp";
import landingAccessories from "@/assets/landing-accessories.webp";
import landingPerfume from "@/assets/landing-perfume.webp";
import landingHomeKitchen from "@/assets/landing-home-kitchen.webp";

const HOW = [
  { n: "1", icon: Store, ar: ["أنشئ متجرك", "اختر اسم المتجر وأضف بيانات التواصل والهوية"], fr: ["Créez votre boutique", "Choisissez le nom, les coordonnées et l’identité de votre boutique"] },
  { n: "2", icon: Package, ar: ["أضف منتجاتك", "أدخل الأسعار والصور والمخزون وVariants عند الحاجة"], fr: ["Ajoutez vos produits", "Ajoutez prix, photos, stock et variantes si nécessaire"] },
  { n: "3", icon: ShoppingBag, ar: ["استقبل الطلبات", "الزبون يختار المنتج ويملأ Checkout ثم يُحفظ الطلب"], fr: ["Recevez les commandes", "Le client choisit, passe au checkout et la commande est enregistrée"] },
  { n: "4", icon: Truck, ar: ["أكمل عبر واتساب", "تصل تفاصيل الطلب إلى واتساب وتبقى محفوظة في لوحة التاجر"], fr: ["Finalisez sur WhatsApp", "Les détails arrivent sur WhatsApp et restent dans votre tableau de bord"] },
] as const;



const LANDING_CATEGORIES = [
  {
    image: landingFashion,
    ar: ["الملابس والأزياء", "اعرض تشكيلتك بطريقة أنيقة وسهلة."],
    fr: ["Mode & vêtements", "Présentez votre collection avec élégance."],
  },
  {
    image: landingElectronics,
    ar: ["الإلكترونيات", "متجر سريع لعرض الأجهزة والإكسسوارات."],
    fr: ["Électronique", "Une boutique rapide pour vos appareils et accessoires."],
  },
  {
    image: landingFood,
    ar: ["المطاعم والوجبات", "استقبل طلبات الزبائن بسهولة."],
    fr: ["Restaurants & repas", "Recevez facilement les commandes de vos clients."],
  },
  {
    image: landingBeauty,
    ar: ["التجميل والعناية", "اعرض منتجات العناية والجمال بشكل احترافي."],
    fr: ["Beauté & soins", "Présentez vos produits beauté avec professionnalisme."],
  },
  {
    image: landingFurniture,
    ar: ["الأثاث والديكور", "حوّل منتجاتك إلى تجربة تسوق جذابة."],
    fr: ["Mobilier & décoration", "Transformez vos produits en une belle expérience."],
  },
  {
    image: landingKids,
    ar: ["ألعاب الأطفال", "اعرض منتجات الأطفال في متجر بسيط وسريع."],
    fr: ["Jouets pour enfants", "Présentez vos produits dans une boutique simple et rapide."],
  },
  {
    image: landingSports,
    ar: ["الرياضة واللياقة", "متجر مناسب لمعدات الرياضة واللياقة."],
    fr: ["Sport & fitness", "Une boutique adaptée aux équipements sportifs."],
  },
  {
    image: landingAccessories,
    ar: ["الإكسسوارات", "اعرض التفاصيل التي تجعل منتجاتك مميزة."],
    fr: ["Accessoires", "Mettez en valeur les détails qui font la différence."],
  },
  {
    image: landingPerfume,
    ar: ["العطور", "قدّم تشكيلتك بطريقة أنيقة واحترافية."],
    fr: ["Parfums", "Présentez votre collection avec élégance."],
  },
  {
    image: landingHomeKitchen,
    ar: ["المنزل والمطبخ", "كل ما تحتاجه لتقديم منتجات منزلك أونلاين."],
    fr: ["Maison & cuisine", "Présentez vos produits maison facilement en ligne."],
  },
] as const;

const FEATURES = [
  { icon: Store, ar: ["متجر باسمك", "رابط متجر جاهز للمشاركة على Facebook وInstagram وWhatsApp"], fr: ["Une boutique à votre nom", "Un lien prêt à partager sur Facebook, Instagram et WhatsApp"] },
  { icon: ShoppingBag, ar: ["طلبات منظمة", "Checkout واحد يحفظ بيانات الزبون والمنتجات والتوصيل"], fr: ["Commandes structurées", "Un checkout unique pour les données client, produits et livraison"] },
  { icon: Package, ar: ["منتجات وVariants", "السعر والمخزون لكل منتج أو Variant عند الحاجة"], fr: ["Produits et variantes", "Prix et stock par produit ou par variante lorsque nécessaire"] },
  { icon: Truck, ar: ["التوصيل", "إعدادات توصيل وطنية أو محلية وإدارة الطلبات من اللوحة"], fr: ["Livraison", "Livraison nationale ou locale et gestion depuis le tableau de bord"] },
  { icon: Zap, ar: ["التسويق والتحليلات", "UTM وfbclid وMeta Pixel وإسناد الطلبات للمصدر عند توفر البيانات"], fr: ["Marketing & analytics", "UTM, fbclid, Meta Pixel et attribution des commandes lorsque les données sont disponibles"] },
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

  const [landingIndex, setLandingIndex] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setLandingIndex((current) => (current + 1) % LANDING_CATEGORIES.length);
    }, 4500);

    return () => window.clearInterval(timer);
  }, []);

  const landingCategory = LANDING_CATEGORIES[landingIndex];
  const landingCopy =
    language === "fr" ? landingCategory.fr : landingCategory.ar;

  const goToLandingCategory = (index: number) => {
    setLandingIndex(
      (index + LANDING_CATEGORIES.length) % LANDING_CATEGORIES.length
    );
  };

  


  return (
    <div className="dz-green" dir={language === "fr" ? "ltr" : "rtl"}>
      <style>{`
        .dzg-category-showcase {
          position: relative;
          padding: 78px 0 86px;
          overflow: hidden;
          text-align: center;
        }
      
        .dzg-category-showcase::before {
          content: "";
          position: absolute;
          width: 620px;
          height: 620px;
          top: 110px;
          left: 50%;
          transform: translateX(-50%);
          border-radius: 50%;
          background: rgba(50,205,125,.06);
          filter: blur(45px);
          pointer-events: none;
        }
      
        .dzg-category-head {
          position: relative;
          z-index: 5;
          max-width: 820px;
          margin: 0 auto 28px;
          padding: 0 20px;
        }
      
        .dzg-category-kicker {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 8px 15px;
          border: 1px solid rgba(40,180,110,.15);
          border-radius: 999px;
          background: rgba(40,180,110,.07);
          color: #168653;
          font-size: 14px;
          font-weight: 850;
        }
      
        .dzg-category-kicker-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #20ad68;
          box-shadow: 0 0 0 5px rgba(32,173,104,.10);
        }
      
        .dzg-category-head h2 {
          margin: 17px 0 10px;
          color: #075b3a;
          font-size: clamp(34px,5vw,58px);
          line-height: 1.12;
          font-weight: 950;
          letter-spacing: -.045em;
        }
      
        .dzg-category-head p {
          margin: 0 auto;
          max-width: 680px;
          color: rgba(18,70,50,.68);
          font-size: 17px;
          line-height: 1.8;
        }
      
        .dzg-category-tabs {
          position: relative;
          z-index: 6;
          display: flex;
          justify-content: center;
          gap: 8px;
          max-width: 1180px;
          margin: 0 auto 30px;
          padding: 0 20px;
          overflow-x: auto;
          scrollbar-width: none;
        }
      
        .dzg-category-tabs::-webkit-scrollbar {
          display: none;
        }
      
        .dzg-category-tabs button {
          flex: 0 0 auto;
          min-height: 50px;
          padding: 0 20px;
          border: 1px solid rgba(30,125,85,.14);
          border-radius: 999px;
          background: rgba(255,255,255,.88);
          color: rgba(18,77,54,.72);
          font: inherit;
          font-size: 14px;
          font-weight: 850;
          white-space: nowrap;
          cursor: pointer;
          transition: .25s ease;
        }
      
        .dzg-category-tabs button:hover {
          transform: translateY(-2px);
          border-color: rgba(35,181,107,.30);
        }
      
        .dzg-category-tabs button.is-active {
          border-color: transparent;
          background: linear-gradient(135deg,#16a766,#078652);
          color: #fff;
          box-shadow: 0 12px 28px rgba(20,157,91,.20);
        }
      
        .dzg-category-carousel {
          position: relative;
          z-index: 3;
          width: 100%;
          height: 500px;
        }
      
        .dzg-category-stage {
          position: relative;
          width: min(1240px,100%);
          height: 100%;
          margin: auto;
          overflow: hidden;
        }
      
        .dzg-category-card {
          position: absolute;
          top: 50%;
          width: 350px;
          height: 395px;
          overflow: hidden;
          border-radius: 30px;
          border: 1px solid rgba(10,90,58,.10);
          background: #eaf4ef;
          box-shadow: 0 25px 70px rgba(0,0,0,.12);
          transform: translateY(-50%);
          transition:
            left .65s cubic-bezier(.22,.61,.36,1),
            right .65s cubic-bezier(.22,.61,.36,1),
            width .65s cubic-bezier(.22,.61,.36,1),
            height .65s cubic-bezier(.22,.61,.36,1),
            transform .65s cubic-bezier(.22,.61,.36,1),
            opacity .65s ease;
        }
      
        .dzg-category-card img {
          width: 100%;
          height: 100%;
          display: block;
          object-fit: cover;
        }
      
        .dzg-category-card-shade {
          position: absolute;
          inset: 0;
          background: linear-gradient(
            180deg,
            rgba(0,0,0,.02) 30%,
            rgba(0,0,0,.10) 58%,
            rgba(0,0,0,.74) 100%
          );
        }
      
        .dzg-category-card.is-active {
          z-index: 3;
          left: 50%;
          width: min(760px,62vw);
          height: 445px;
          transform: translate(-50%,-50%);
          opacity: 1;
        }
      
        .dzg-category-card.is-prev {
          z-index: 1;
          left: 0;
          transform: translate(-8%,-50%) scale(.90);
          opacity: .92;
        }
      
        .dzg-category-card.is-next {
          z-index: 1;
          right: 0;
          transform: translate(8%,-50%) scale(.90);
          opacity: .92;
        }
      
        .dzg-category-card.is-prev .dzg-category-card-shade,
        .dzg-category-card.is-next .dzg-category-card-shade {
          background: linear-gradient(
            180deg,
            rgba(0,0,0,.05),
            rgba(0,0,0,.40)
          );
        }
      
        .dzg-category-card-content {
          position: absolute;
          z-index: 4;
          inset-inline: 0;
          bottom: 0;
          padding: 34px 38px 36px;
          text-align: start;
        }
      
        .dzg-category-number {
          display: block;
          margin-bottom: 5px;
          color: rgba(255,255,255,.72);
          font-size: 12px;
          font-weight: 900;
          letter-spacing: .16em;
          direction: ltr;
        }
      
        .dzg-category-card-content h3 {
          margin: 0;
          color: #fff;
          font-size: clamp(30px,4vw,44px);
          line-height: 1.08;
          font-weight: 950;
        }
      
        .dzg-category-card-content p {
          max-width: 500px;
          margin: 9px 0 18px;
          color: rgba(255,255,255,.88);
          font-size: 15px;
          line-height: 1.7;
        }
      
        .dzg-category-cta {
          display: inline-flex;
          align-items: center;
          gap: 9px;
          min-height: 46px;
          padding: 0 19px;
          border-radius: 999px;
          background: #20b56b;
          color: #fff;
          text-decoration: none;
          font-size: 14px;
          font-weight: 900;
          box-shadow: 0 12px 30px rgba(25,181,103,.28);
          transition: transform .2s ease, background .2s ease;
        }
      
        .dzg-category-cta:hover {
          transform: translateY(-2px);
          background: #2bc47a;
        }
      
        .dzg-category-side-label {
          position: absolute;
          z-index: 4;
          inset-inline: 0;
          bottom: 22px;
          padding: 0 20px;
          color: #fff;
          font-size: 19px;
          font-weight: 900;
          text-shadow: 0 2px 14px rgba(0,0,0,.55);
        }
      
        .dzg-category-arrow {
          position: absolute;
          z-index: 8;
          top: 50%;
          width: 58px;
          height: 58px;
          border: 1px solid rgba(20,100,68,.12);
          border-radius: 50%;
          background: rgba(255,255,255,.97);
          color: #0b8b56;
          display: grid;
          place-items: center;
          cursor: pointer;
          box-shadow: 0 14px 34px rgba(0,0,0,.13);
          transform: translateY(-50%);
          transition: .2s ease;
        }
      
        .dzg-category-arrow:hover {
          transform: translateY(-50%) scale(1.08);
        }
      
        .dzg-category-prev {
          inset-inline-start: max(14px,calc(50% - 625px));
        }
      
        .dzg-category-next {
          inset-inline-end: max(14px,calc(50% - 625px));
        }
      
        .dzg-category-prev svg {
          transform: rotate(180deg);
        }
      
        .dzg-category-bottom {
          position: relative;
          z-index: 5;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 18px;
          margin-top: 3px;
        }
      
        .dzg-category-dots {
          display: flex;
          align-items: center;
          gap: 7px;
          direction: ltr;
        }
      
        .dzg-category-dots button {
          width: 9px;
          height: 9px;
          padding: 0;
          border: 0;
          border-radius: 999px;
          background: rgba(17,112,72,.18);
          cursor: pointer;
          transition: .3s ease;
        }
      
        .dzg-category-dots button.is-active {
          width: 30px;
          background: #20ad68;
        }
      
        .dzg-category-counter {
          color: rgba(18,86,58,.46);
          font-size: 12px;
          font-weight: 900;
          letter-spacing: .1em;
          direction: ltr;
        }
      
        @media (max-width:900px) {
          .dzg-category-carousel {
            height: 430px;
          }
      
          .dzg-category-card {
            width: 250px;
            height: 350px;
          }
      
          .dzg-category-card.is-active {
            width: 74vw;
            height: 385px;
          }
      
          .dzg-category-card.is-prev {
            transform: translate(-28%,-50%) scale(.86);
          }
      
          .dzg-category-card.is-next {
            transform: translate(28%,-50%) scale(.86);
          }
        }
      
        @media (max-width:640px) {
          .dzg-category-showcase {
            padding: 58px 0 64px;
          }
      
          .dzg-category-head h2 {
            font-size: 31px;
          }
      
          .dzg-category-head p {
            font-size: 14px;
          }
      
          .dzg-category-tabs {
            justify-content: flex-start;
            padding: 0 16px 5px;
            margin-bottom: 18px;
          }
      
          .dzg-category-tabs button {
            min-height: 42px;
            padding: 0 15px;
            font-size: 12px;
          }
      
          .dzg-category-carousel {
            height: 355px;
          }
      
          .dzg-category-card {
            width: 190px;
            height: 300px;
            border-radius: 22px;
          }
      
          .dzg-category-card.is-active {
            left: 50%;
            width: calc(100% - 112px);
            height: 320px;
            transform: translate(-50%,-50%);
          }
      
          .dzg-category-card.is-prev {
            left: -22px;
            transform: translateY(-50%) scale(.82);
            opacity: .92;
          }
      
          .dzg-category-card.is-next {
            right: -22px;
            transform: translateY(-50%) scale(.82);
            opacity: .92;
          }
      
          .dzg-category-card-content {
            padding: 22px;
          }
      
          .dzg-category-card-content h3 {
            font-size: 27px;
          }
      
          .dzg-category-card-content p {
            font-size: 13px;
            margin: 7px 0 13px;
          }
      
          .dzg-category-cta {
            min-height: 40px;
            padding: 0 15px;
            font-size: 12px;
          }
      
          .dzg-category-side-label {
            font-size: 14px;
          }
      
          .dzg-category-arrow {
            width: 42px;
            height: 42px;
          }
      
          .dzg-category-prev {
            inset-inline-start: 6px;
          }
      
          .dzg-category-next {
            inset-inline-end: 6px;
          }
        }
      
        @media (prefers-reduced-motion: reduce) {
          .dzg-category-card,
          .dzg-category-tabs button,
          .dzg-category-arrow,
          .dzg-category-cta,
          .dzg-category-dots button {
            transition: none;
          }
        }
      `}</style>
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
          <a href="/privacy">{t.privacy}</a>
          <a href="/terms">{t.terms}</a>
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

        </section>

        <section className="dzg-category-showcase" aria-label={language === "fr" ? "Catégories de boutiques" : "فئات المتاجر"}>
          <div className="dzg-category-head">
            <span className="dzg-category-kicker">
              <span className="dzg-category-kicker-dot" />
              {language === "fr" ? "Pour tous les commerces" : "مناسب لجميع الأنشطة"}
            </span>

            <h2>
              {language === "fr"
                ? "Votre boutique, quelle que soit votre activité"
                : "متجرك مهما كان نشاطك"}
            </h2>

            <p>
              {language === "fr"
                ? "Présentez vos produits de la manière qui correspond à votre commerce."
                : "اعرض منتجاتك بالطريقة التي تناسب تجارتك."}
            </p>
          </div>

          <div className="dzg-category-tabs" role="tablist">
            {LANDING_CATEGORIES.map((item, index) => {
              const copy = language === "fr" ? item.fr : item.ar;

              return (
                <button
                  key={item.ar[0]}
                  type="button"
                  role="tab"
                  aria-selected={index === landingIndex}
                  className={index === landingIndex ? "is-active" : ""}
                  onClick={() => goToLandingCategory(index)}
                >
                  {copy[0]}
                </button>
              );
            })}
          </div>

          <div className="dzg-category-carousel">
            <button
              type="button"
              className="dzg-category-arrow dzg-category-prev"
              aria-label={language === "fr" ? "Catégorie précédente" : "الفئة السابقة"}
              onClick={() => goToLandingCategory(landingIndex - 1)}
            >
              <ArrowLeft size={22} />
            </button>

            <div className="dzg-category-stage">
              {[-1, 0, 1].map((offset) => {
                const index =
                  (landingIndex + offset + LANDING_CATEGORIES.length) %
                  LANDING_CATEGORIES.length;

                const item = LANDING_CATEGORIES[index];
                const copy = language === "fr" ? item.fr : item.ar;
                const active = offset === 0;

                return (
                  <article
                    key={`${index}-${offset}`}
                    className={`dzg-category-card ${
                      active ? "is-active" : ""
                    } ${offset === -1 ? "is-prev" : ""} ${
                      offset === 1 ? "is-next" : ""
                    }`}
                  >
                    <img
                      src={item.image}
                      alt={copy[0]}
                      loading={active ? "eager" : "lazy"}
                      decoding="async"
                    />

                    <div className="dzg-category-card-shade" />

                    {active && (
                      <div className="dzg-category-card-content">
                        <span className="dzg-category-number">
                          {String(index + 1).padStart(2, "0")}
                        </span>

                        <h3>{copy[0]}</h3>
                        <p>{copy[1]}</p>

                        <a href="/dashboard" className="dzg-category-cta">
                          {language === "fr"
                            ? "Créez votre boutique maintenant"
                            : "ابدأ متجرك الآن"}
                          <ArrowLeft size={17} />
                        </a>
                      </div>
                    )}

                    {!active && (
                      <div className="dzg-category-side-label">
                        {copy[0]}
                      </div>
                    )}
                  </article>
                );
              })}
            </div>

            <button
              type="button"
              className="dzg-category-arrow dzg-category-next"
              aria-label={language === "fr" ? "Catégorie suivante" : "الفئة التالية"}
              onClick={() => goToLandingCategory(landingIndex + 1)}
            >
              <ArrowLeft size={22} />
            </button>
          </div>

          <div className="dzg-category-bottom">
            <div className="dzg-category-dots">
              {LANDING_CATEGORIES.map((item, index) => (
                <button
                  key={item.ar[0]}
                  type="button"
                  aria-label={language === "fr" ? item.fr[0] : item.ar[0]}
                  aria-current={index === landingIndex ? "true" : undefined}
                  className={index === landingIndex ? "is-active" : ""}
                  onClick={() => goToLandingCategory(index)}
                />
              ))}
            </div>


          </div>
        </section>

        <section className="dzg-trust">
          {[
            [Users, stats ? formatMoney(stats.stores) : "—", language === "fr" ? "Boutiques publiées" : "متاجر منشورة"],
            [Package, stats ? formatMoney(stats.products) : "—", language === "fr" ? "Produits publiés" : "منتجات منشورة"],
            [Zap, stats ? formatMoney(stats.visits) : "—", language === "fr" ? "Visites de la plateforme" : "زيارات المنصة"],
            [Store, stats ? formatMoney(stats.storeVisits) : "—", language === "fr" ? "Visites des boutiques" : "زيارات المتاجر"],
          ].map(([Icon, value, label]) => { const I = Icon as typeof Users; return <div key={String(label)}><I size={20} /><div><b>{String(value)}</b><span>{String(label)}</span></div></div>; })}
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
            {HOW.map(({ n, icon: Icon, ar, fr }) => { const copy = language === "fr" ? fr : ar; return (
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
                <div><small>{t.stores}</small><strong>{stats ? formatMoney(stats.stores) : "—"}</strong></div>
                <div><small>{t.products}</small><strong>{stats ? formatMoney(stats.products) : "—"}</strong></div>
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
            <details><summary>{t.q4}</summary><p>{t.a4}</p></details>
            <details><summary>{t.q5}</summary><p>{t.a5}</p></details>
            <details><summary>{t.q6}</summary><p>{t.a6}</p></details>
            <details><summary>{t.q7}</summary><p>{t.a7}</p></details>
            <details><summary>{t.q8}</summary><p>{t.a8}</p></details>
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
          <a href="/privacy">{t.privacy}</a>
          <a href="/terms">{t.terms}</a>
        </nav>
        <p>© {new Date().getFullYear()} Dzair Store — {t.rights}</p>
      </footer>
    </div>
  );
}
