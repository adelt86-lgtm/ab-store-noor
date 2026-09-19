import { useState } from "react";
import {
  ArrowUpLeft, BarChart3, Check, ChevronDown, Crown, Globe2, LayoutDashboard,
  Lock, MessageCircle, Package, Palette, ShieldCheck, ShoppingBag, Sparkles,
  Smartphone, Truck, Zap
} from "lucide-react";
import { PRICING } from "@/lib/pricing";
import { WhatsAppIcon } from "@/components/WhatsAppIcon";

const FEATURES = [
  { icon: ShoppingBag, title: "متجر احترافي في دقائق", desc: "واجهة جاهزة للبيع، صور ومنتجات وأسعار، بدون برمجة أو إعدادات معقدة." },
  { icon: MessageCircle, title: "الطلب عبر واتساب", desc: "الزبون يرسل طلبه بسهولة مع الهاتف والولاية والعنوان، ثم تكمل أنت على واتساب." },
  { icon: Truck, title: "مصمّم للجزائر", desc: "58 ولاية، خيارات توصيل، والدفع عند الاستلام ضمن تجربة مفهومة للزبون الجزائري." },
  { icon: LayoutDashboard, title: "لوحة تحكم واحدة", desc: "أدر المنتجات، الطلبات، الهوية، واتساب وإعدادات متجرك من مكان واحد." },
  { icon: Palette, title: "علامتك أولاً", desc: "ابدأ مجاناً مع AB Store Noor، وانتقل إلى Pro لإزالة هوية المنصة وإبراز علامتك." },
  { icon: BarChart3, title: "قرارات مبنية على الأرقام", desc: "إحصائيات أساسية مجاناً، وتحليلات أوسع في Pro لمتابعة نمو متجرك." },
];

const STEPS = [
  ["01", "أنشئ حسابك", "سجّل مجاناً وابدأ ببناء متجرك مباشرة."],
  ["02", "أضف منتجاتك", "صور، وصف، أسعار، وتصنيفات — وكل شيء قابل للتعديل."],
  ["03", "شارك الرابط", "ضع رابط متجرك في واتساب، فيسبوك، إنستغرام أو أي مكان."],
  ["04", "استقبل الطلبات", "الزبون يطلب، وأنت تحصل على التفاصيل جاهزة للمتابعة."],
] as const;

const FAQ = [
  ["هل أستطيع البدء مجاناً؟", "نعم. الخطة المجانية تسمح لك بإنشاء متجرك وإضافة حتى 10 منتجات والبدء باستقبال الطلبات."],
  ["هل توجد عمولة على المبيعات؟", "لا توجد عمولة على المبيعات ضمن الخطط الحالية. الدفع يكون مقابل الخطة فقط عند الترقية."],
  ["هل المنصة مناسبة للجزائر؟", "نعم. التجربة مصممة للسوق الجزائري، بما في ذلك الولايات والطلب عبر واتساب والدفع عند الاستلام."],
  ["ماذا يضيف Pro؟", "منتجات غير محدودة، إزالة شعار المنصة، تخصيص أسعار التوصيل، إحصائيات أوسع ودعم VIP."],
] as const;

export function LandingPage() {
  const [cycle, setCycle] = useState<"monthly" | "yearly">("monthly");
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const proPrice = cycle === "yearly" ? PRICING.pro.priceYearly : PRICING.pro.priceMonthly;
  const proLabel = cycle === "yearly" ? "سنوياً" : "شهرياً";

  return (
    <div className="lp lp-premium" dir="rtl">
      <div className="lp-noise" aria-hidden />
      <div className="lp-orb lp-orb-a" aria-hidden />
      <div className="lp-orb lp-orb-b" aria-hidden />
      <div className="lp-grid-bg" aria-hidden />

      <header className="lp-header">
        <a href="/" className="lp-brand" aria-label="AB Store Noor">
          <span className="lp-brand-mark"><img src="/logo-ab.png" alt="" /></span>
          <span className="lp-brand-copy"><strong>AB STORE NOOR</strong><small>منصة التجارة الإلكترونية الجزائرية</small></span>
        </a>
        <nav className="lp-nav" aria-label="التنقل الرئيسي">
          <a href="#features">المزايا</a>
          <a href="#experience">التجربة</a>
          <a href="#pricing">الأسعار</a>
          <a href="#faq">الأسئلة</a>
        </nav>
        <a href="/dashboard" className="lp-nav-cta">ابدأ مجاناً <ArrowUpLeft size={16} /></a>
      </header>

      <main>
        <section className="lp-hero">
          <div className="lp-hero-copy">
            <div className="lp-kicker"><span className="lp-live-dot" /> صُمّمت للجزائر. بُنيت لتكبر معك.</div>
            <h1>متجرك ليس مجرد رابط.<br /><span>إنه واجهة علامتك.</span></h1>
            <p className="lp-hero-lead">أنشئ متجراً أنيقاً، اعرض منتجاتك، استقبل الطلبات عبر واتساب، وأدر كل شيء من لوحة تحكم واحدة — <b>بلا برمجة.</b></p>
            <div className="lp-hero-actions">
              <a href="/dashboard" className="lp-btn-primary lp-btn-xl">أنشئ متجرك مجاناً <ArrowUpLeft size={19} /></a>
              <a href="#experience" className="lp-btn-ghost lp-btn-xl">شاهد كيف تعمل <span className="lp-play">▶</span></a>
            </div>
            <div className="lp-proof-row">
              <span><ShieldCheck size={16} /> 0% عمولة على المبيعات</span>
              <span><Truck size={16} /> 58 ولاية</span>
              <span><Lock size={16} /> تجربة آمنة</span>
            </div>
          </div>

          <div className="lp-hero-visual" aria-label="معاينة لوحة التحكم">
            <div className="lp-visual-glow" />
            <div className="lp-dashboard-window">
              <div className="lp-window-bar"><span /><span /><span /><b>AB STORE NOOR</b></div>
              <div className="lp-dashboard-body">
                <aside className="lp-mini-sidebar">
                  <img src="/logo-ab.png" alt="" />
                  <i className="active"><LayoutDashboard size={15} /></i><i><ShoppingBag size={15} /></i><i><Package size={15} /></i><i><BarChart3 size={15} /></i>
                </aside>
                <div className="lp-mini-main">
                  <div className="lp-mini-top"><div><small>مرحباً بك</small><strong>لوحة متجرك</strong></div><span className="lp-status">● المتجر نشط</span></div>
                  <div className="lp-metric-grid">
                    <div><small>الطلبات</small><strong>128</strong><em>+18% هذا الشهر</em></div>
                    <div><small>المنتجات</small><strong>24</strong><em>محدودة / غير محدودة في Pro</em></div>
                    <div><small>قنوات الطلب</small><strong>3</strong><em>واتساب · رابط · مشاركة</em></div>
                  </div>
                  <div className="lp-chart"><div className="lp-chart-head"><b>أداء المتجر</b><small>آخر 7 أيام</small></div><div className="lp-bars"><i/><i/><i/><i/><i/><i/><i/></div></div>
                  <div className="lp-order-card"><span className="lp-order-avatar">AB</span><div><b>طلب جديد</b><small>سماعات لاسلكية · الجزائر</small></div><strong>9,400 دج</strong><span className="lp-order-new">جديد</span></div>
                </div>
              </div>
            </div>
            <div className="lp-float lp-float-one"><WhatsAppIcon size={17} /><span>طلب جديد</span><b>+ 9,400 دج</b></div>
            <div className="lp-float lp-float-two"><span className="lp-check-circle">✓</span><div><b>متجر جاهز</b><small>ابدأ البيع الآن</small></div></div>
          </div>
        </section>

        <div className="lp-marquee" aria-hidden="true"><div><span>متجر إلكتروني</span><i>✦</i><span>واتساب</span><i>✦</i><span>58 ولاية</span><i>✦</i><span>دفع عند الاستلام</span><i>✦</i><span>علامتك التجارية</span><i>✦</i><span>متجر إلكتروني</span></div></div>

        <section id="features" className="lp-section lp-feature-section">
          <div className="lp-section-head centered"><span className="lp-section-tag"><Zap size={14} /> كل ما تحتاجه</span><h2>أدوات قوية.<br /><em>تجربة بسيطة.</em></h2><p>AB Store Noor تجمع ما يحتاجه التاجر الجزائري في تجربة واحدة، سريعة وواضحة ومصممة للبيع.</p></div>
          <div className="lp-feature-grid">
            {FEATURES.map(({ icon: Icon, title, desc }, index) => <article key={title} className={`lp-feature-card ${index === 0 ? "featured" : ""}`}><div className="lp-feature-icon"><Icon size={21} /></div><span className="lp-feature-number">0{index + 1}</span><h3>{title}</h3><p>{desc}</p><a href="#pricing">اعرف المزيد <ArrowUpLeft size={14} /></a></article>)}
          </div>
        </section>

        <section id="experience" className="lp-showcase">
          <div className="lp-showcase-inner">
            <div className="lp-showcase-copy"><span className="lp-section-tag"><Sparkles size={14} /> تجربة التاجر</span><h2>من أول زيارة…<br /><em>إلى أول طلب.</em></h2><p>واجهة جميلة للزبون، وواجهة عملية لك. لا تجعل التقنية تقف بينك وبين البيع.</p><ul><li><span>01</span><div><b>واجهة تعكس علامتك</b><small>تصميم نظيف، صور واضحة وتجربة متجاوبة على الهاتف.</small></div></li><li><span>02</span><div><b>طلب أسرع للزبون</b><small>نموذج واضح يختصر الخطوات ويربطك بواتساب.</small></div></li><li><span>03</span><div><b>إدارة بدون تعقيد</b><small>غيّر المنتجات والأسعار والإعدادات من لوحة واحدة.</small></div></li></ul></div>
            <div className="lp-store-preview">
              <div className="lp-preview-glow" />
              <div className="lp-phone">
                <div className="lp-phone-top"><span>9:41</span><b>● ● ●</b></div>
                <div className="lp-phone-brand"><img src="/logo-ab.png" alt="" /><b>متجر النور</b><span>⌄</span></div>
                <div className="lp-phone-hero"><small>اختيارات اليوم</small><strong>منتجات<br />تليق بك.</strong><span>اكتشف المجموعة <ArrowUpLeft size={13} /></span></div>
                <div className="lp-phone-product"><div className="lp-product-art"><div /></div><div><small>الأكثر طلباً</small><b>سماعات لاسلكية</b><strong>9,400 دج</strong></div></div>
                <div className="lp-phone-button"><WhatsAppIcon size={15} /> اطلب الآن</div>
              </div>
              <div className="lp-preview-card lp-preview-card-a"><Truck size={17} /><div><b>توصيل سريع</b><small>لجميع الولايات</small></div></div>
              <div className="lp-preview-card lp-preview-card-b"><ShieldCheck size={17} /><div><b>دفع عند الاستلام</b><small>راحة وأمان</small></div></div>
            </div>
          </div>
        </section>

        <section className="lp-section lp-steps-section">
          <div className="lp-section-head centered"><span className="lp-section-tag"><Globe2 size={14} /> البداية أسهل مما تتخيل</span><h2>أربع خطوات.<br /><em>ومتجرك جاهز.</em></h2></div>
          <div className="lp-step-grid">{STEPS.map(([n, t, d]) => <div className="lp-step" key={n}><span>{n}</span><div><h3>{t}</h3><p>{d}</p></div>{n !== "04" && <i />}</div>)}</div>
        </section>

        <section id="pricing" className="lp-pricing-section">
          <div className="lp-section-head centered"><span className="lp-section-tag"><Crown size={14} /> أسعار واضحة</span><h2>ابدأ مجاناً.<br /><em>ترقَّ عندما تكبر.</em></h2><p>لا عمولة على مبيعاتك. اختر الخطة التي تناسب مرحلتك.</p><div className="lp-cycle"><button className={cycle === "monthly" ? "on" : ""} onClick={() => setCycle("monthly")}>شهري</button><button className={cycle === "yearly" ? "on" : ""} onClick={() => setCycle("yearly")}>سنوي <small>شهران هدية</small></button></div></div>
          <div className="lp-price-grid">
            <article className="lp-price-card"><div className="lp-plan-top"><span>البداية</span><b>FREE</b></div><h3>مجاني</h3><div className="lp-price"><strong>0</strong><small>دج / للأبد</small></div><p>كل ما تحتاجه لتبدأ حضورك الإلكتروني.</p><ul>{PRICING.free.features.map(f => <li key={f}><Check size={15} /> {f}</li>)}</ul><a href="/dashboard" className="lp-btn-ghost block">ابدأ مجاناً</a></article>
            <article className="lp-price-card pro"><span className="lp-popular">الأكثر قيمة</span><div className="lp-plan-top"><span>للنمو</span><b>PRO</b></div><h3>احترافي</h3><div className="lp-price"><strong>{proPrice.toLocaleString("ar-DZ")}</strong><small>دج / {proLabel}</small></div><p>هوية أقوى، منتجات أكثر، وتحكم أوسع.</p><ul>{PRICING.pro.features.map(f => <li key={f}><Check size={15} /> {f}</li>)}</ul><a href="/dashboard" className="lp-btn-primary block">ابدأ مع Pro <ArrowUpLeft size={17} /></a></article>
          </div>
          <div className="lp-payment-note"><ShieldCheck size={16} /><span>للتجار الجزائريين: الدفع عبر BaridiMob / رفع الوصل، مع تفعيل بعد المراجعة.</span></div>
        </section>

        <section id="faq" className="lp-section lp-faq-section"><div className="lp-section-head"><span className="lp-section-tag"><MessageCircle size={14} /> أسئلة شائعة</span><h2>قبل أن تبدأ،<br /><em>هذه الإجابات.</em></h2></div><div className="lp-faq-list">{FAQ.map(([q, a], i) => <div className={`lp-faq ${openFaq === i ? "open" : ""}`} key={q}><button onClick={() => setOpenFaq(openFaq === i ? null : i)}><span>{q}</span><ChevronDown size={19} /></button>{openFaq === i && <p>{a}</p>}</div>)}</div></section>

        <section className="lp-final"><div className="lp-final-glow" /><img src="/logo-ab.png" alt="AB Store Noor" className="lp-final-logo" /><span className="lp-final-kicker">أكثر من مجرد متجر…</span><h2>تجربة فريدة<br /><em>تبدأ من هنا.</em></h2><p>أنشئ متجرك اليوم، وامنح علامتك المكان الذي تستحقه.</p><a href="/dashboard" className="lp-btn-primary lp-btn-xl">أنشئ متجري مجاناً <ArrowUpLeft size={19} /></a></section>
      </main>

      <footer className="lp-footer"><div className="lp-footer-brand"><img src="/logo-ab.png" alt="" /><div><b>AB STORE NOOR</b><span>منصة التجارة الإلكترونية الجزائرية</span></div></div><p>© {new Date().getFullYear()} AB Technologie · جميع الحقوق محفوظة.</p><div className="lp-footer-links"><a href="#features">المزايا</a><a href="#pricing">الأسعار</a><a href="/dashboard">لوحة التاجر</a></div></footer>
    </div>
  );
}
