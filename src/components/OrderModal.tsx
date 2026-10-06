import { useEffect, useMemo, useState, type FormEvent } from "react";
import { X } from "lucide-react";
import { WILAYAS, shippingFee } from "@/lib/algeriaShipping";
import { submitCartOrder } from "@/lib/storeData";
import { trackMerchantMetaEvent } from "@/lib/metaPixel";
import { getAttributionSessionId } from "@/lib/attribution";
import { WhatsAppIcon } from "@/components/WhatsAppIcon";
import { getLanguage } from "@/i18n";
import { TurnstileWidget, TURNSTILE_SITE_KEY } from "@/components/TurnstileWidget";
import { platformTranslations } from "@/i18n/platform";

export type OrderVariant = {
  id?: string;
  color?: string | null;
  pointure?: string | null;
  taille?: string | null;
  price: number;
  stock: number;
  is_active?: boolean;
};

export type OrderProduct = {
  id: string | number;
  name: string;
  price: number;
  image?: string;
  variants?: OrderVariant[];
};

export type CartLine = OrderProduct & {
  qty: number;
  variantId?: string;
  variantColor?: string | null;
  variantTaille?: string | null;
  variantPointure?: string | null;
};
export type DeliveryConfig = { mode: "national" | "local_flat"; price: number; freeOver: number | null };

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
  deliveryConfig?: DeliveryConfig;
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
  deliveryConfig,
  onSuccess,
}: Props) {
  const language = getLanguage();
  const t = platformTranslations[language].order;

  const lines: CartLine[] = useMemo(() => {
    if (cartLines && cartLines.length) return cartLines;
    if (product) return [{ ...product, qty: 1 }];
    return [];
  }, [cartLines, product]);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [wilaya, setWilaya] = useState(16);
  const [commune, setCommune] = useState("");
  const [address, setAddress] = useState("");
  const [delivery, setDelivery] = useState<"home" | "desk">("home");
  const [lineQty, setLineQty] = useState<Record<string, number>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState<{ id?: string; row?: { id?: string; subtotal?: number; shipping_price?: number; total_price?: number; items?: { name: string; quantity: number; unit_price: number; variant_color?: string | null; variant_taille?: string | null; variant_pointure?: string | null }[] } } | null>(null);
  const [selectedVariantId, setSelectedVariantId] = useState<string>("");
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [captchaResetKey, setCaptchaResetKey] = useState(0);

  const activeVariants = useMemo(() => (product?.variants || []).filter((v) => v.is_active !== false), [product?.variants]);
  useEffect(() => {
    if (product && activeVariants.length && !selectedVariantId) {
      const first = activeVariants.find((v) => Number(v.stock) > 0) || activeVariants[0];
      if (first?.id) setSelectedVariantId(String(first.id));
    }
    if (!product) setSelectedVariantId("");
  }, [product, activeVariants, selectedVariantId]);

  const selectedVariant = activeVariants.find((v) => String(v.id) === selectedVariantId) || null;
  const resolved = lines.map((l) => {
    const v = product && String(l.id) === String(product.id) && selectedVariant ? selectedVariant : null;
    return {
      ...l,
      price: v ? Number(v.price) : l.price,
      variantId: v?.id ? String(v.id) : l.variantId,
      variantColor: v?.color ?? l.variantColor,
      variantTaille: v?.taille ?? l.variantTaille,
      variantPointure: v?.pointure ?? l.variantPointure,
      qty: lineQty[String(l.id)] ?? l.qty ?? 1,
    };
  });

  const sub = resolved.reduce((s, l) => s + l.price * l.qty, 0);
  const totalQty = resolved.reduce((s, l) => s + l.qty, 0);
  const ship = useMemo(() => {
    if (deliveryConfig?.mode === "local_flat") {
      const freeOver = deliveryConfig.freeOver;
      if (freeOver != null && sub >= freeOver) return 0;
      return deliveryConfig.price;
    }
    return shippingFee(wilaya, delivery);
  }, [wilaya, delivery, deliveryConfig, sub]);
  const total = sub + ship;
  const wilayaName = language === "fr" ? (WILAYAS.find((w) => w.code === wilaya)?.nameFr || "") : (WILAYAS.find((w) => w.code === wilaya)?.nameAr || "");
  const primary = resolved[0];

  if (!open || !resolved.length) return null;

  const reset = () => {
    setName("");
    setPhone("");
    setCommune("");
    setAddress("");
    setLineQty({});
    setError("");
    setDone(null);
    setCaptchaToken(null);
    setCaptchaResetKey((v) => v + 1);
    setDelivery("home");
  };

  const close = () => {
    reset();
    onClose();
  };

  const buildWaText = (confirmed?: { id?: string; subtotal?: number; shipping_price?: number; total_price?: number; items?: { name: string; quantity: number; unit_price: number; variant_color?: string | null; variant_taille?: string | null; variant_pointure?: string | null }[] }) => {
    const finalSub = confirmed?.subtotal ?? sub;
    const finalShip = confirmed?.shipping_price ?? ship;
    const finalTotal = confirmed?.total_price ?? total;
    const items = (confirmed?.items?.length ? confirmed.items.map((l) => {
      const attrs = [l.variant_color, l.variant_taille, l.variant_pointure].filter(Boolean).join(" / ");
      return `  - ${l.name}${attrs ? ` [${attrs}]` : ""} × ${l.quantity} = ${(Number(l.unit_price) * l.quantity).toLocaleString("ar-DZ")} دج`;
    }) : resolved.map((l) => {
      const attrs = [l.variantColor, l.variantTaille, l.variantPointure].filter(Boolean).join(" / ");
      return `  - ${l.name}${attrs ? ` [${attrs}]` : ""} × ${l.qty} = ${(l.price * l.qty).toLocaleString("ar-DZ")} دج`;
    })).join("\n");
    if (language === "fr") {
      return (
        `Nouvelle commande de ${storeName}${confirmed?.id ? ` · #${confirmed.id.slice(0, 8)}` : ""}\n` +
        `Produits :\n${items}\n` +
        `• Sous-total : ${finalSub.toLocaleString("fr-DZ")} DZD\n` +
        `• Livraison (${deliveryConfig?.mode === "local_flat" ? "locale" : delivery === "home" ? "à domicile" : "bureau"}) : ${finalShip.toLocaleString("fr-DZ")} DZD\n` +
        `• Total : ${finalTotal.toLocaleString("fr-DZ")} DZD\n` +
        `• Nom : ${name}\n` +
        `• Téléphone : ${phone}\n` +
        `• Wilaya : ${wilayaName}\n` +
        `• Commune : ${commune || "—"}\n` +
        `• Adresse : ${address || "—"}`
      );
    }
    return (
      `طلب جديد من ${storeName}${confirmed?.id ? ` · #${confirmed.id.slice(0, 8)}` : ""}\n` +
      `المنتجات:\n${items}\n` +
      `• مجموع المنتجات: ${finalSub.toLocaleString("ar-DZ")} دج\n` +
      `• التوصيل (${deliveryConfig?.mode === "local_flat" ? "محلي" : delivery === "home" ? "للمنزل" : "مكتب"}): ${finalShip.toLocaleString("ar-DZ")} دج\n` +
      `• الإجمالي: ${finalTotal.toLocaleString("ar-DZ")} دج\n` +
      `• الاسم: ${name}\n` +
      `• الهاتف: ${phone}\n` +
      `• الولاية: ${wilayaName}\n` +
      `• البلدية: ${commune || "—"}\n` +
      `• العنوان: ${address || "—"}`
    );
  };

  const openWhatsApp = (confirmed?: { subtotal?: number; shipping_price?: number; total_price?: number; items?: { name: string; quantity: number; unit_price: number }[] }) => {
    const phoneDigits = String(whatsapp || "").replace(/\D/g, "");
    const url = `https://wa.me/${phoneDigits}?text=${encodeURIComponent(buildWaText(confirmed))}`;
    window.open(url, "_blank", "noopener");
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    if (!name.trim() || name.trim().length < 2) {
      setError(t.nameError);
      return;
    }
    if (!/^0[5-7]\d{8}$/.test(phone.replace(/\s/g, "")) && !/^213[5-7]\d{8}$/.test(phone.replace(/\D/g, ""))) {
      setError(t.phoneError);
      return;
    }
    if (!storeId) {
      setError(t.storeError);
      return;
    }
    if (activeVariants.length && (!selectedVariant || Number(selectedVariant.stock) < 1)) {
      setError(language === "fr" ? "Choisissez une variante disponible." : "اختر متغيرًا متاحًا من المنتج.");
      return;
    }
    if (TURNSTILE_SITE_KEY && !captchaToken) {
      setError(language === "fr" ? "Veuillez terminer la vérification de sécurité." : "أكمل التحقق الأمني قبل إرسال الطلب.");
      return;
    }
    setBusy(true);
    try {
      const isLocal = deliveryConfig?.mode === "local_flat";
      const row = await submitCartOrder({
        store_id: storeId,
        attributionSessionId: getAttributionSessionId(),
        customer_name: name.trim(),
        phone: phone.trim(),
        wilaya_code: isLocal ? null : wilaya,
        wilaya_name: isLocal ? t.localDelivery : wilayaName,
        commune: commune.trim() || null,
        address: address.trim() || null,
        delivery_type: isLocal ? "home" : delivery,
        shipping_price: ship,
        captchaToken,
        items: resolved.map((l) => ({
          product_id: String(l.id),
          product_name: l.name,
          quantity: l.qty,
          unit_price: Number(l.price) || 0,
          variant_id: l.variantId || null,
          variant_color: l.variantColor || null,
          variant_taille: l.variantTaille || null,
          variant_pointure: l.variantPointure || null,
        })),
      });
      setDone({ id: row?.id, row });
      setCaptchaToken(null);

      trackMerchantMetaEvent("Purchase", {
        value: row.total_price,
        currency: "DZD",
        content_type: "product",
        content_ids: resolved.map((l) => String(l.id)),
        num_items: resolved.reduce((sum, l) => sum + l.qty, 0),
      });

      onSuccess?.();
    } catch (ex: any) {
      setCaptchaToken(null);
      setCaptchaResetKey((v) => v + 1);
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
            <h2>{t.checkout}</h2>
            <p>{resolved.length > 1 ? `${resolved.length} ${t.productsInCart}` : primary?.name ?? t.order}</p>
          </div>
          <button type="button" className="om-x" onClick={close} aria-label={t.close}><X size={18} /></button>
        </header>

        {done ? (
          <div className="om-success">
            <p className="om-ok-title">{t.registered}</p>
            <p>{t.sentToMerchant}</p>
            <button type="button" className="om-wa-btn" onClick={() => openWhatsApp(done?.row)}>
              <WhatsAppIcon size={18} /> {t.openWhatsapp}
            </button>
            <button type="button" className="om-secondary" onClick={close}>{t.closeSuccess}</button>
          </div>
        ) : (
          <form onSubmit={submit} className="order-modal-form">
            {activeVariants.length > 0 && product && (
              <div className="om-variant-box">
                <div className="om-variant-title">{language === "fr" ? "Choisissez votre variante" : "اختر اللون والمقاس / Pointure"}</div>
                <select value={selectedVariantId} onChange={(e) => setSelectedVariantId(e.target.value)} className="om-variant-select">
                  <option value="">{language === "fr" ? "Sélectionner" : "اختر المتغير"}</option>
                  {activeVariants.map((v) => {
                    const attrs = [v.color, v.taille, v.pointure].filter(Boolean).join(" / ");
                    const sold = Number(v.stock) < 1;
                    return <option key={v.id} value={v.id} disabled={sold}>{attrs || (language === "fr" ? "Variante" : "متغير")} — {Number(v.price).toLocaleString(language === "fr" ? "fr-DZ" : "ar-DZ")} {language === "fr" ? "DZD" : "دج"}{sold ? (language === "fr" ? " · Épuisé" : " · نفد") : ""}</option>;
                  })}
                </select>
                {selectedVariant && <small className="om-variant-stock">{Number(selectedVariant.stock) > 0 ? (language === "fr" ? `Stock : ${selectedVariant.stock}` : `المخزون: ${selectedVariant.stock}`) : (language === "fr" ? "Épuisé" : "نفد المخزون")}</small>}
              </div>
            )}

            <div className="om-cart-lines">
              {resolved.map((l) => (
                <div key={String(l.id)} className="om-line">
                  <span className="om-line-name">{l.name}{(l.variantColor || l.variantTaille || l.variantPointure) ? <small className="om-line-variant">{[l.variantColor,l.variantTaille,l.variantPointure].filter(Boolean).join(" / ")}</small> : null}</span>
                  <div className="om-qty">
                    <button type="button" onClick={() => setLineQty((q) => ({ ...q, [String(l.id)]: Math.max(1, (q[String(l.id)] ?? l.qty) - 1) }))}>−</button>
                    <b>{l.qty}</b>
                    <button type="button" onClick={() => setLineQty((q) => ({ ...q, [String(l.id)]: (q[String(l.id)] ?? l.qty) + 1 }))}>+</button>
                  </div>
                  <span>{(l.price * l.qty).toLocaleString(language === "fr" ? "fr-DZ" : "ar-DZ")} دج</span>
                </div>
              ))}
            </div>

            <label>{t.fullName}
              <input value={name} onChange={(e) => setName(e.target.value)} required placeholder={t.namePlaceholder} />
            </label>
            <label>{t.phone}
              <input value={phone} onChange={(e) => setPhone(e.target.value)} required placeholder="05xxxxxxxx" inputMode="tel" dir="ltr" />
            </label>
            {deliveryConfig?.mode === "local_flat" ? (
              <label>{t.neighborhood}
                <input value={commune} onChange={(e) => setCommune(e.target.value)} required placeholder={t.cityExample} />
              </label>
            ) : (
              <div className="om-row">
                <label>{t.wilaya}
                  <select value={wilaya} onChange={(e) => setWilaya(Number(e.target.value))}>
                    {WILAYAS.map((w) => (
                      <option key={w.code} value={w.code}>{language === "fr" ? w.nameFr : w.nameAr}</option>
                    ))}
                  </select>
                </label>
                <label>{t.commune}
                  <input value={commune} onChange={(e) => setCommune(e.target.value)} placeholder={t.optional} />
                </label>
              </div>
            )}
            <label>{t.address}
              <input value={address} onChange={(e) => setAddress(e.target.value)} required placeholder={t.addressPlaceholder} autoComplete="street-address" />
            </label>
            {deliveryConfig?.mode !== "local_flat" && (
              <div className="om-delivery">
                <div className="om-label">{t.delivery}</div>
                <div className="om-seg">
                  <button type="button" className={delivery === "home" ? "on" : ""} onClick={() => setDelivery("home")}>{t.home}</button>
                  <button type="button" className={delivery === "desk" ? "on" : ""} onClick={() => setDelivery("desk")}>{t.desk}</button>
                </div>
              </div>
            )}
            <div className="om-summary">
              <div><span>{t.products}</span><span>{sub.toLocaleString(language === "fr" ? "fr-DZ" : "ar-DZ")} دج</span></div>
              <div><span>{t.shipping} ({deliveryConfig?.mode === "local_flat" ? t.localDelivery : wilayaName})</span><span>{ship.toLocaleString(language === "fr" ? "fr-DZ" : "ar-DZ")} دج</span></div>
              <div className="om-total"><span>{t.total}</span><strong>{total.toLocaleString(language === "fr" ? "fr-DZ" : "ar-DZ")} دج</strong></div>
            </div>
            {TURNSTILE_SITE_KEY && <TurnstileWidget onToken={setCaptchaToken} language={language} resetKey={captchaResetKey} />}
            {error && <p className="om-error">{error}</p>}
            <button type="submit" className="om-submit" disabled={busy}>
              {busy ? (language === "fr" ? "Envoi…" : "جاري الإرسال…") : t.submitWhatsapp}
            </button>
            <p className="om-hint">{language === "fr" ? "La commande est enregistrée dans le tableau de bord et WhatsApp s’ouvre pour envoyer les détails." : "يُحفظ الطلب في لوحة التاجر ويُفتح واتساب لإرسال التفاصيل."}</p>
          </form>
        )}
      </div>
      <style>{`
        .order-modal-overlay{position:fixed;inset:0;z-index:70;background:rgba(2,6,23,.75);display:grid;place-items:center;padding:16px;backdrop-filter:blur(6px)}
        .order-modal-sheet{width:min(440px,100%);max-height:92vh;overflow:auto;border-radius:20px;background:linear-gradient(165deg,#0b1a15,#091410);border:1px solid rgba(255,255,255,.1);color:#f8fafc}
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
        .om-line-name{opacity:.95;display:flex;flex-direction:column;gap:2px}.om-line-variant{font-size:.72rem;opacity:.6}
        .om-variant-box{padding:11px;border-radius:14px;background:rgba(12,127,63,.08);border:1px solid rgba(12,127,63,.25);display:flex;flex-direction:column;gap:7px}.om-variant-title{font-weight:800;font-size:.85rem}.om-variant-select{border-radius:10px;border:1px solid rgba(255,255,255,.12);background:rgba(0,0,0,.3);color:#fff;padding:10px;font:inherit}.om-variant-stock{opacity:.65}.om-qty{display:flex;align-items:center;gap:8px}
        .om-qty button{width:28px;height:28px;border-radius:8px;border:1px solid rgba(255,255,255,.15);background:rgba(255,255,255,.06);color:#fff;cursor:pointer}
        .om-delivery .om-label{font-size:.85rem;opacity:.85}
        .om-seg{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:6px}
        .om-seg button{border:1px solid rgba(255,255,255,.12);background:rgba(0,0,0,.25);color:#fff;border-radius:12px;padding:10px;font:inherit;cursor:pointer}
        .om-seg button.on{background:#0c7f3f;border-color:#0c7f3f;color:#052e16;font-weight:700}
        .om-summary{border-radius:14px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);padding:12px;display:flex;flex-direction:column;gap:8px;font-size:.9rem}
        .om-summary div{display:flex;justify-content:space-between}
        .om-total{padding-top:8px;border-top:1px solid rgba(255,255,255,.08);font-size:1.05rem}
        .om-submit{border:0;border-radius:14px;padding:13px;font:inherit;font-weight:800;background:#0c7f3f;color:#fff;cursor:pointer}
        .om-submit:disabled{opacity:.6}
        .om-error{color:#fecaca;font-size:.85rem;margin:0}
        .om-hint{font-size:.75rem;opacity:.55;margin:0;text-align:center}
        .om-success{padding:20px 18px 24px;text-align:center}
        .om-ok-title{font-size:1.2rem;font-weight:900;margin:0 0 8px}
        .om-wa-btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;width:100%;margin-top:14px;border:0;border-radius:14px;padding:12px;font:inherit;font-weight:700;background:#0c7f3f;color:#052e16;cursor:pointer}
        .om-secondary{width:100%;margin-top:10px;border:1px solid rgba(255,255,255,.15);background:transparent;color:#fff;border-radius:14px;padding:11px;font:inherit;cursor:pointer}
        @media(max-width:480px){.om-row{grid-template-columns:1fr}}
      `}</style>
    </div>
  );
}
