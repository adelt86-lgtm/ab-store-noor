import { useRef, useState, type FormEvent } from "react";
import { X, Crown, Check, Upload, Send, Image as ImageIcon } from "lucide-react";
import { PRICING, BARIDIMOB_RIP, amountForCycle, type BillingCycle, type PlanId } from "@/lib/pricing";
import { submitUpgradeRequest, uploadReceipt, getSessionUser } from "@/lib/storeData";
import { getLanguage, type LanguageCode } from "@/i18n";

type Props = { open: boolean; onClose: () => void; storeId: string | null; currentPlan?: PlanId; language?: LanguageCode };

const FEATURES_FR: Record<string, string> = {
  "Produits illimités": "Produits illimités",
  "طلبات بلا حد": "Commandes illimitées",
  "إزالة شعار المنصة": "Suppression du logo de la plateforme",
  "لوجو واسم متجرك": "Logo et nom de votre boutique",
  "تصدير Excel/CSV للشحن": "Export Excel/CSV pour la livraison",
  "تخصيص أسعار التوصيل": "Tarifs de livraison personnalisables",
  "دعم أولوية واتساب": "Support WhatsApp prioritaire",
  "كل مزايا Pro": "Toutes les fonctionnalités Pro",
  "شحن بضغطة زر (Yalidine / ZR) — قريباً": "Expédition en un clic (Yalidine / ZR) — bientôt",
  "تتبع الطرد + Bordereau — قريباً": "Suivi du colis + bordereau — bientôt",
  "أولوية قصوى للدعم": "Support prioritaire maximal",
  "دومين خاص (أولوية)": "Domaine personnalisé (prioritaire)",
};

export function UpgradeModal({ open, onClose, storeId, currentPlan = "free", language: languageProp }: Props) {
  const language = languageProp || getLanguage();
  const fr = language === "fr";
  const [plan, setPlan] = useState<Exclude<PlanId, "free">>(currentPlan === "pro" ? "pro_shipping" : "pro");
  const [cycle, setCycle] = useState<BillingCycle>("monthly");
  const [phone, setPhone] = useState("");
  const [gabCode, setGabCode] = useState("");
  const [operationNumber, setOperationNumber] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  if (!open) return null;
  const amount = amountForCycle(plan, cycle);
  const amountLabel = amount.toLocaleString(fr ? "fr-DZ" : "ar-DZ");
  const features = PRICING[plan].features.map((f) => fr ? (FEATURES_FR[f] || f) : f);

  const submit = async (e: FormEvent) => {
    e.preventDefault(); setErr(""); setMsg("");
    if (!storeId) return setErr(fr ? "La boutique n’est pas prête." : "المتجر غير جاهز");
    const hasBaridimob = !!file;
    const hasCardless = !!(gabCode.trim() && operationNumber.trim());
    if (!hasBaridimob && !hasCardless) return setErr(fr ? "Complétez au moins un mode de paiement : téléversez le reçu ou saisissez le numéro d’opération et le code de retrait." : "أكمل طريقة دفع واحدة على الأقل: ارفع صورة الوصل، أو أدخل رقم العملية + رمز السحب.");
    if ((gabCode.trim() || operationNumber.trim()) && !phone.trim()) return setErr(fr ? "Saisissez le numéro de téléphone avec les informations du retrait sans carte." : "أدخل رقم الهاتف مع بيانات السحب بدون بطاقة.");
    setBusy(true);
    try {
      const user = await getSessionUser();
      if (!user) throw new Error(fr ? "Veuillez d’abord vous connecter." : "سجّل الدخول أولاً");
      const receipt_url = hasBaridimob ? await uploadReceipt(user.id, file!) : null;
      const payment_method = hasBaridimob && hasCardless ? "both" : hasBaridimob ? "baridimob" : "gab_retrait";
      await submitUpgradeRequest({ store_id: storeId, owner_id: user.id, plan_requested: plan, billing_cycle: cycle, amount_dzd: amount, payment_method, receipt_url, gab_code: hasCardless ? gabCode.trim() : null, operation_number: hasCardless ? operationNumber.trim() : null, phone: phone.trim() || null });
      setMsg(fr ? `La demande ${plan === "pro_shipping" ? "Pro Delivery" : "Pro"} a été envoyée. Après vérification, nous activerons le forfait approprié.` : `تم إرسال طلب ${plan === "pro_shipping" ? "Pro شحن" : "Pro"}. بعد التحقق نراجع الطلب ونفعّل الباقة المناسبة.`);
      setFile(null); setGabCode(""); setOperationNumber("");
    } catch (ex: any) { setErr(ex?.message || String(ex)); }
    finally { setBusy(false); }
  };

  return <div className="om-overlay" role="dialog" aria-modal="true" aria-labelledby="upgrade-title">
    <div className="om-sheet upgrade-sheet" dir={fr ? "ltr" : "rtl"}>
      <header className="om-head"><div>
        <h2 id="upgrade-title"><Crown size={18} /> {fr ? "Mettre à niveau le forfait" : "ترقية الباقة"}</h2>
        <p>{fr ? "Choisissez le forfait qui vous convient. Pro Delivery ajoute la livraison, le suivi et la gestion des transporteurs." : "اختر الباقة المناسبة لك. Pro Delivery يضيف الشحن والتتبع وإدارة شركات التوصيل."}</p>
      </div><button type="button" className="om-x" onClick={onClose} aria-label={fr ? "Fermer" : "إغلاق"}><X size={18} /></button></header>
      <div className="om-body"><div className="om-field"><span>{fr ? "Forfait" : "الباقة"}</span><div className="om-seg">
        {currentPlan === "free" && <button type="button" className={plan === "pro" ? "on" : ""} onClick={() => setPlan("pro")}>Pro</button>}
        {currentPlan !== "pro_shipping" && <button type="button" className={plan === "pro_shipping" ? "on" : ""} onClick={() => setPlan("pro_shipping")}>Pro Delivery</button>}
      </div></div>
      <div className="upgrade-plan pro"><b>{plan === "pro_shipping" ? "Pro Delivery" : "Pro"} · {cycle === "yearly" ? `${PRICING[plan].priceYearly.toLocaleString(fr ? "fr-DZ" : "ar-DZ")} ${fr ? "DZD/an" : "دج/سنة"}` : `${PRICING[plan].priceMonthly.toLocaleString(fr ? "fr-DZ" : "ar-DZ")} ${fr ? "DZD/mois" : "دج/شهر"}`}</b><ul>{features.map((f) => <li key={f}><Check size={14} /> {f}</li>)}</ul></div></div>
      <form onSubmit={submit} className="om-form upgrade-form">
        <div className="om-field"><span>{fr ? "Cycle de facturation" : "دورة الفوترة"}</span><div className="om-seg">
          <button type="button" className={cycle === "monthly" ? "on" : ""} onClick={() => setCycle("monthly")}>{fr ? "Mensuel" : "شهري"} · {PRICING[plan].priceMonthly.toLocaleString(fr ? "fr-DZ" : "ar-DZ")} {fr ? "DZD" : "دج"}</button>
          <button type="button" className={cycle === "yearly" ? "on" : ""} onClick={() => setCycle("yearly")}>{fr ? "Annuel" : "سنوي"} · {PRICING[plan].priceYearly.toLocaleString(fr ? "fr-DZ" : "ar-DZ")} {fr ? "DZD" : "دج"} <small>{fr ? "Économisez 9 800 DZD" : "وفر 9,800 دج"}</small></button>
        </div></div>
        <p className="upgrade-pay-title">{fr ? "Modes de paiement — complétez au moins un" : <>طرق الدفع — أكمل <strong>واحدة</strong> على الأقل</>}</p>
        <div className="pay-method"><div className="pay-method-head">{fr ? "1) Virement BaridiMob + photo du reçu" : "1) تحويل BaridiMob + صورة الوصل"}</div><div className="pay-box"><p>{fr ? <>Transférez <strong>{amountLabel} DZD</strong> vers le RIP :</> : <>حوّل <strong>{amountLabel} دج</strong> إلى رقم RIP:</>}</p><code className="rip">{BARIDIMOB_RIP}</code><p className="hint">{fr ? "Puis téléversez une photo claire du reçu." : "ثم ارفع صورة واضحة للوصل."}</p></div>
          <div className={`upgrade-upload-btn ${file ? "has-file" : ""}`} role="button" tabIndex={0} onClick={() => fileInputRef.current?.click()} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fileInputRef.current?.click(); } }}><input ref={fileInputRef} type="file" accept="image/*" className="upgrade-file-input" onChange={(e) => setFile(e.target.files?.[0] || null)} /><span className="upgrade-upload-icon"><Upload size={20} /></span><span className="upgrade-upload-text">{file ? <><b>{fr ? "Fichier sélectionné" : "تم اختيار الملف"}</b><small>{file.name}</small></> : <><b>{fr ? "Cliquez pour téléverser le reçu" : "اضغط لرفع صورة الوصل"}</b><small>JPG أو PNG</small></>}</span>{file && <ImageIcon size={18} className="upgrade-upload-ok" />}</div>
        </div>
        <div className="pay-method"><div className="pay-method-head">{fr ? "2) Retrait sans carte (depuis l’application BaridiMob)" : "2) سحب بدون بطاقة (من تطبيق BaridiMob)"}</div><div className="pay-box"><p>{fr ? <>Créez une opération de retrait de <strong>{amountLabel} DZD</strong> puis saisissez les informations :</> : <>أنشئ عملية سحب بمبلغ <strong>{amountLabel} دج</strong> ثم أدخل البيانات:</>}</p></div>
          <label className="om-field"><span>{fr ? "Numéro de l’opération" : "رقم العملية"}</span><input value={operationNumber} onChange={(e) => setOperationNumber(e.target.value)} placeholder={fr ? "Numéro de l’opération depuis l’application" : "رقم العملية من التطبيق"} autoComplete="off" /></label>
          <label className="om-field"><span>{fr ? "Code de retrait" : "رمز السحب"}</span><input value={gabCode} onChange={(e) => setGabCode(e.target.value)} placeholder={fr ? "Code GAB" : "رمز GAB"} autoComplete="off" /></label>
          <label className="om-field"><span>{fr ? "Numéro de téléphone" : "رقم الهاتف"}</span><input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="05xxxxxxxx" inputMode="tel" /></label>
        </div>
        {err && <div className="om-error">{err}</div>}{msg && <div className="om-ok">{msg}</div>}
        <button type="submit" className="upgrade-submit-btn" disabled={busy}><Send size={18} />{busy ? (fr ? "Envoi…" : "جاري الإرسال…") : `${fr ? "Envoyer la demande de mise à niveau ·" : "إرسال طلب الترقية ·"} ${amountLabel} ${fr ? "DZD" : "دج"}`}</button>
        <p className="upgrade-submit-hint">{fr ? "La demande est envoyée à l’administration pour vérification et activation manuelle." : "يصل الطلب إلى الإدارة للمراجعة والتفعيل اليدوي."}</p>
      </form>
    </div>
  </div>;
}
