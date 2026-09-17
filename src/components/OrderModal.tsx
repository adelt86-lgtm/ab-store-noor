import { useMemo, useState, type FormEvent } from "react";
import { X } from "lucide-react";
import { WILAYAS, shippingFee } from "@/lib/algeriaShipping";
import { submitStoreOrder } from "@/lib/storeData";
import { WhatsAppIcon } from "@/components/WhatsAppIcon";

export type OrderProduct = {
  id: string | number;
  name: string;
  price: number;
  image?: string;
};

type Props = {
  open: boolean;
  onClose: () => void;
  product: OrderProduct | null;
  storeId: string | null;
  storeName: string;
  whatsapp: string;
};

export function OrderModal({ open, onClose, product, storeId, storeName, whatsapp }: Props) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [wilaya, setWilaya] = useState(16);
  const [commune, setCommune] = useState("");
  const [delivery, setDelivery] = useState<"home" | "desk">("home");
  const [qty, setQty] = useState(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState<{ id?: string } | null>(null);

  const ship = useMemo(() => shippingFee(wilaya, delivery), [wilaya, delivery]);
  const unit = product?.price || 0;
  const sub = unit * qty;
  const total = sub + ship;
  const wilayaName = WILAYAS.find((w) => w.code === wilaya)?.nameAr || "";

  if (!open || !product) return null;

  const reset = () => {
    setName("");
    setPhone("");
    setCommune("");
    setQty(1);
    setError("");
    setDone(null);
    setDelivery("home");
  };

  const close = () => {
    reset();
    onClose();
  };

  const buildWaText = () => {
    return (
      `طلب جديد من ${storeName}\n` +
      `• المنتج: ${product.name}\n` +
      `• الكمية: ${qty}\n` +
      `• السعر: ${sub.toLocaleString("ar-DZ")} دج\n` +
      `• التوصيل (${delivery === "home" ? "للمنزل" : "مكتب"}): ${ship.toLocaleString("ar-DZ")} دج\n` +
      `• الإجمالي: ${total.toLocaleString("ar-DZ")} دج\n` +
      `• الاسم: ${name}\n` +
      `• الهاتف: ${phone}\n` +
      `• الولاية: ${wilayaName}\n` +
      `• البلدية: ${commune || "—"}`
    );
  };

  const openWhatsApp = () => {
    const phoneDigits = String(whatsapp || "").replace(/\D/g, "");
    const url = `https://wa.me/${phoneDigits}?text=${encodeURIComponent(buildWaText())}`;
    window.open(url, "_blank", "noopener");
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    if (!name.trim() || name.trim().length < 2) {
      setError("أدخل الاسم الكامل");
      return;
    }
    if (!/^0[5-7]\d{8}$/.test(phone.replace(/\s/g, ""))) {
      setError("رقم هاتف جزائري غير صالح (05/06/07)");
      return;
    }
    if (!storeId) {
      setError("المتجر غير جاهز لاستقبال الطلبات بعد");
      return;
    }
    setBusy(true);
    try {
      const row = await submitStoreOrder({
        store_id: storeId,
        customer_name: name.trim(),
        phone: phone.replace(/\s/g, ""),
        wilaya_code: wilaya,
        wilaya_name: wilayaName,
        commune: commune.trim() || null,
        delivery_type: delivery,
        product_name: product.name,
        product_id: String(product.id),
        quantity: qty,
        unit_price: unit,
        shipping_price: ship,
        total_price: total,
        status: "new",
      });
      setDone({ id: row?.id });
      // open WA after successful save
      openWhatsApp();
    } catch (err: any) {
      setError(err?.message || String(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="order-modal-backdrop" role="dialog" aria-modal="true">
      <div className="order-modal">
        <header className="order-modal-head">
          <div>
            <p className="om-kicker">طلب سريع</p>
            <h2>إتمام الطلب</h2>
          </div>
          <button type="button" className="om-close" onClick={close} aria-label="إغلاق">
            <X size={18} />
          </button>
        </header>

        <div className="order-modal-product">
          {product.image ? <img src={product.image} alt="" /> : <div className="om-ph">📦</div>}
          <div>
            <strong>{product.name}</strong>
            <p>{unit.toLocaleString("ar-DZ")} دج</p>
          </div>
        </div>

        {done ? (
          <div className="om-success">
            <p className="om-ok-title">تم استلام طلبك</p>
            <p>سنتواصل معك لتأكيد التوصيل. يمكنك أيضاً متابعة المحادثة على واتساب.</p>
            <button type="button" className="om-wa-btn" onClick={openWhatsApp}>
              <WhatsAppIcon size={20} /> متابعة على واتساب
            </button>
            <button type="button" className="om-secondary" onClick={close}>
              إغلاق
            </button>
          </div>
        ) : (
          <form onSubmit={submit} className="order-modal-form">
            <label>
              <span>الاسم الكامل</span>
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="مثال: أحمد بن علي" required />
            </label>
            <label>
              <span>رقم الهاتف</span>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="05XX XXX XXX"
                inputMode="tel"
                required
              />
            </label>
            <div className="om-row">
              <label>
                <span>الولاية</span>
                <select value={wilaya} onChange={(e) => setWilaya(Number(e.target.value))}>
                  {WILAYAS.map((w) => (
                    <option key={w.code} value={w.code}>
                      {w.code} — {w.nameAr}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span>البلدية</span>
                <input value={commune} onChange={(e) => setCommune(e.target.value)} placeholder="اختياري" />
              </label>
            </div>

            <div className="om-delivery">
              <span className="om-label">نوع التوصيل</span>
              <div className="om-seg">
                <button type="button" className={delivery === "home" ? "on" : ""} onClick={() => setDelivery("home")}>
                  للمنزل
                </button>
                <button type="button" className={delivery === "desk" ? "on" : ""} onClick={() => setDelivery("desk")}>
                  Stop Desk / مكتب
                </button>
              </div>
            </div>

            <label>
              <span>الكمية</span>
              <div className="om-qty">
                <button type="button" onClick={() => setQty((q) => Math.max(1, q - 1))}>
                  −
                </button>
                <b>{qty}</b>
                <button type="button" onClick={() => setQty((q) => Math.min(20, q + 1))}>
                  +
                </button>
              </div>
            </label>

            <div className="om-summary">
              <div>
                <span>المنتجات</span>
                <b>{sub.toLocaleString("ar-DZ")} دج</b>
              </div>
              <div>
                <span>الشحن ({wilayaName})</span>
                <b>{ship.toLocaleString("ar-DZ")} دج</b>
              </div>
              <div className="om-total">
                <span>الإجمالي</span>
                <b>{total.toLocaleString("ar-DZ")} دج</b>
              </div>
            </div>

            {error && <p className="om-error">{error}</p>}

            <button type="submit" className="om-submit" disabled={busy}>
              {busy ? "جاري الإرسال…" : "تأكيد الطلب"}
            </button>
            <p className="om-hint">يُحفظ الطلب أولاً ثم يُفتح واتساب للمتابعة إن رغبت.</p>
          </form>
        )}
      </div>

      <style>{`
        .order-modal-backdrop{position:fixed;inset:0;z-index:100;background:rgba(0,0,0,.65);display:grid;place-items:center;padding:16px;backdrop-filter:blur(4px)}
        .order-modal{width:min(440px,100%);max-height:92vh;overflow:auto;border-radius:20px;background:#0f172a;color:#f8fafc;border:1px solid rgba(255,255,255,.1);box-shadow:0 25px 80px rgba(0,0,0,.5)}
        .order-modal-head{display:flex;justify-content:space-between;align-items:flex-start;padding:18px 18px 8px}
        .om-kicker{font-size:11px;opacity:.55;letter-spacing:.08em;margin:0}
        .order-modal-head h2{margin:4px 0 0;font-size:1.2rem}
        .om-close{border:0;background:rgba(255,255,255,.08);color:#fff;border-radius:10px;width:36px;height:36px;display:grid;place-items:center;cursor:pointer}
        .order-modal-product{display:flex;gap:12px;align-items:center;padding:8px 18px 14px;border-bottom:1px solid rgba(255,255,255,.08)}
        .order-modal-product img,.om-ph{width:56px;height:56px;border-radius:12px;object-fit:cover;background:#1e293b;display:grid;place-items:center}
        .order-modal-form{padding:14px 18px 20px;display:flex;flex-direction:column;gap:12px}
        .order-modal-form label{display:flex;flex-direction:column;gap:6px;font-size:.85rem}
        .order-modal-form input,.order-modal-form select{border-radius:12px;border:1px solid rgba(255,255,255,.12);background:rgba(0,0,0,.35);color:#fff;padding:11px 12px;font:inherit}
        .om-row{display:grid;grid-template-columns:1fr 1fr;gap:10px}
        .om-delivery .om-label{font-size:.85rem;opacity:.85}
        .om-seg{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:6px}
        .om-seg button{border:1px solid rgba(255,255,255,.12);background:rgba(0,0,0,.25);color:#fff;border-radius:12px;padding:10px;font:inherit;cursor:pointer}
        .om-seg button.on{background:#25D366;border-color:#25D366;color:#052e16;font-weight:700}
        .om-qty{display:flex;align-items:center;gap:14px}
        .om-qty button{width:36px;height:36px;border-radius:10px;border:1px solid rgba(255,255,255,.15);background:rgba(255,255,255,.06);color:#fff;font-size:1.1rem;cursor:pointer}
        .om-summary{border-radius:14px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);padding:12px;display:flex;flex-direction:column;gap:8px;font-size:.9rem}
        .om-summary div{display:flex;justify-content:space-between}
        .om-total{padding-top:8px;border-top:1px solid rgba(255,255,255,.08);font-size:1.05rem}
        .om-submit{border:0;border-radius:14px;padding:13px;font:inherit;font-weight:800;background:linear-gradient(135deg,#25D366,#128C7E);color:#fff;cursor:pointer}
        .om-submit:disabled{opacity:.6}
        .om-error{color:#fecaca;font-size:.85rem;margin:0}
        .om-hint{font-size:.75rem;opacity:.55;margin:0;text-align:center}
        .om-success{padding:20px 18px 24px;text-align:center}
        .om-ok-title{font-size:1.2rem;font-weight:900;margin:0 0 8px}
        .om-wa-btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;width:100%;margin-top:14px;border:0;border-radius:14px;padding:12px;font:inherit;font-weight:700;background:#25D366;color:#052e16;cursor:pointer}
        .om-secondary{width:100%;margin-top:10px;border:1px solid rgba(255,255,255,.15);background:transparent;color:#fff;border-radius:14px;padding:11px;font:inherit;cursor:pointer}
        @media(max-width:480px){.om-row{grid-template-columns:1fr}}
      `}</style>
    </div>
  );
}
