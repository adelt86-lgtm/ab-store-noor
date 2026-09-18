import { useState, type FormEvent } from "react";
import { X, Crown, Check, Upload } from "lucide-react";
import { PRICING, BARIDIMOB_RIP, amountForCycle, type BillingCycle } from "@/lib/pricing";
import { submitUpgradeRequest, uploadReceipt, getSessionUser } from "@/lib/storeData";

type Props = {
  open: boolean;
  onClose: () => void;
  storeId: string | null;
};

export function UpgradeModal({ open, onClose, storeId }: Props) {
  const [cycle, setCycle] = useState<BillingCycle>("monthly");
  const [method, setMethod] = useState<"baridimob" | "gab_retrait">("baridimob");
  const [phone, setPhone] = useState("");
  const [gabCode, setGabCode] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  if (!open) return null;
  const amount = amountForCycle(cycle);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setErr("");
    setMsg("");
    if (!storeId) {
      setErr("المتجر غير جاهز");
      return;
    }
    setBusy(true);
    try {
      const user = await getSessionUser();
      if (!user) throw new Error("سجّل الدخول أولاً");
      let receipt_url: string | null = null;
      if (method === "baridimob") {
        if (!file) throw new Error("ارفع صورة وصل التحويل");
        receipt_url = await uploadReceipt(user.id, file);
      } else {
        if (!gabCode.trim()) throw new Error("أدخل رمز السحب بدون بطاقة");
        if (!phone.trim()) throw new Error("أدخل رقم الهاتف");
      }
      await submitUpgradeRequest({
        store_id: storeId,
        owner_id: user.id,
        billing_cycle: cycle,
        amount_dzd: amount,
        payment_method: method,
        receipt_url,
        gab_code: method === "gab_retrait" ? gabCode.trim() : null,
        phone: phone.trim() || null,
      });
      setMsg("تم إرسال طلب الترقية. بعد التحقق من الدفع نفعّل Pro خلال وقت قصير.");
      setFile(null);
      setGabCode("");
    } catch (ex: any) {
      setErr(ex?.message || String(ex));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="om-backdrop" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="om-sheet upgrade-sheet" dir="rtl" onClick={(e) => e.stopPropagation()}>
        <div className="om-head">
          <div>
            <span className="om-kicker"><Crown size={14} /> ترقية Pro</span>
            <h2>ابنِ علامتك بدون شعار المنصة</h2>
          </div>
          <button type="button" className="om-close" onClick={onClose} aria-label="إغلاق"><X size={20} /></button>
        </div>

        <div className="upgrade-plans">
          <div className="upgrade-plan free">
            <b>مجاني · 0 دج</b>
            <ul>{PRICING.free.features.map((f) => <li key={f}><Check size={14} /> {f}</li>)}</ul>
          </div>
          <div className="upgrade-plan pro">
            <b>Pro · {cycle === "yearly" ? "15,000 دج/سنة" : "1,500 دج/شهر"}</b>
            <ul>{PRICING.pro.features.map((f) => <li key={f}><Check size={14} /> {f}</li>)}</ul>
          </div>
        </div>

        <form onSubmit={submit} className="om-form">
          <div className="om-field">
            <span>دورة الفوترة</span>
            <div className="om-seg">
              <button type="button" className={cycle === "monthly" ? "on" : ""} onClick={() => setCycle("monthly")}>شهري · 1,500 دج</button>
              <button type="button" className={cycle === "yearly" ? "on" : ""} onClick={() => setCycle("yearly")}>سنوي · 15,000 دج <small>توفير شهرين</small></button>
            </div>
          </div>

          <div className="om-field">
            <span>طريقة الدفع</span>
            <div className="om-seg">
              <button type="button" className={method === "baridimob" ? "on" : ""} onClick={() => setMethod("baridimob")}>BaridiMob · وصل</button>
              <button type="button" className={method === "gab_retrait" ? "on" : ""} onClick={() => setMethod("gab_retrait")}>سحب بدون بطاقة</button>
            </div>
          </div>

          {method === "baridimob" ? (
            <>
              <div className="pay-box">
                <p>حوّل <strong>{amount.toLocaleString("ar-DZ")} دج</strong> عبر BaridiMob إلى:</p>
                <code className="rip">{BARIDIMOB_RIP}</code>
                <p className="hint">ثم ارفع صورة الوصل للتحقق.</p>
              </div>
              <label className="om-field">
                <span>صورة الوصل</span>
                <input type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] || null)} />
              </label>
            </>
          ) : (
            <>
              <div className="pay-box">
                <p>من تطبيق BaridiMob أنشئ <strong>رمز سحب بدون بطاقة</strong> بمبلغ {amount.toLocaleString("ar-DZ")} دج وأدخله هنا.</p>
              </div>
              <label className="om-field">
                <span>رمز السحب</span>
                <input value={gabCode} onChange={(e) => setGabCode(e.target.value)} placeholder="رمز GAB" required />
              </label>
              <label className="om-field">
                <span>رقم الهاتف</span>
                <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="05xxxxxxxx" required />
              </label>
            </>
          )}

          {err && <div className="om-error">{err}</div>}
          {msg && <div className="om-ok">{msg}</div>}

          <button type="submit" className="om-submit" disabled={busy}>
            {busy ? "جاري الإرسال…" : `إرسال طلب Pro · ${amount.toLocaleString("ar-DZ")} دج`}
          </button>
        </form>
      </div>
    </div>
  );
}
