import { useState } from "react";
import {
  ArrowUpLeft, Check, Crown, Globe2, LayoutDashboard, MessageCircle,
  Package, ShieldCheck, Sparkles, Store, Truck, Zap, BarChart3,
  Palette, Headphones, Lock, Smartphone
} from "lucide-react";
import { PRICING } from "@/lib/pricing";
import { WhatsAppIcon } from "@/components/WhatsAppIcon";

const SERVICES = [
  {
    icon: Store,
    title: "متجر إلكتروني جاهز",
    desc: "متجر أنيق خلال دقائق: منتجات، أسعار، صور، وطلب بضغطة واحدة — بدون تعقيد تقني.",
  },
  {
    icon: MessageCircle,
    title: "طلبات واتساب ذكية",
    desc: "نموذج طلب داخل المتجر: الاسم، الهاتف، الولاية، نوع التوصيل، والمجموع — ثم رسالة واتساب جاهزة.",
  },
  {
    icon: Truck,
    title: "58 ولاية · أسعار شحن",
    desc: "قائمة ولايات جزائرية مع تسعير منزلي / Stop Desk. في Pro خصّص أسعار كل ولاية.",
  },
  {
    icon: LayoutDashboard,
    title: "لوحة تحكم للتاجر",
    desc: "إدارة المنتجات، واتساب، القنوات، والإعدادات من مكان واحد — مع حفظ مباشر على السحابة.",
  },
  {
    icon: Palette,
    title: "هوية وعلامة تجارية",
    desc: "المجاني يعرّف بمنصة AB Store Noor. Pro يزيل شعار المنصة ويضع شعارك أنت.",
  },
  {
    icon: BarChart3,
    title: "إحصائيات ونمو",
    desc: "أساسيات للمجاني، ولوحة أعمق في Pro مع بكسل Meta / TikTok لاحقاً لإعادة الاستهداف.",
  },
];

const STEPS = [
  { n: "01", t: "أنشئ حسابك", d: "تسجيل مجاني وربطه بمتجرك تلقائياً." },
  { n: "02", t: "أضف منتجاتك", d: "صور، أسعار، ووصف — حتى 10 في المجاني بلا حدود في Pro." },
  { n: "03", t: "شارك الرابط", d: "رابط متجرك للزبائن على واتساب وفيسبوك وإنستغرام." },
  { n: "04", t: "استقبل الطلبات", d: "الزبون يملأ النموذج وأنت تصلك التفاصيل جاهزة." },
];

export function LandingPage() {
  const [cycle, setCycle] = useState<"monthly" | "yearly">("monthly");
  const proPrice = cycle === "yearly" ? PRICING.pro.priceYearly : PRICING.pro.priceMonthly;
  const proLabel = cycle === "yearly" ? "سنوياً" : "شهرياً";

  return (
    <div className="lp" dir="rtl">
      <div className="lp-glow" aria-hidden />
      <div className="lp-glow2" aria-hidden />

      <header className="lp-header">
        <a href="/" className="lp-brand">
          <img src="/logo-ab.png" alt="AB Store Noor" className="lp-logo" />
          <div>
            <strong>AB STORE NOOR</strong>
            <span>متاجر النور</span>
          </div>
        </a>
        <nav className="lp-nav">
          <a href="#services">الخدمات</a>
          <a href="#how">كيف يعمل</a>
          <a href="#pricing">الأسعار</a>
          <a href="/dashboard" className="lp-nav-cta">دخول التاجر</a>
        </nav>
      </header>

      <section className="lp-hero">
        <div className="lp-hero-copy">
          <p className="lp-eyebrow"><Sparkles size={14} /> منصة جزائرية لتجّار يحبون السرعة والأناقة</p>
          <h1>
            متجرك الإلكتروني
            <br />
            <em>جاهز… ويبيع.</em>
          </h1>
          <p className="lp-lead">
            أنشئ متجراً احترافياً، استقبل الطلبات عبر واتساب مع الولاية والشحن،
            وابنِ علامتك — مجاناً للبداية، وPro عندما تكبر.
          </p>
          <div className="lp-cta-row">
            <a href="/dashboard" className="lp-btn-primary">
              ابدأ مجاناً الآن <ArrowUpLeft size={18} />
            </a>
            <a href="#pricing" className="lp-btn-ghost">
              قارن الخطط
            </a>
          </div>
          <div className="lp-trust">
            <span><ShieldCheck size={16} /> 0% عمولة على المبيعات</span>
            <span><Truck size={16} /> توصيل 58 ولاية</span>
            <span><Lock size={16} /> بياناتك على سحابة آمنة</span>
          </div>
        </div>
        <div className="lp-hero-card">
          <div className="lp-card-top">
            <img src="/logo-ab.png" alt="" className="lp-card-logo" />
            <span>مثال واجهة المتجر</span>
          </div>
          <div className="lp-card-body">
            <div className="lp-fake-product">
              <div className="lp-fake-img" />
              <div>
                <b>منتجك هنا</b>
                <small>السعر · الولاية · واتساب</small>
              </div>
            </div>
            <div className="lp-fake-row"><span>ولاية الزبون</span><strong>عنابة</strong></div>
            <div className="lp-fake-row"><span>الشحن</span><strong>500 دج</strong></div>
            <div className="lp-fake-row total"><span>الإجمالي</span><strong>9.400 دج</strong></div>
            <div className="lp-fake-btn"><WhatsAppIcon size={18} /> تأكيد الطلب</div>
          </div>
        </div>
      </section>

      <section id="services" className="lp-section">
        <div className="lp-section-head">
          <p className="lp-eyebrow"><Zap size={14} /> خدمات المنصة</p>
          <h2>كل ما يحتاجه التاجر… <em>في مكان واحد</em></h2>
          <p>من أول منتج إلى أول طلبية — بدون برمجة وبدون عمولة على مبيعاتك.</p>
        </div>
        <div className="lp-grid">
          {SERVICES.map((s) => (
            <article key={s.title} className="lp-service">
              <div className="lp-service-icon"><s.icon size={22} /></div>
              <h3>{s.title}</h3>
              <p>{s.desc}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="how" className="lp-section lp-section-alt">
        <div className="lp-section-head">
          <p className="lp-eyebrow"><Package size={14} /> أربع خطوات</p>
          <h2>من التسجيل إلى <em>أول طلب</em></h2>
        </div>
        <ol className="lp-steps">
          {STEPS.map((st) => (
            <li key={st.n}>
              <span className="lp-step-n">{st.n}</span>
              <div>
                <h3>{st.t}</h3>
                <p>{st.d}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section id="pricing" className="lp-section">
        <div className="lp-section-head">
          <p className="lp-eyebrow"><Crown size={14} /> التسعير</p>
          <h2>ابدأ مجاناً. <em>ترقَّ عندما تكون جاهزاً</em></h2>
          <div className="lp-cycle">
            <button type="button" className={cycle === "monthly" ? "on" : ""} onClick={() => setCycle("monthly")}>شهري</button>
            <button type="button" className={cycle === "yearly" ? "on" : ""} onClick={() => setCycle("yearly")}>
              سنوي <small>شهرين هدية</small>
            </button>
          </div>
        </div>
        <div className="lp-prices">
          <div className="lp-price-card">
            <p className="lp-plan-name">مجاني</p>
            <p className="lp-plan-price">0 <small>دج / للأبد</small></p>
            <ul>
              {PRICING.free.features.map((f) => (
                <li key={f}><Check size={16} /> {f}</li>
              ))}
            </ul>
            <a href="/dashboard" className="lp-btn-ghost block">ابدأ مجاناً</a>
          </div>
          <div className="lp-price-card featured">
            <span className="lp-badge">الأكثر قيمة</span>
            <p className="lp-plan-name">Pro احترافي</p>
            <p className="lp-plan-price">
              {proPrice.toLocaleString("ar-DZ")} <small>دج / {proLabel}</small>
            </p>
            <ul>
              {PRICING.pro.features.map((f) => (
                <li key={f}><Check size={16} /> {f}</li>
              ))}
            </ul>
            <a href="/dashboard" className="lp-btn-primary block">ترقية من لوحة التحكم</a>
          </div>
        </div>
        <p className="lp-pay-note">
          الدفع للتجار الجزائريين: BaridiMob (رفع وصل) أو سحب بدون بطاقة — تفعيل بعد مراجعة سريعة.
        </p>
      </section>

      <section className="lp-section lp-section-alt">
        <div className="lp-section-head">
          <p className="lp-eyebrow"><Globe2 size={14} /> لماذا نحن؟</p>
          <h2>مصمَّمة للسوق <em>الجزائري</em></h2>
        </div>
        <div className="lp-why">
          <div><Smartphone size={20} /><b>طلب بلا تعقيد</b><p>الزبون لا يتوه في سلة طويلة — نموذج واضح وواتساب.</p></div>
          <div><Headphones size={20} /><b>دعم محلي</b><p>Pro يحصل على أولوية واتساب / تيليغرام.</p></div>
          <div><ShieldCheck size={20} /><b>بدون عمولة مبيعات</b><p>اشتراك واضح — لا نأخذ نسبة من طلباتك.</p></div>
        </div>
      </section>

      <section className="lp-final">
        <img src="/logo-ab.png" alt="" className="lp-final-logo" />
        <h2>متجرك يستحق واجهة تليق به</h2>
        <p>انضم مجاناً اليوم. عندما تريد إزالة شعار المنصة ووضع شعارك — Pro بجانبك.</p>
        <a href="/dashboard" className="lp-btn-primary">إنشاء متجري مجاناً <ArrowUpLeft size={18} /></a>
      </section>

      <footer className="lp-footer">
        <div className="lp-footer-brand">
          <img src="/logo-ab.png" alt="AB Store Noor" />
          <span>AB Store Noor · متاجر النور</span>
        </div>
        <p>© {new Date().getFullYear()} AB Technologie. جميع الحقوق محفوظة.</p>
        <div className="lp-footer-links">
          <a href="/dashboard">لوحة التاجر</a>
          <a href="#pricing">الأسعار</a>
          <a href="#services">الخدمات</a>
        </div>
      </footer>
    </div>
  );
}
