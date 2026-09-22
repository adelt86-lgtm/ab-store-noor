import { useState } from "react";
import {
  ArrowUpLeft,
  BarChart3,
  Check,
  ChevronDown,
  LayoutDashboard,
  MessageCircle,
  QrCode,
  ShieldCheck,
  ShoppingBag,
  ShoppingCart,
  Store,
  Truck,
} from "lucide-react";
import { PRICING } from "@/lib/pricing";

const FEATURES = [
  {
    icon: Store,
    title: "متجر جاهز في دقائق",
    desc: "رابط تشاركه على واتساب وفيسبوك وإنستغرام — بدون برمجة.",
  },
  {
    icon: ShoppingCart,
    title: "سلة طلبات",
    desc: "الزبون يجمع عدة منتجات ثم يؤكد طلباً واحداً واضحاً.",
  },
  {
    icon: MessageCircle,
    title: "الطلب إلى واتسابك",
    desc: "كل طلب يفتح رسالة جاهزة لرقمك ويُحفظ في لوحة التحكم.",
  },
  {
    icon: Truck,
    title: "مصمّم للجزائر",
    desc: "58 ولاية، توصيل للمنزل أو المكتب، والدفع عند الاستلام.",
  },
  {
    icon: QrCode,
    title: "QR + ريدو مفتوح/مغلق",
    desc: "امسح للدخول للمحل. أغلق الاستقبال ليلاً بضغطة واحدة.",
  },
  {
    icon: LayoutDashboard,
    title: "لوحة طلبات ذكية",
    desc: "حسب اليوم، الإجمالي، الحالات، والحذف — كل طلب تحت يدك.",
  },
] as const;

const STEPS = [
  ["01", "أنشئ حسابك", "سجّل مجاناً وافتح لوحة التحكم."],
  ["02", "أضف منتجاتك", "صور، أسعار، ووصف — والمتجر يتحدث وحده."],
  ["03", "شارك الرابط أو QR", "واتساب، ستوري، باب المحل أو طاولة المطعم."],
  ["04", "استقبل الطلبات", "على واتسابك وفي لوحة الطلبات في نفس الوقت."],
] as const;

const FAQ = [
  [
    "هل أبدأ مجاناً؟",
    "نعم. الخطة المجانية تتيح متجراً حتى 10 منتجات واستقبال الطلبات بدون عمولة على المبيعات.",
  ],
  [
    "هل المنصة تأخذ نسبة من المبيعات؟",
    "لا. لا عمولة على المبيعات ضمن الخطط الحالية. تدفع فقط إن اخترت ترقية Pro.",
  ],
  [
    "هل تناسب المطاعم والمتاجر؟",
    "نعم. قائمة أطباق أو كتالوج منتجات — نفس السلة والطلب عبر واتساب والولايات.",
  ],
  [
    "ماذا يضيف Pro؟",
    "منتجات بلا حد، إزالة شريط المنصة، إبراز اسم متجرك، ودعم أولوية — 1,500 دج/شهر أو 15,000 دج/سنة.",
  ],
] as const;

export function LandingPage() {
  const [cycle, setCycle] = useState<"monthly" | "yearly">("monthly");
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const proPrice = cycle === "yearly" ? PRICING.pro.priceYearly : PRICING.pro.priceMonthly;
  const proLabel = cycle === "yearly" ? "سنوياً" : "شهرياً";

  return (
    <div className="lp lp-premium lp-wordmark" dir="rtl">
      <div className="lp-noise" aria-hidden />
      <div className="lp-orb lp-orb-a" aria-hidden />
      <div className="lp-orb lp-orb-b" aria-hidden />

      <header className="lp-header">
        <a href="/" className="lp-brand lp-brand-text">
          <strong>AB STORE</strong>
          <span>متاجر النور</span>
        </a>
        <nav className="lp-nav">
          <a href="#features">الخدمات</a>
          <a href="#how">كيف يعمل</a>
          <a href="#pricing">الأسعار</a>
          <a href="#faq">أسئلة</a>
        </nav>
        <a href="/dashboard" className="lp-nav-cta">
          ابدأ مجاناً
        </a>
      </header>

      <main>
        <section className="lp-hero">
          <div className="lp-hero-copy">
            <div className="lp-kicker">
              <i className="lp-live-dot" />
              للتجار والمطاعم في الجزائر
            </div>
            <h1>
              متجرك الإلكتروني
              <br />
              <span>بساطة. طلبات. نمو.</span>
            </h1>
            <p className="lp-hero-lead">
              أنشئ متجرك أو قائمتك، فعّل <b>السلة</b>، واستقبل الطلبات على{" "}
              <b>واتسابك</b> وفي <b>لوحة التحكم</b> — بدون عمولة على المبيعات.
            </p>
            <div className="lp-hero-actions">
              <a href="/dashboard" className="lp-btn-primary">
                ابدأ متجرك الآن <ArrowUpLeft size={18} />
              </a>
              <a href="#pricing" className="lp-btn-ghost">
                عرض الأسعار
              </a>
            </div>
            <div className="lp-proof-row">
              <span>0٪ عمولة</span>
              <span>58 ولاية</span>
              <span>سلة + واتساب</span>
              <span>QR للمحل</span>
            </div>
          </div>

          <div className="lp-hero-visual" aria-hidden>
            <div className="lp-glass-stack">
              <div className="lp-glass-card">
                <span>طلبات اليوم</span>
                <b>12</b>
                <small>في اللوحة + واتساب</small>
              </div>
              <div className="lp-glass-card accent">
                <span>السلة</span>
                <b>3 أصناف</b>
                <small>طلب واحد للزبون</small>
              </div>
              <div className="lp-glass-card">
                <span>الحالة</span>
                <b className="ok">مفتوح</b>
                <small>ريدو بنقرة</small>
              </div>
            </div>
          </div>
        </section>

        <section id="features" className="lp-section">
          <div className="lp-section-head">
            <span className="lp-section-tag">
              <SparklesIcon /> الخدمات
            </span>
            <h2>
              كل ما تحتاجه،
              <br />
              <em>ببساطة.</em>
            </h2>
            <p>بدون تعقيد — ركّز على البيع والتوصيل.</p>
          </div>
          <div className="lp-feature-grid">
            {FEATURES.map(({ icon: Icon, title, desc }) => (
              <article className="lp-feature-card" key={title}>
                <div className="lp-feature-icon">
                  <Icon size={22} />
                </div>
                <h3>{title}</h3>
                <p>{desc}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="how" className="lp-section">
          <div className="lp-section-head">
            <span className="lp-section-tag">الخطوات</span>
            <h2>
              من التسجيل
              <br />
              <em>إلى أول طلب.</em>
            </h2>
          </div>
          <div className="lp-step-grid">
            {STEPS.map(([n, t, d]) => (
              <article className="lp-step" key={n}>
                <b>{n}</b>
                <h3>{t}</h3>
                <p>{d}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="pricing" className="lp-section lp-pricing-section">
          <div className="lp-section-head">
            <span className="lp-section-tag">
              <ShieldCheck size={14} /> الأسعار
            </span>
            <h2>
              ابدأ مجاناً،
              <br />
              <em>ترقَّ عند الحاجة.</em>
            </h2>
          </div>

          <div className="lp-cycle">
            <button
              type="button"
              className={cycle === "monthly" ? "on" : ""}
              onClick={() => setCycle("monthly")}
            >
              شهري
            </button>
            <button
              type="button"
              className={cycle === "yearly" ? "on" : ""}
              onClick={() => setCycle("yearly")}
            >
              سنوي · شهرين مجاناً
            </button>
          </div>

          <div className="lp-price-grid">
            <article className="lp-price-card">
              <div className="lp-plan-top">
                <span>البداية</span>
                <b>FREE</b>
              </div>
              <h3>مجاني</h3>
              <div className="lp-price">
                <strong>0</strong>
                <small>دج / للأبد</small>
              </div>
              <p>لتجّار ومطاعم يبدأون بدون مخاطرة.</p>
              <ul>
                {PRICING.free.features.map((f) => (
                  <li key={f}>
                    <Check size={15} /> {f}
                  </li>
                ))}
                <li>
                  <Check size={15} /> سلة وطلبات وواتساب
                </li>
              </ul>
              <a href="/dashboard" className="lp-btn-ghost block">
                ابدأ مجاناً
              </a>
            </article>

            <article className="lp-price-card pro">
              <span className="lp-popular">الأكثر قيمة</span>
              <div className="lp-plan-top">
                <span>للنمو</span>
                <b>PRO</b>
              </div>
              <h3>احترافي</h3>
              <div className="lp-price">
                <strong>{proPrice.toLocaleString("ar-DZ")}</strong>
                <small>
                  دج / {proLabel}
                  {cycle === "yearly" ? " · توفير شهرين" : ""}
                </small>
              </div>
              <p>هوية متجرك أولاً · منتجات بلا حد.</p>
              <ul>
                {PRICING.pro.features.map((f) => (
                  <li key={f}>
                    <Check size={15} /> {f}
                  </li>
                ))}
              </ul>
              <a href="/dashboard" className="lp-btn-primary block">
                ابدأ مع Pro <ArrowUpLeft size={17} />
              </a>
            </article>
          </div>

          <div className="lp-payment-note">
            <ShieldCheck size={16} />
            <span>
              ترقية Pro عبر BaridiMob / رفع الوصل — تفعيل بعد مراجعة الإدارة. لا
              عمولة على مبيعاتك.
            </span>
          </div>
        </section>

        <section id="faq" className="lp-section lp-faq-section">
          <div className="lp-section-head">
            <span className="lp-section-tag">
              <MessageCircle size={14} /> أسئلة شائعة
            </span>
            <h2>
              إجابات
              <br />
              <em>سريعة.</em>
            </h2>
          </div>
          <div className="lp-faq-list">
            {FAQ.map(([q, a], i) => (
              <div className={`lp-faq ${openFaq === i ? "open" : ""}`} key={q}>
                <button type="button" onClick={() => setOpenFaq(openFaq === i ? null : i)}>
                  <span>{q}</span>
                  <ChevronDown size={19} />
                </button>
                {openFaq === i && <p>{a}</p>}
              </div>
            ))}
          </div>
        </section>

        <section className="lp-final">
          <div className="lp-final-glow" />
          <span className="lp-final-kicker">AB STORE</span>
          <h2>
            متجرك أو قائمتك
            <br />
            <em>تبدأ من هنا.</em>
          </h2>
          <p>مجاني للبداية · طلبات على واتساب واللوحة · للتجار والمطاعم.</p>
          <a href="/dashboard" className="lp-btn-primary lp-btn-xl">
            أنشئ متجري مجاناً <ArrowUpLeft size={19} />
          </a>
        </section>
      </main>

      <footer className="lp-footer">
        <div className="lp-footer-brand">
          <div>
            <b>AB STORE</b>
            <span>منصة المتاجر والقوائم في الجزائر</span>
          </div>
        </div>
        <p>© {new Date().getFullYear()} AB Technologie · جميع الحقوق محفوظة.</p>
        <div className="lp-footer-links">
          <a href="#features">الخدمات</a>
          <a href="#pricing">الأسعار</a>
          <a href="/dashboard">لوحة التاجر</a>
        </div>
      </footer>
    </div>
  );
}

function SparklesIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 3l1.5 5.5L19 10l-5.5 1.5L12 17l-1.5-5.5L5 10l5.5-1.5L12 3z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}
