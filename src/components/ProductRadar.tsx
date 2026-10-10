import { useCallback, useEffect, useState } from "react";
import { Activity, AlertTriangle, ArrowUpRight, Calculator, ExternalLink, RefreshCw, Search, Sparkles, TrendingUp } from "lucide-react";
import { supabase } from "@/lib/supabase";

type Lang = "ar" | "fr";
type Trend = { id: string; title: string; url: string; publishedAt: string; approxTraffic: string | null; news: { title: string; url: string; source: string }[] };
type Opportunity = { name: string; why: string; relatedTrend: string; risk: string; confidence: "low" | "medium"; evidence: string[] };
type RadarResponse = { source: string; fetchedAt: string; items: Trend[]; aiConfigured: boolean; model?: string; opportunities: Opportunity[]; note?: string; aiError?: string };
const money = (n: number) => new Intl.NumberFormat("fr-DZ", { maximumFractionDigits: 0 }).format(n) + " دج";

export default function ProductRadar({ language }: { language: Lang }) {
  const fr = language === "fr";
  const [data, setData] = useState<RadarResponse | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [cost, setCost] = useState("1000");
  const [price, setPrice] = useState("2500");
  const [delivery, setDelivery] = useState("600");
  const [ads, setAds] = useState("250");
  const [returnRate, setReturnRate] = useState("10");
  const [marginShown, setMarginShown] = useState(false);
  const fetchData = useCallback(async () => {
    setBusy(true); setError("");
    try {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !sessionData.session?.access_token) throw new Error(fr ? "Connectez-vous pour consulter le radar." : "سجّل الدخول لاستخدام رادار المنتجات.");
      const response = await fetch("/api/product-radar", { headers: { Authorization: `Bearer ${sessionData.session.access_token}` }, cache: "no-store" });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.message || (response.status === 401 ? (fr ? "Session expirée. Reconnectez-vous." : "انتهت الجلسة، أعد تسجيل الدخول.") : (fr ? "Source de tendances indisponible." : "مصدر الاتجاهات غير متاح الآن.")));
      setData(payload as RadarResponse);
    } catch (e) { setError(e instanceof Error ? e.message : String(e)); }
    finally { setBusy(false); }
  }, [fr]);
  useEffect(() => { void fetchData(); }, [fetchData]);
  const visibleTrends = (data?.items || []).filter((item) => item.title.toLocaleLowerCase().includes(query.toLocaleLowerCase()));
  const net = Number(price || 0) - Number(cost || 0) - Number(delivery || 0) - Number(ads || 0) - Number(delivery || 0) * Math.min(100, Math.max(0, Number(returnRate || 0))) / 100;
  const margin = Number(price) > 0 ? net / Number(price) * 100 : 0;
  const dt = data?.fetchedAt ? new Date(data.fetchedAt).toLocaleString(fr ? "fr-DZ" : "ar-DZ") : "";
  return <div className="ab-content radar-page">
    <header className="radar-hero"><div><span className="radar-kicker"><Sparkles size={14}/>{fr ? "INTELLIGENCE PRODUIT · DONNÉES RÉELLES" : "ذكاء المنتجات · بيانات حقيقية"}</span><h2>{fr ? "Radar de produits" : "رادار المنتجات"}</h2><p>{fr ? "Les tendances proviennent du flux Google Trends pour l’Algérie. L’IA propose des hypothèses commerciales, jamais des chiffres de ventes inventés." : "الاتجاهات من موجز Google Trends للجزائر. يقترح الذكاء الاصطناعي أفكارًا تجارية، ولا يختلق أرقام مبيعات."}</p><small><Activity size={14}/>{data ? `${fr ? "Dernière collecte" : "آخر تحديث"}: ${dt}` : (fr ? "En attente de données en direct" : "بانتظار البيانات المباشرة")}</small></div><div className="radar-orb"><TrendingUp size={34}/></div></header>
    <div className="radar-livebar"><span className={`radar-live-dot ${data ? "online" : ""}`}/><b>{data ? (fr ? "Source en direct" : "المصدر المباشر متصل") : (busy ? (fr ? "Connexion à la source…" : "جارٍ الاتصال بالمصدر…") : (fr ? "Non connecté" : "غير متصل"))}</b><span>{fr ? "Google Trends · Algérie (DZ)" : "Google Trends · الجزائر (DZ)"}</span><button type="button" className="secondary-btn" onClick={() => void fetchData()} disabled={busy}><RefreshCw size={15} className={busy ? "radar-spin" : ""}/>{fr ? "Actualiser" : "تحديث"}</button></div>
    {error && <div className="radar-error"><AlertTriangle size={18}/><div><b>{fr ? "Les données en direct sont indisponibles" : "تعذر جلب البيانات المباشرة"}</b><p>{error}</p><small>{fr ? "Aucune donnée de démonstration n’est affichée à la place." : "لن نعرض بيانات تجريبية بدلًا منها."}</small></div></div>}
    {data?.aiError && <div className="radar-error"><AlertTriangle size={18}/><p>{data.aiError}</p></div>}
    {data?.note && <div className="radar-notice"><Sparkles size={17}/><span>{data.note}</span></div>}
    <div className="radar-section-title"><div><span className="ab-kicker">01 / LIVE SIGNALS</span><h3>{fr ? "Recherches tendance en Algérie" : "عمليات البحث الرائجة في الجزائر"}</h3><p>{fr ? "Les volumes approximatifs ne sont affichés que si la source les fournit." : "لا تظهر أحجام البحث التقريبية إلا إذا وفرها المصدر."}</p></div><label className="radar-search"><Search size={16}/><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={fr ? "Filtrer les tendances" : "ابحث ضمن الاتجاهات"}/></label></div>
    <div className="radar-trends-grid">{visibleTrends.map((item) => <article className="radar-trend-card" key={item.id}><div className="radar-trend-top"><span>{fr ? "TENDANCE SOURCE" : "اتجاه من المصدر"}</span><ExternalLink size={15}/></div><h4>{item.title}</h4>{item.approxTraffic && <p className="radar-traffic">{fr ? "Trafic approximatif fourni par Google" : "حركة تقريبية كما وفرها Google"}: <b>{item.approxTraffic}</b></p>}<p className="radar-trend-date">{item.publishedAt ? new Date(item.publishedAt).toLocaleString(fr ? "fr-DZ" : "ar-DZ") : ""}</p><a href={item.url} target="_blank" rel="noreferrer">{fr ? "Vérifier la source" : "تحقق من المصدر"}<ArrowUpRight size={14}/></a></article>)}{!busy && data && visibleTrends.length === 0 && <p className="radar-empty">{fr ? "Aucune tendance correspondante." : "لا توجد اتجاهات مطابقة."}</p>}{busy && !data && <p className="radar-empty">{fr ? "Chargement du flux Google Trends…" : "جارٍ تحميل موجز Google Trends…"}</p>}</div>
    <div className="radar-section-title radar-opportunity-heading"><div><span className="ab-kicker">02 / GROQ ANALYSIS</span><h3>{fr ? "Hypothèses de produits à tester" : "أفكار منتجات تستحق الاختبار"}</h3><p>{fr ? "Les idées doivent être validées par un test commercial; une tendance n’est pas une preuve de ventes." : "يجب اختبار الأفكار تجاريًا؛ الاتجاه الرائج ليس دليلًا على المبيعات."}</p></div><span className="radar-model-pill">{data?.aiConfigured ? `Groq · ${data.model || "configured"}` : "Groq · " + (fr ? "non configuré" : "غير مهيأ")}</span></div>
    {data?.opportunities?.length ? <div className="radar-opportunity-grid">{data.opportunities.map((idea, i) => <article className="radar-opportunity-card" key={`${idea.name}-${i}`}><div className="radar-idea-index">{String(i + 1).padStart(2, "0")}</div><h4>{idea.name}</h4><p>{idea.why}</p><div className="radar-evidence"><b>{fr ? "Signal associé" : "الاتجاه المرتبط"}</b><span>{idea.relatedTrend}</span>{idea.evidence.map((e) => <small key={e}>• {e}</small>)}</div><div className="radar-risk"><b>{fr ? "Risque à vérifier" : "مخاطر يجب التحقق منها"}</b><span>{idea.risk}</span></div><small className="radar-confidence">{fr ? "Confiance exploratoire" : "درجة الثقة الاستكشافية"}: {idea.confidence === "medium" ? (fr ? "moyenne" : "متوسطة") : (fr ? "faible" : "منخفضة")}</small></article>)}</div> : <div className="radar-empty radar-empty-large">{busy ? (fr ? "Analyse des tendances en cours…" : "جارٍ تحليل الاتجاهات…") : (data?.aiConfigured ? (fr ? "Aucune hypothèse fiable n’a été retenue à partir de ces tendances." : "لم تُستخرج أفكار موثوقة من الاتجاهات الحالية.") : (fr ? "Ajoutez GROQ_API_KEY et GROQ_MODEL dans les variables Vercel pour activer l’analyse Groq." : "أضف GROQ_API_KEY وGROQ_MODEL إلى متغيرات Vercel لتفعيل تحليل Groq."))}</div>}
    <section className="radar-calculator"><div><span className="ab-kicker">03 / UNIT ECONOMICS</span><h3><Calculator size={19}/>{fr ? "Calculateur de rentabilité" : "حاسبة ربحية المنتج"}</h3><p>{fr ? "Calcul basé uniquement sur les coûts que vous saisissez; il ne prédit pas la demande." : "الحساب يعتمد على التكاليف التي تدخلها فقط؛ ولا يتنبأ بالطلب."}</p><div className="radar-calculator-fields">{[[fr ? "Coût d’achat" : "سعر الشراء", cost, setCost], [fr ? "Prix de vente" : "سعر البيع", price, setPrice], [fr ? "Livraison à charge vendeur" : "التوصيل على البائع", delivery, setDelivery], [fr ? "Publicité / commande" : "الإعلانات لكل طلب", ads, setAds], [fr ? "Retours (%)" : "المرتجعات (%)", returnRate, setReturnRate]].map(([label, value, setter]: any) => <label key={label}><span>{label}</span><input type="number" min="0" value={value} onChange={(e) => setter(e.target.value)}/></label>)}</div><button className="primary-btn" type="button" onClick={() => setMarginShown(true)}>{fr ? "Calculer la marge estimée" : "احسب هامش الربح التقديري"}</button></div>{marginShown && <div className="radar-calculator-result"><span>{fr ? "Profit estimé par commande livrée" : "الربح التقديري لكل طلب مسلّم"}</span><strong className={net < 0 ? "negative" : ""}>{money(net)}</strong><small>{fr ? "Marge sur prix de vente" : "هامش الربح من سعر البيع"}: {margin.toFixed(1)}%</small><small>{fr ? "Hypothèse simple : coût des retours = livraison × taux saisi. Vérifiez vos coûts réels." : "افتراض مبسط: تكلفة المرتجع = التوصيل × النسبة المدخلة. تحقق من تكاليفك الفعلية."}</small></div>}</section>
    <div className="radar-disclaimer">{fr ? "Sources et limites : Google Trends fournit des tendances de recherche, pas des ventes garanties. Les suggestions Groq sont des hypothèses générées à partir des titres source et doivent être validées avant tout achat de stock." : "المصادر والحدود: Google Trends يعرض اتجاهات البحث وليس مبيعات مؤكدة. اقتراحات Groq فرضيات مستخرجة من عناوين المصدر ويجب التحقق منها قبل شراء المخزون."}{data?.source && <> · <a href={data.source} target="_blank" rel="noreferrer">Google Trends RSS</a></>}</div>
  </div>;
}
