import { useMemo, useState, type FormEvent } from "react";
import { X } from "lucide-react";
import { WILAYAS, shippingFee } from "@/lib/algeriaShipping";
import { submitCartOrder } from "@/lib/storeData";
import { WhatsAppIcon } from "@/components/WhatsAppIcon";

export type OrderProduct = {
  id: string | number;
  name: string;
  price: number;
  image?: string;
};

export type CartLine = OrderProduct & { qty: number };

type Props = {
  open: boolean;
  onClose: () => void;
  /** منتج واحد (وضع قديم) */
  product?: OrderProduct | null;
  /** سلة كاملة — إن وُجدت تُفضَّل على product */
  cartLines?: CartLine[] | null;
  storeId: string | null;
  storeName: string;
  whatsapp: string;
  onSuccess?: () => void;
};

export function OrderModal({
  open,
  onClose,
  product,
  cartLines,
  storeId,
  storeName,
  whatsapp,
  onSuccess,
}: Props) {
  const lines: CartLine[] = useMemo(() => {
    if (cartLines && cartLines.length) return cartLines;
    if (product) return [{ ...product, qty: 1 }];
    return [];
  }, [cartLines, product]);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [wilaya, setWilaya] = useState(16);
  const [commune, setCommune] = useState("");
  const [delivery, setDelivery] = useState<"home" | "desk">("home");
  const [lineQty, setLineQty] = useState<Record<string, number>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState<{ id?: string } | null>(null);

  const resolved = lines.map((l) => ({
    ...l,
    qty: lineQty[String(l.id)] ?? l.qty ?? 1,
  }));

  const ship = useMemo(() => shippingFee(wilaya, delivery), [wilaya, delivery]);
  const sub = resolved.reduce((s, l) => s + l.price * l.qty, 0);
  const totalQty = resolved.reduce((s, l) => s + l.qty, 0);
  const total = sub + ship;
  const wilayaName = WILAYAS.find((w) => w.code === wilaya)?.nameAr || "";
  const primary = resolved[0];

  if (!open || !resolved.length) return null;

  const reset = () => {
    setName("");
    setPhone("");
    setCommune("");
    setLineQty({});
    setError("");
    setDone(null);
    setDelivery("home");
  };

  const close = () => {
    reset();
    onClose();
  };

  const buildWaText = () => {
    const items = resolved.map((l) => `  - ${l.name} × ${l.qty} = ${(l.price * l.qty).toLocaleString("ar-DZ")} دج`).join("\n");
    return (
      `طلب جديد من ${storeName}\n` +
      `المنتجات:\n${items}\n` +
      `• مجموع المنتجات: ${sub.toLocaleString("ar-DZ")} دج\n` +
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
    if (!/^0[5-7]\d{8}$/.test(phone.replace(/\s/g, "")) && !/^213[5-7]\d{8}$/.test(phone.replace(/\D/g, ""))) {
      setError("أدخل رقم هاتف جزائري صحيح");
      return;
    }
    if (!storeId) {
      setError("المتجر غير جاهز");
      return;
    }
    setBusy(true);
    try {
      const row = await submitCartOrder({
        store_id: storeId,
        customer_name: name.trim(),
        phone: phone.trim(),
        wilaya_code: wilaya,
        wilaya_name: wilayaName,
        commune: commune.trim() || null,
        delivery_type: delivery,
        shipping_price: ship,
        items: resolved.map((l) => ({
          product_id: String(l.id),
          product_name: l.name,
          quantity: l.qty,
        })),
      });
      setDone({ id: row?.id });
      openWhatsApp();
      onSuccess?.();
    } catch (ex: any) {
      setError(ex?.message || String(ex));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="order-modal-overlay" role="dialog" aria-modal="true">
      <div className="order-modal-sheet">
        <header className="order-modal-head">
          <div>
            <h2>إتمام الطلب</h2>
            <p>{resolved.length > 1 ? `${resolved.length} منتجات في السلة` : primary.name}</p>
          </div>
          <button type="button" className="om-x" onClick={close} aria-label="إغلاق"><X size={18} /></button>
        </header>

        {done ? (
          <div className="om-success">
            <p className="om-ok-title">تم تسجيل طلبك</p>
            <p>وصل للتاجر على واتساب وفي لوحة المتجر.</p>
            <button type="button" className="om-wa-btn" onClick={openWhatsApp}>
              <WhatsAppIcon size={18} /> فتح واتساب مرة أخرى
            </button>
            <button type="button" className="om-secondary" onClick={close}>إغلاق</button>
          </div>
        ) : (
          <form onSubmit={submit} className="order-modal-form">
            <div className="om-cart-lines">
              {resolved.map((l) => (
                <div key={String(l.id)} className="om-line">
                  <span className="om-line-name">{l.name}</span>
                  <div className="om-qty">
                    <button type="button" onClick={() => setLineQty((q) => ({ ...q, [String(l.id)]: Math.max(1, (q[String(l.id)] ?? l.qty) - 1) }))}>−</button>
                    <b>{l.qty}</b>
                    <button type="button" onClick={() => setLineQty((q) => ({ ...q, [String(l.id)]: (q[String(l.id)] ?? l.qty) + 1 }))}>+</button>
                  </div>
                  <span>{(l.price * l.qty).toLocaleString("ar-DZ")} دج</span>
                </div>
              ))}
            </div>

            <label>الاسم الكامل
              <input value={name} onChange={(e) => setName(e.target.value)} required placeholder="الاسم واللقب" />
            </label>
            <label>رقم الهاتف
              <input value={phone} onChange={(e) => setPhone(e.target.value)} required placeholder="05xxxxxxxx" inputMode="tel" dir="ltr" />
            </label>
            <div className="om-row">
              <label>الولاية
                <select value={wilaya} onChange={(e) => setWilaya(Number(e.target.value))}>
                  {WILAYAS.map((w) => (
                    <option key={w.code} value={w.code}>{w.nameAr}</option>
                  ))}
                </select>
              </label>
              <label>البلدية
                <input value={commune} onChange={(e) => setCommune(e.target.value)} placeholder="اختياري" />
              </label>
            </div>
            <div className="om-delivery">
              <div className="om-label">التوصيل</div>
              <div className="om-seg">
                <button type="button" className={delivery === "home" ? "on" : ""} onClick={() => setDelivery("home")}>للمنزل</button>
                <button type="button" className={delivery === "desk" ? "on" : ""} onClick={() => setDelivery("desk")}>مكتب / استلام</button>
              </div>
            </div>
            <div className="om-summary">
              <div><span>المنتجات</span><span>{sub.toLocaleString("ar-DZ")} دج</span></div>
              <div><span>الشحن ({wilayaName})</span><span>{ship.toLocaleString("ar-DZ")} دج</span></div>
              <div className="om-total"><span>الإجمالي</span><strong>{total.toLocaleString("ar-DZ")} دج</strong></div>
            </div>
            {error && <p className="om-error">{error}</p>}
            <button type="submit" className="om-submit" disabled={busy}>
              {busy ? "جاري الإرسال…" : "تأكيد الطلب · واتساب + اللوحة"}
            </button>
            <p className="om-hint">يُحفظ الطلب في لوحة التاجر ويُفتح واتساب لإرسال التفاصيل.</p>
          </form>
        )}
      </div>
      <style>{`
        .order-modal-overlay{position:fixed;inset:0;z-index:70;background:rgba(2,6,23,.75);display:grid;place-items:center;padding:16px;backdrop-filter:blur(6px)}
        .order-modal-sheet{width:min(440px,100%);max-height:92vh;overflow:auto;border-radius:20px;background:linear-gradient(165deg,#0f172a,#0b1220);border:1px solid rgba(255,255,255,.1);color:#f8fafc}
        .order-modal-head{display:flex;justify-content:space-between;align-items:flex-start;padding:16px 18px;border-bottom:1px solid rgba(255,255,255,.08)}
        .order-modal-head h2{margin:0;font-size:1.15rem}
        .order-modal-head p{margin:4px 0 0;opacity:.7;font-size:.85rem}
        .om-x{border:0;background:rgba(255,255,255,.06);color:#fff;border-radius:10px;width:36px;height:36px;cursor:pointer}
        .order-modal-form{padding:14px 18px 20px;display:flex;flex-direction:column;gap:12px}
        .order-modal-form label{display:flex;flex-direction:column;gap:6px;font-size:.85rem}
        .order-modal-form input,.order-modal-form select{border-radius:12px;border:1px solid rgba(255,255,255,.12);background:rgba(0,0,0,.35);color:#fff;padding:11px 12px;font:inherit}
        .om-row{display:grid;grid-template-columns:1fr 1fr;gap:10px}
        .om-cart-lines{display:flex;flex-direction:column;gap:8px;padding:10px;border-radius:14px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08)}
        .om-line{display:grid;grid-template-columns:1fr auto auto;gap:8px;align-items:center;font-size:.88rem}
        .om-line-name{opacity:.95}
        .om-qty{display:flex;align-items:center;gap:8px}
        .om-qty button{width:28px;height:28px;border-radius:8px;border:1px solid rgba(255,255,255,.15);background:rgba(255,255,255,.06);color:#fff;cursor:pointer}
        .om-delivery .om-label{font-size:.85rem;opacity:.85}
        .om-seg{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:6px}
        .om-seg button{border:1px solid rgba(255,255,255,.12);background:rgba(0,0,0,.25);color:#fff;border-radius:12px;padding:10px;font:inherit;cursor:pointer}
        .om-seg button.on{background:#25D366;border-color:#25D366;color:#052e16;font-weight:700}
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
