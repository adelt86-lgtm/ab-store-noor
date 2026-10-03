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
import { loadPlatformStats, recordPlatformVisit, type PlatformStats } from "@/lib/storeData";
import { initMetaPixel, trackMetaEvent } from "@/lib/metaPixel";
import heroHeadphones from "@/assets/hero-headphones.jpg";
import productWatch from "@/assets/product-watch.jpg";
import productEarbuds from "@/assets/product-earbuds.jpg";

const TRUST = [
  { icon: Users, label: "+50,000", sub: "عميل سعيد" },
  { icon: Star, label: "4.8/5", sub: "تقييم المنصة" },
  { icon: ShieldCheck, label: "100%", sub: "منتجات آمنة" },
  { icon: Truck, label: "24/72 ساعة", sub: "متوسط التوصيل" },
] as const;

const HOW = [
  { n: "1", icon: Store, title: "تصفح واختر", desc: "المنتجات التي تناسبك من متجرك" },
  { n: "2", icon: PhoneCall, title: "تأكيد عبر واتساب", desc: "للتواصل معك لتأكيد الطلب والتفاصيل" },
  { n: "3", icon: Package, title: "تجهيز الطلب", desc: "نؤكد طلبك ونعدّ الشحنة" },
  { n: "4", icon: Truck, title: "شحن وتوصيل", desc: "توصيل سريع إلى بابك في أسرع وقت" },
] as const;

const FEATURES = [
  { icon: Headphones, title: "دعم فني متواصل", desc: "نساعدك في كل خطوة" },
  { icon: ShieldCheck, title: "أمان عالي", desc: "لبياناتك وطلباتك" },
  { icon: Store, title: "تصميم احترافي", desc: "متجاوب مع جميع الأجهزة" },
  { icon: Settings2, title: "إعدادات مرنة", desc: "حسب احتياجاتك" },
  { icon: Rocket, title: "نمو أعمالك", desc: "مع أدوات التسويق" },
] as const;

function formatMoney(n: number) {
  return Math.round(Number(n) || 0)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, "\u202F");
}

export function LandingPage() {
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
    <div className="dz-green" dir="rtl">
      <header className="dzg-header">
        <a href="/" className="dzg-brand">
          <span className="dzg-logo" aria-hidden><ShoppingBag size={18} /></span>
          <span>
            <strong>Dzair Store</strong>
            <small>متجرك · أسهل · أسرع</small>
          </span>
        </a>
        <nav className="dzg-nav">
          <a href="#home" className="on">الرئيسية</a>
          <a href="#features">المميزات</a>
          <a href="#how">كيف يعمل؟</a>
          <a href="#pricing">الأسعار</a>
          <a href="#faq">الأسئلة الشائعة</a>
          <a href="/dashboard">تواصل معنا</a>
        </nav>
        <div className="dzg-header-actions">
          <a href="/dashboard" className="dzg-link-login">تسجيل الدخول</a>
          <a href="/dashboard" className="dzg-btn" onClick={() => track("header")}>ابدأ مجاناً</a>
        </div>
      </header>

      <main id="home">
        <section className="dzg-hero">
          <div className="dzg-hero-copy">
            <div className="dzg-pill"><i />منصة الاحترافية للتجارة الإلكترونية في الجزائر</div>
            <h1>أنشئ متجرك وتلقَّ طلباتك<br />على واتساب في دقائق</h1>
            <p>كل ما تحتاجه لبدء متجرك الإلكتروني: من المنتجات إلى إدارة الطلبات والشحن — في منصة واحدة، سهلة وآمنة.</p>
            <div className="dzg-hero-actions">
              <a href="/dashboard" className="dzg-btn dzg-btn-lg" onClick={() => track("hero")}>ابدأ مجاناً <ArrowLeft size={18} /></a>
              <a href="#features" className="dzg-btn-outline dzg-btn-lg">اكتشف المنصة</a>
            </div>
            <ul className="dzg-mini-feats">
              <li><Truck size={16} />بدون عمولة على المبيعات</li>
              <li><Package size={16} />شحن وتوصيل لكل ولايات الجزائر</li>
              <li><ShieldCheck size={16} />دفع آمن 100%</li>
              <li><Zap size={16} />متجرك جاهز بضغطة واحدة</li>
            </ul>
          </div>
          <div className="dzg-hero-visual" aria-hidden>
            <div className="dzg-badge-float">متجرك بين يديك في أي مكان</div>
            <div className="dzg-laptop">
              <div className="dzg-laptop-bar"><b>DZAIR STORE</b><span>متجرك الإلكتروني</span></div>
              <div className="dzg-laptop-body">
                <div className="dzg-laptop-main">
                  <img src={heroHeadphones} alt="" />
                  <div><small>منتجات أصلية بجودة عالية</small><strong>كل شيء في مكان واحد.</strong></div>
                </div>
                <div className="dzg-laptop-grid">
                  <div><img src={productWatch} alt="" /><span>ساعة ذكية</span><b>6 900 دج</b></div>
                  <div><img src={productEarbuds} alt="" /><span>سماعات لاسلكية</span><b>3 500 دج</b></div>
                  <div><img src={heroHeadphones} alt="" /><span>سماعات</span><b>4 900 دج</b></div>
                </div>
              </div>
            </div>
            <div className="dzg-phone">
              <div className="dzg-phone-head"><b>طلب جديد</b><small>الآن</small></div>
              <div className="dzg-phone-card">
                <div className="dzg-avatar">أ</div>
                <div><b>من أحمد</b><span>2 400 دج</span></div>
                <BadgeCheck size={16} />
              </div>
              <button type="button" className="dzg-wa">تأكيد عبر واتساب</button>
            </div>
          </div>
        </section>

        <section className="dzg-trust">
          {TRUST.map(({ icon: Icon, label, sub }) => (
            <div key={label}><Icon size={20} /><div><b>{label}</b><span>{sub}</span></div></div>
          ))}
        </section>

        <section className="dzg-split">
          <article className="dzg-problem">
            <span className="dzg-tag danger">المشكلة</span>
            <h2>هل تعاني من هذه المشاكل؟</h2>
            <ul>
              <li>صعوبة العثور على منتجاتك، جودة وسعر مناسب</li>
              <li>القلق من جودة المنتجات والتعاملات غير الموثوقة</li>
              <li>تأخر التوصيل وعدم معرفة حالة الطلب</li>
              <li>ضياع الوقت في البحث بين مواقع كثيرة</li>
            </ul>
          </article>
          <article className="dzg-solution">
            <span className="dzg-tag ok">الحل</span>
            <h2>تسوق بثقة مع <em>Dzair Store</em></h2>
            <p>نحن نوفر لك تجربة تسوق سهلة وآمنة، من اختيار المنتج حتى استلامه في باب بيتك.</p>
            <div className="dzg-wa-line"><Check size={16} />تأكيد الطلب عبر واتساب لضمان التواصل السريع والدقيق</div>
          </article>
        </section>

        <section id="how" className="dzg-how">
          <div className="dzg-section-head"><span className="dzg-tag">كيف يعمل؟</span><h2>من طلبك إلى باب منزلك</h2></div>
          <div className="dzg-how-grid">
            {[...HOW].reverse().map(({ n, icon: Icon, title, desc }) => (
              <article key={n}>
                <div className="dzg-how-icon"><Icon size={22} /><i>{n}</i></div>
                <h3>{title}</h3>
                <p>{desc}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="dzg-dash-preview">
          <div className="dzg-dash-copy">
            <span className="dzg-tag">لوحة التحكم</span>
            <h2>إدارة سهلة لمتجرك<br />في مكان واحد</h2>
            <p>تابع طلباتك، أدر منتجاتك، واحصل على تقارير مفصلة — كل ذلك من لوحة تحكم بسيطة.</p>
            <ul>
              <li><Check size={16} /> متابعة الطلبات بشكل مباشر</li>
              <li><Check size={16} /> إدارة المنتجات والمخزون</li>
              <li><Check size={16} /> تقارير ومؤشرات الأداء</li>
              <li><Check size={16} /> إعدادات متقدمة</li>
            </ul>
          </div>
          <div className="dzg-dash-mock" aria-hidden>
            <div className="dzg-dash-screen">
              <div className="dzg-dash-top"><b>Dzair Store</b><span>لوحة التاجر</span></div>
              <div className="dzg-dash-stats">
                <div><small>المتاجر</small><strong>{stats?.stores ? formatMoney(stats.stores) : "248"}</strong></div>
                <div><small>المنتجات</small><strong>{stats?.products ? formatMoney(stats.products) : "1 235"}</strong></div>
              </div>
              <div className="dzg-dash-rows">
                <div><b>#ORD-4832</b><span>مؤكد</span></div>
                <div><b>#ORD-4831</b><span className="new">جديد</span></div>
                <div><b>#ORD-4830</b><span>شحن</span></div>
              </div>
            </div>
          </div>
        </section>

        <section id="features" className="dzg-features">
          <div className="dzg-section-head"><span className="dzg-tag">مميزات المنصة</span><h2>كل ما يحتاجه تاجرك</h2></div>
          <div className="dzg-feat-grid">
            {FEATURES.map(({ icon: Icon, title, desc }) => (
              <article key={title}>
                <div className="dzg-feat-icon"><Icon size={22} /></div>
                <h3>{title}</h3>
                <p>{desc}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="pricing" className="dzg-pricing">
          <div className="dzg-section-head">
            <span className="dzg-tag">الأسعار</span>
            <h2>ابدأ مجاناً، ترقَّ عند الحاجة</h2>
            <div className="dzg-cycle">
              <button type="button" className={cycle === "monthly" ? "on" : ""} onClick={() => setCycle("monthly")}>شهري</button>
              <button type="button" className={cycle === "yearly" ? "on" : ""} onClick={() => setCycle("yearly")}>سنوي</button>
            </div>
          </div>
          <div className="dzg-price-grid dzg-price-grid-3">
            <article>
              <h3>مجاني</h3>
              <p className="dzg-price">0 <small>دج</small></p>
              <ul>
                <li>حتى {PRICING.free.productsLimit} منتجات</li>
                <li>حتى {PRICING.free.ordersLimitPerMonth} طلباً / شهر</li>
                <li>واتساب + 58 ولاية</li>
                <li>بدون عمولة على المبيعات</li>
              </ul>
              <a href="/dashboard" className="dzg-btn-outline" onClick={() => track("pricing-free")}>ابدأ مجاناً</a>
            </article>
            <article className="featured">
              <span className="dzg-badge">الأكثر طلباً</span>
              <h3>Pro</h3>
              <p className="dzg-price">{formatMoney(proPrice)} <small>دج / {cycle === "yearly" ? "سنة" : "شهر"}</small></p>
              <ul>
                <li>منتجات وطلبات بلا حد</li>
                <li>إزالة شعار المنصة</li>
                <li>تصدير Excel للشحن</li>
                <li>دعم أولوية</li>
              </ul>
              <a href="/dashboard" className="dzg-btn" onClick={() => track("pricing-pro")}>ترقية Pro</a>
            </article>
            <article>
              <span className="dzg-badge dzg-badge-ship">توصيل</span>
              <h3>Pro شحن</h3>
              <p className="dzg-price">{formatMoney(shipPrice)} <small>دج / {cycle === "yearly" ? "سنة" : "شهر"}</small></p>
              <ul>
                <li>كل مزايا Pro</li>
                <li>ربط Yalidine وشركات الشحن من المتجر</li>
                <li>إنشاء الطرد وتتبعه من الطلب</li>
                <li>أولوية قصوى للدعم</li>
              </ul>
              <a href="/dashboard" className="dzg-btn-outline" onClick={() => track("pricing-ship")}>Pro شحن</a>
            </article>
          </div>
          <p className="dzg-ship-note">Pro شحن للتاجر الذي يريد إرسال الطلب إلى شركة التوصيل من اللوحة، لا عبر ملف Excel فقط.</p>
        </section>

        <section id="faq" className="dzg-faq">
          <div className="dzg-section-head"><span className="dzg-tag">الأسئلة الشائعة</span><h2>إجابات سريعة</h2></div>
          <div className="dzg-faq-list">
            <details open><summary>هل أبدأ مجاناً؟</summary><p>نعم. الخطة المجانية تتيح متجراً واستقبال الطلبات بدون عمولة على المبيعات.</p></details>
            <details><summary>هل تأخذون نسبة من المبيعات؟</summary><p>لا. لا عمولة على المبيعات ضمن الخطط الحالية.</p></details>
            <details><summary>هل تناسب المطاعم والمتاجر؟</summary><p>نعم. قائمة أطباق أو كتالوج منتجات — نفس السلة والطلب عبر واتساب.</p></details>
          </div>
        </section>

        <section className="dzg-final">
          <div>
            <ShoppingBag size={28} />
            <h2>جاهز لبدء رحلتك؟</h2>
            <p>انضم إلى آلاف التجار وسجّل متجرك الآن.</p>
          </div>
          <a href="/dashboard" className="dzg-btn dzg-btn-lg" onClick={() => track("final")}>ابدأ الآن <ArrowLeft size={18} /></a>
        </section>
      </main>

      <footer className="dzg-footer">
        <div className="dzg-footer-brand">
          <span className="dzg-logo"><ShoppingBag size={16} /></span>
          <div><strong>Dzair Store</strong><small>متجرك · أسهل · أسرع</small></div>
        </div>
        <nav>
          <a href="#home">الرئيسية</a>
          <a href="#features">المميزات</a>
          <a href="#how">كيف يعمل؟</a>
          <a href="#faq">الأسئلة الشائعة</a>
          <a href="/dashboard">تواصل معنا</a>
        </nav>
        <p>© {new Date().getFullYear()} Dzair Store — جميع الحقوق محفوظة</p>
      </footer>
    </div>
  );
}
