import { useRef, useState, type FormEvent } from "react";
import { createPortal } from "react-dom";
import { X, Crown, Check, Upload, Send, Image as ImageIcon } from "lucide-react";
import { PRICING, BARIDIMOB_RIP, amountForCycle, type BillingCycle, type PlanId } from "@/lib/pricing";
import { submitUpgradeRequest, uploadReceipt, getSessionUser } from "@/lib/storeData";

type Props = {
  open: boolean;
  onClose: () => void;
  storeId: string | null;
  currentPlan?: PlanId;
};

export function UpgradeModal({ open, onClose, storeId, currentPlan = "free" }: Props) {
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
  const amountLabel = amount.toLocaleString("ar-DZ");

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setErr("");
    setMsg("");
    if (!storeId) {
      setErr("المتجر غير جاهز");
      return;
    }

    const hasBaridimob = !!file;
    const hasCardless = gabCode.trim() && operationNumber.trim();
    if (!hasBaridimob && !hasCardless) {
      setErr("أكمل طريقة دفع واحدة على الأقل: ارفع صورة الوصل، أو أدخل رقم العملية + رمز السحب.");
      return;
    }
    if ((gabCode.trim() || operationNumber.trim()) && !phone.trim()) {
      setErr("أدخل رقم الهاتف مع بيانات السحب بدون بطاقة.");
      return;
    }

    setBusy(true);
    try {
      const user = await getSessionUser();
      if (!user) throw new Error("سجّل الدخول أولاً");
      let receipt_url: string | null = null;
      if (hasBaridimob) receipt_url = await uploadReceipt(user.id, file!);

      const payment_method =
        hasBaridimob && hasCardless ? "both" : hasBaridimob ? "baridimob" : "gab_retrait";

      await submitUpgradeRequest({
        store_id: storeId,
        owner_id: user.id,
        plan_requested: plan,
        billing_cycle: cycle,
        amount_dzd: amount,
        payment_method,
        receipt_url,
        gab_code: hasCardless ? gabCode.trim() : null,
        operation_number: hasCardless ? operationNumber.trim() : null,
        phone: phone.trim() || null,
      });
      setMsg(`تم إرسال طلب ${plan === "pro_shipping" ? "Pro شحن" : "Pro"}. بعد التحقق نراجع الطلب ونفعّل الباقة المناسبة.`);
      setFile(null);
      setGabCode("");
      setOperationNumber("");
    } catch (ex: any) {
      setErr(ex?.message || String(ex));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="om-overlay" role="dialog" aria-modal="true" aria-labelledby="upgrade-title" onPointerDownCapture={() => console.log("UPGRADE_MODAL_POINTER")}>
      <div className="om-sheet upgrade-sheet">
        <header className="om-head">
          <div>
            <h2 id="upgrade-title"><Crown size={18} /> ترقية الباقة</h2>
            <p>اختر الباقة المناسبة لك. Pro Delivery يضيف الشحن والتتبع وإدارة شركات التوصيل.</p>
          </div>
          <button type="button" className="om-x" onClick={onClose} aria-label="إغلاق"><X size={18} /></button>
        </header>

        <div className="om-body">
          <div className="om-field">
            <span>الباقة</span>
            <div className="om-seg">
              {currentPlan === "free" && <button type="button" className={plan === "pro" ? "on" : ""} onClick={() => setPlan("pro")}>Pro</button>}
              {currentPlan !== "pro_shipping" && <button type="button" className={plan === "pro_shipping" ? "on" : ""} onClick={() => setPlan("pro_shipping")}>Pro Delivery</button>}
            </div>
          </div>
          <div className="upgrade-plan pro">
            <b>{PRICING[plan].name} · {cycle === "yearly" ? `${PRICING[plan].priceYearly.toLocaleString("ar-DZ")} دج/سنة` : `${PRICING[plan].priceMonthly.toLocaleString("ar-DZ")} دج/شهر`}</b>
            <ul>{PRICING[plan].features.map((f) => <li key={f}><Check size={14} /> {f}</li>)}</ul>
          </div>
        </div>

        <form onSubmit={submit} className="om-form upgrade-form">
          <div className="om-field">
            <span>دورة الفوترة</span>
            <div className="om-seg">
              <button type="button" className={cycle === "monthly" ? "on" : ""} onClick={() => setCycle("monthly")}>شهري · {PRICING[plan].priceMonthly.toLocaleString("ar-DZ")} دج</button>
              <button type="button" className={cycle === "yearly" ? "on" : ""} onClick={() => setCycle("yearly")}>سنوي · {PRICING[plan].priceYearly.toLocaleString("ar-DZ")} دج <small>وفر 9,800 دج</small></button>
            </div>
          </div>

          <p className="upgrade-pay-title">طرق الدفع — أكمل <strong>واحدة</strong> على الأقل</p>

          {/* Method 1 */}
          <div className="pay-method">
            <div className="pay-method-head">1) تحويل BaridiMob + صورة الوصل</div>
            <div className="pay-box">
              <p>حوّل <strong>{amountLabel} دج</strong> إلى رقم RIP:</p>
              <code className="rip">{BARIDIMOB_RIP}</code>
              <p className="hint">ثم ارفع صورة واضحة للوصل.</p>
            </div>

            <div
              className={`upgrade-upload-btn ${file ? "has-file" : ""}`}
              role="button"
              tabIndex={0}
              onClick={() => fileInputRef.current?.click()}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  fileInputRef.current?.click();
                }
              }}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="upgrade-file-input"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
              />
              <span className="upgrade-upload-icon"><Upload size={20} /></span>
              <span className="upgrade-upload-text">
                {file ? (
                  <>
                    <b>تم اختيار الملف</b>
                    <small>{file.name}</small>
                  </>
                ) : (
                  <>
                    <b>اضغط لرفع صورة الوصل</b>
                    <small>JPG أو PNG</small>
                  </>
                )}
              </span>
              {file && <ImageIcon size={18} className="upgrade-upload-ok" />}
            </div>
          </div>

          {/* Method 2 */}
          <div className="pay-method">
            <div className="pay-method-head">2) سحب بدون بطاقة (من تطبيق BaridiMob)</div>
            <div className="pay-box">
              <p>أنشئ عملية سحب بمبلغ <strong>{amountLabel} دج</strong> ثم أدخل البيانات:</p>
            </div>
            <label className="om-field">
              <span>رقم العملية</span>
              <input value={operationNumber} onChange={(e) => setOperationNumber(e.target.value)} placeholder="رقم العملية من التطبيق" autoComplete="off" />
            </label>
            <label className="om-field">
              <span>رمز السحب</span>
              <input value={gabCode} onChange={(e) => setGabCode(e.target.value)} placeholder="رمز GAB" autoComplete="off" />
            </label>
            <label className="om-field">
              <span>رقم الهاتف</span>
              <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="05xxxxxxxx" inputMode="tel" />
            </label>
          </div>

          {err && <div className="om-error">{err}</div>}
          {msg && <div className="om-ok">{msg}</div>}

          <button type="submit" className="upgrade-submit-btn" disabled={busy}>
            <Send size={18} />
            {busy ? "جاري الإرسال…" : `إرسال طلب الترقية · ${amountLabel} دج`}
          </button>
          <p className="upgrade-submit-hint">يصل الطلب إلى الإدارة للمراجعة والتفعيل اليدوي.</p>
        </form>
      </div>
    </div>
  );
}
