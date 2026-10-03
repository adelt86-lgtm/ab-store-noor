import { supabase } from "@/lib/supabase";
import { useEffect, useMemo, useState } from "react";
import {
  MessageCircle,
  Trash2,
  RefreshCw,
  ShoppingBag,
  Download,
  Copy,
  Printer,
  X,
  Truck,
} from "lucide-react";
import {
  loadOrders,
  updateOrderStatus,
  deleteOrder,
  ORDER_STATUS_LABEL,
  type OrderRow,
  type OrderStatus,
} from "@/lib/storeData";
import { shipOrderViaEngine } from "@/lib/shippingBridge";
import {
  loadShipmentTracking,
  type TrackingSnapshot,
} from "@/lib/shippingTracking";

type DayFilter = "today" | "yesterday" | "7d" | "all";

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function filterByDay(orders: OrderRow[], f: DayFilter) {
  if (f === "all") return orders;
  const now = new Date();
  const today0 = startOfDay(now);
  const y0 = new Date(today0);
  y0.setDate(y0.getDate() - 1);
  const week0 = new Date(today0);
  week0.setDate(week0.getDate() - 6);
  return orders.filter((o) => {
    const t = new Date(o.created_at).getTime();
    if (f === "today") return t >= today0.getTime();
    if (f === "yesterday") return t >= y0.getTime() && t < today0.getTime();
    if (f === "7d") return t >= week0.getTime();
    return true;
  });
}

const STATUS_CLASS: Record<OrderStatus, string> = {
  new: "st-new",
  confirmed: "st-confirmed",
  shipped: "st-shipped",
  done: "st-done",
  cancelled: "st-cancelled",
};

function orderItemsSummary(o: OrderRow): string {
  if (o.items && o.items.length) {
    return o.items.map((i) => `${i.product_name} × ${i.quantity}`).join(" · ");
  }
  return `${o.product_name || "—"} × ${o.quantity || 1}`;
}

function deliveryLabel(o: OrderRow, isFr = false): string {
  if (o.delivery_type === "desk" || o.delivery_type === "stopdesk") {
    return isFr ? "Point relais" : "مكتب";
  }
  return isFr ? "Domicile" : "منزل";
}

function formatMoney(n: number) {
  return Math.round(Number(n) || 0)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, "\u202F");
}

function trackingStatusLabel(status: string, isFr = false): string {
  const labelsAr: Record<string, string> = {
    created: "تم إنشاء الشحنة",
    ready_for_dispatch: "جاهزة للإرسال",
    in_transit: "قيد التوصيل",
    delivered: "تم التسليم",
    returned: "مرتجعة",
    cancelled: "ملغاة",
    error: "حدث خطأ",
    unknown: "غير معروف",
  };

  const labelsFr: Record<string, string> = {
    created: "Expédition créée",
    ready_for_dispatch: "Prête à l'expédition",
    in_transit: "En cours de livraison",
    delivered: "Livrée",
    returned: "Retournée",
    cancelled: "Annulée",
    error: "Une erreur est survenue",
    unknown: "Inconnu",
  };

  const labels = isFr ? labelsFr : labelsAr;
  return labels[status] || status || (isFr ? "Inconnu" : "غير معروف");
}

function orderStatusLabel(status: string, isFr = false): string {
  if (!isFr) {
    return ORDER_STATUS_LABEL[status] || status;
  }

  const labelsFr: Record<string, string> = {
    new: "Nouvelle",
    confirmed: "Confirmée",
    shipped: "Expédiée",
    done: "Terminée",
    cancelled: "Annulée",
  };

  return labelsFr[status] || status;
}

function buildOrderPlainText(o: OrderRow, isFr = false): string {
  const currency = isFr ? "DZD" : "دج";

  const items =
    o.items && o.items.length
      ? o.items
          .map(
            (i) =>
              `• ${i.product_name} × ${i.quantity} = ${formatMoney(
                Number(i.unit_price) * Number(i.quantity),
              )} ${currency}`,
          )
          .join("\n")
      : `• ${orderItemsSummary(o)}`;

  return [
    isFr
      ? "════════ Commande Dzair Store ════════"
      : "════════ طلب Dzair Store ════════",
    `${isFr ? "Date" : "التاريخ"}: ${new Date(o.created_at).toLocaleString(
      isFr ? "fr-DZ" : "ar-DZ",
    )}`,
    `${isFr ? "Statut" : "الحالة"}: ${orderStatusLabel(o.status, isFr)}`,
    "────────────────────────────",
    `${isFr ? "Client" : "الشاري"}: ${o.customer_name}`,
    `${isFr ? "Téléphone" : "الهاتف"}: ${o.phone}`,
    `${isFr ? "Wilaya" : "الولاية"}: ${o.wilaya_name || "—"}`,
    `${isFr ? "Commune" : "البلدية"}: ${o.commune || "—"}`,
    `${isFr ? "Adresse" : "العنوان"}: ${o.address || "—"}`,
    `${isFr ? "Livraison" : "التوصيل"}: ${deliveryLabel(o, isFr)}`,
    "────────────────────────────",
    isFr ? "Produits :" : "المنتجات:",
    items,
    "────────────────────────────",
    `${isFr ? "Livraison" : "الشحن"}: ${formatMoney(o.shipping_price)} ${currency}`,
    `${isFr ? "Total" : "الإجمالي"}: ${formatMoney(o.total_price)} ${currency}`,
    o.tracking_number
      ? `${isFr ? "Suivi" : "التتبع"}: ${o.tracking_number}`
      : "",
    "════════════════════════════",
  ]
    .filter(Boolean)
    .join("\n");
}

function escapeHtml(v: unknown): string {
  return String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Neutralise spreadsheet formula injection (=, +, -, @, tab, CR at cell start).
function csvSafe(v: unknown): string {
  const t = String(v ?? "");
  return /^[=+\-@\t\r]/.test(t) ? "'" + t : t;
}

function exportOrdersCsv(orders: OrderRow[]) {
  const headers = [
    "order_id",
    "customer_name",
    "phone",
    "wilaya",
    "commune",
    "address",
    "delivery_type",
    "products",
    "quantity_total",
    "shipping_price",
    "total_price",
    "status",
    "created_at",
  ];
  const rows = orders.map((o) => {
    const products =
      o.items && o.items.length
        ? o.items.map((i) => `${i.product_name} x${i.quantity}`).join(" | ")
        : o.product_name || "";
    const qty =
      o.items && o.items.length
        ? o.items.reduce((s, i) => s + (Number(i.quantity) || 0), 0)
        : o.quantity;
    return [
      o.id,
      o.customer_name,
      o.phone,
      o.wilaya_name || "",
      o.commune || "",
      o.address || "",
      o.delivery_type === "desk" || o.delivery_type === "stopdesk" ? "stopdesk" : "home",
      products,
      String(qty),
      String(o.shipping_price ?? ""),
      String(o.total_price ?? ""),
      o.status,
      o.created_at,
    ]
      .map((c) => `"${csvSafe(c).replace(/"/g, '""')}"`)
      .join(",");
  });
  const bom = "\uFEFF";
  const csv = bom + [headers.join(","), ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `dzair-store-orders-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function printOrder(o: OrderRow) {
  const itemsHtml =
    o.items && o.items.length
      ? `<table style="width:100%;border-collapse:collapse;margin:12px 0;font-size:14px">
        <thead><tr>
          <th style="text-align:right;border-bottom:1px solid #ccc;padding:6px">المنتج</th>
          <th style="text-align:right;border-bottom:1px solid #ccc;padding:6px">كمية</th>
          <th style="text-align:right;border-bottom:1px solid #ccc;padding:6px">سعر</th>
          <th style="text-align:right;border-bottom:1px solid #ccc;padding:6px">مجموع</th>
        </tr></thead>
        <tbody>
        ${o.items
          .map(
            (i) => `<tr>
            <td style="padding:6px;border-bottom:1px solid #eee">${escapeHtml(i.product_name)}</td>
            <td style="padding:6px;border-bottom:1px solid #eee">${escapeHtml(i.quantity)}</td>
            <td style="padding:6px;border-bottom:1px solid #eee">${formatMoney(i.unit_price)}</td>
            <td style="padding:6px;border-bottom:1px solid #eee">${formatMoney(Number(i.unit_price) * Number(i.quantity))}</td>
          </tr>`,
          )
          .join("")}
        </tbody></table>`
      : `<p style="margin:12px 0">${escapeHtml(orderItemsSummary(o))}</p>`;

  const html = `<!DOCTYPE html><html lang="ar" dir="rtl"><head>
<meta charset="utf-8"/><title>طلب — ${escapeHtml(o.customer_name)}</title>
<style>
  body{font-family:Tahoma,Arial,sans-serif;color:#0f172a;padding:24px;max-width:640px;margin:0 auto}
  h1{font-size:18px;margin:0 0 8px}
  .muted{color:#475569;font-size:13px}
  .box{border:1px solid #cbd5e1;border-radius:12px;padding:16px;margin-top:12px}
  .row{margin:6px 0}
  .total{font-size:18px;font-weight:700;margin-top:12px}
  @media print{body{padding:0} .no-print{display:none}}
</style></head><body>
  <h1>ملخص الطلب — Dzair Store</h1>
  <p class="muted">${new Date(o.created_at).toLocaleString("ar-DZ")} · ${escapeHtml(ORDER_STATUS_LABEL[o.status] || o.status)}</p>
  <div class="box">
    <div class="row"><strong>الشاري:</strong> ${escapeHtml(o.customer_name)}</div>
    <div class="row"><strong>{isFr ? "Téléphone :" : "الهاتف:"}</strong> <span dir="ltr">${escapeHtml(o.phone)}</span></div>
    <div class="row"><strong>{isFr ? "Wilaya :" : "الولاية:"}</strong> ${escapeHtml(o.wilaya_name || "—")}</div>
    <div class="row"><strong>{isFr ? "Commune :" : "البلدية:"}</strong> ${escapeHtml(o.commune || "—")}</div>
    <div class="row"><strong>{isFr ? "Adresse :" : "العنوان:"}</strong> ${escapeHtml(o.address || "—")}</div>
    <div class="row"><strong>التوصيل:</strong> ${escapeHtml(deliveryLabel(o))}</div>
  </div>
  <div class="box">
    <strong>المنتجات</strong>
    ${itemsHtml}
    <div class="row">الشحن: ${formatMoney(o.shipping_price)} دج</div>
    <div class="total">الإجمالي (COD): ${formatMoney(o.total_price)} دج</div>
    ${o.tracking_number ? `<div class="row">${isFr ? "Suivi" : "التتبع"}: ${escapeHtml(o.tracking_number)}</div>` : ""}
  </div>
  <p class="no-print muted" style="margin-top:20px">
    <button onclick="window.print()" style="padding:10px 18px;font-size:15px;cursor:pointer">طباعة</button>
  </p>
  <script>window.onload=function(){setTimeout(function(){window.print()},200)}</script>
</body></html>`;

  const w = window.open("", "_blank");
  if (!w) {
    alert(isFr ? "Autorisez les fenêtres pop-up pour imprimer." : "اسمح بالنوافذ المنبثقة للطباعة");
    return;
  }
  w.document.write(html);
  w.document.close();
}

export function OrdersPanel({
  storeId,
  whatsapp,
  language = "ar",
}: {
  storeId: string;
  whatsapp: string;
  language?: "ar" | "fr";
}) {
  const isFr = language === "fr";
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [day, setDay] = useState<DayFilter>("today");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [preview, setPreview] = useState<OrderRow | null>(null);

  const reload = async () => {
    setLoading(true);
    setErr("");
    try {
      setOrders(await loadOrders(storeId));
    } catch (e: any) {
      setErr(e?.message || String(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    reload();
    const t = setInterval(reload, 20000);
    return () => clearInterval(t);
  }, [storeId]);

  const visible = useMemo(() => filterByDay(orders, day), [orders, day]);
  const totalDzd = useMemo(
    () => visible.reduce((s, o) => s + (Number(o.total_price) || 0), 0),
    [visible],
  );
  const newCount = useMemo(
    () => visible.filter((o) => o.status === "new").length,
    [visible],
  );

  const setStatus = async (id: string, status: OrderStatus) => {
    setBusyId(id);
    try {
      await updateOrderStatus(id, status);
      setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, status } : o)));
    } catch (e: any) {
      setErr(e?.message || String(e));
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (id: string) => {
    if (!confirm(isFr ? "Supprimer définitivement cette commande ?" : "حذف هذا الطلب نهائياً؟")) return;
    setBusyId(id);
    try {
      await deleteOrder(id);
      setOrders((prev) => prev.filter((o) => o.id !== id));
    } catch (e: any) {
      setErr(e?.message || String(e));
    } finally {
      setBusyId(null);
    }
  };

  const [shipConfirm, setShipConfirm] = useState<OrderRow | null>(null);
  const [shipCarrier, setShipCarrier] = useState<"yalidine" | "zr_express" | "maystro" | "noest" | "dhd">("yalidine");
  const [shipOk, setShipOk] = useState<string | null>(null);

  const [trackingByOrder, setTrackingByOrder] = useState<Record<string, TrackingSnapshot | null>>({});
  const [trackingLoadingId, setTrackingLoadingId] = useState<string | null>(null);

  const ship = async (o: OrderRow) => {
    if (o.tracking_number) {
      setErr(isFr ? "Cette commande est déjà expédiée · Suivi : " : "هذا الطلب مشحون مسبقاً · التتبع: " + o.tracking_number);
      return;
    }
    setShipCarrier((o.shipping_company as any) || "yalidine");
    setShipConfirm(o);
  };

  const fetchTracking = async (orderId: string, force = false) => {
    if (!force && trackingByOrder[orderId] !== undefined) return;

    setTrackingLoadingId(orderId);
    try {
      if (force) {
        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData.session?.access_token;

        if (!token) throw new Error("unauthorized");

        const syncResponse = await fetch("/api/shipping-tracking-sync", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ order_id: orderId }),
        });

        if (!syncResponse.ok) {
          throw new Error("tracking_sync_failed");
        }
      }

      const snapshot = await loadShipmentTracking(orderId);
      setTrackingByOrder((prev) => ({ ...prev, [orderId]: snapshot }));
    } catch {
      setTrackingByOrder((prev) => ({ ...prev, [orderId]: null }));
    } finally {
      setTrackingLoadingId(null);
    }
  };

  const confirmShip = async () => {
    const o = shipConfirm;
    if (!o) return;
    setShipConfirm(null);
    setBusyId(o.id);
    setErr("");
    setShipOk(null);
    try {
      const res = await shipOrderViaEngine(o.id, shipCarrier);
      if (!res.ok) {
        const msg =
          res.error === "yalidine_credentials_required"
            ? isFr ? "Liez votre compte Yalidine depuis « Données de la boutique », puis réessayez." : "اربط حساب ياليدين من «بيانات المتجر» ثم أعد المحاولة."
            : res.message || isFr ? "Impossible de créer le colis. Vous pouvez exporter le CSV et l’envoyer manuellement." : "تعذّر إنشاء الطرد. يمكنك تصدير CSV وإرساله يدوياً.";
        setErr(msg);
        return;
      }
      setOrders((prev) =>
        prev.map((x) =>
          x.id === o.id
            ? {
                ...x,
                tracking_number: res.tracking_number || x.tracking_number || null,
                status: "shipped" as OrderStatus,
                shipping_status: "created",
              }
            : x,
        ),
      );
      setShipOk(
        res.tracking_number
          ? isFr ? "Colis créé · Numéro de suivi : " : "تم إنشاء الطرد · رقم التتبع: " + res.tracking_number
          : isFr ? "Colis envoyé à Yalidine avec succès" : "تم إرسال الطرد إلى ياليدين بنجاح",
      );
      setTimeout(() => setShipOk(null), 5000);
    } catch (e: any) {
      setErr(isFr ? "Une erreur inattendue est survenue. Réessayez plus tard ou exportez le CSV." : "حدث خطأ غير متوقع. جرّب لاحقاً أو صدّر CSV.");
    } finally {
      setBusyId(null);
    }
  };

    const wa = (o: OrderRow) => {
    const text =
      `مرحباً ${o.customer_name}، بخصوص طلبك:\n` +
      `${orderItemsSummary(o)}\n` +
      `الإجمالي: ${formatMoney(o.total_price)} دج`;
    window.open(
      `https://wa.me/${String(o.phone).replace(/\D/g, "")}?text=${encodeURIComponent(text)}`,
      "_blank",
    );
  };

  return (
    <div className="orders-panel">
      <div className="orders-hero">
        <div>
          <h2>
            <ShoppingBag size={20} /> الطلبات
          </h2>
          <p>مبيعات اليوم · تأكيد · واتساب · طباعة الملخص · تصدير CSV</p>
        </div>
        <div className="orders-hero-actions">
          <button type="button" className="btn-ghost" onClick={() => exportOrdersCsv(visible)}>
            <Download size={16} /> تصدير CSV
          </button>
          <button type="button" className="btn-ghost" onClick={reload} disabled={loading}>
            <RefreshCw size={16} className={loading ? "spin" : ""} /> تحديث
          </button>
        </div>
      </div>

      <div className="orders-stats">
        <div className="ostat">
          <span>المعروضة</span>
          <b>{visible.length}</b>
        </div>
        <div className="ostat">
          <span>جديدة</span>
          <b>{newCount}</b>
        </div>
        <div className="ostat">
          <span>الإجمالي</span>
          <b>{formatMoney(totalDzd)} دج</b>
        </div>
      </div>

      <div className="orders-filters">
        {(
          [
            ["today", isFr ? "Aujourd’hui" : "اليوم"],
            ["yesterday", isFr ? "Hier" : "أمس"],
            ["7d", isFr ? "7 jours" : "7 أيام"],
            ["all", isFr ? "Tous" : "الكل"],
          ] as const
        ).map(([k, label]) => (
          <button
            key={k}
            type="button"
            className={day === k ? "of-active" : ""}
            onClick={() => setDay(k)}
          >
            {label}
          </button>
        ))}
      </div>

      {err && <div className="orders-err">{err}</div>}
      {shipOk && <div className="orders-ok">{shipOk}</div>}
      {loading && !orders.length && <p className="orders-muted">جاري التحميل…</p>}
      {!loading && !visible.length && <p className="orders-muted">لا طلبات في هذه الفترة.</p>}

      <div className="orders-list">
        {visible.map((o) => {
          const open = expanded === o.id;
          const items = o.items && o.items.length ? o.items : null;
          return (
            <article key={o.id} className={`order-card ${STATUS_CLASS[o.status] || ""}`}>
              <header className="order-card-head">
                <div className="order-card-who">
                  <strong className="order-name">{o.customer_name}</strong>
                  <span className="order-phone" dir="ltr">
                    {o.phone}
                  </span>
                </div>
                <div className="order-card-meta">
                  <span className={`order-badge ${STATUS_CLASS[o.status]}`}>
                    {ORDER_STATUS_LABEL[o.status] || o.status}
                  </span>
                  <b className="order-total">{formatMoney(o.total_price)} دج</b>
                </div>
              </header>

              <div className="order-body">
                <p className="order-products">{orderItemsSummary(o)}</p>
                <p className="order-ship">
                  <span>{o.wilaya_name || "—"}</span>
                  {o.commune ? <span> · {o.commune}</span> : null}
                  <span> · {deliveryLabel(o)}</span>
                  {o.shipping_price != null ? (
                    <span> · شحن {formatMoney(o.shipping_price)} دج</span>
                  ) : null}
                </p>
                {o.tracking_number ? (
    <button
      type="button"
      className="order-tracking-card"
      onClick={() => {
        const nextOpen = expanded === o.id ? null : o.id;
        setExpanded(nextOpen);
        if (nextOpen) void fetchTracking(o.id);
      }}
      title={isFr ? "Voir les détails et suivre l’expédition" : "عرض تفاصيل الشحنة وتتبعها"}
    >
      <span className="order-tracking-icon">
        <Truck size={17} />
      </span>
      <span className="order-tracking-main">
        <span className="order-tracking-title">
          تتبع الشحنة
          <span className="order-tracking-arrow">↗</span>
        </span>
        <span className="order-tracking-number" dir="ltr">
          {o.tracking_number}
        </span>
      </span>
      <span className="order-tracking-badge">
        {o.tracking_number.startsWith("SANDBOX-") ? isFr ? "Environnement de test" : "بيئة اختبار" : "تتبع مباشر"}
      </span>
    </button>
  ) : null}
              </div>

              {open && (
                <div className="order-details">
                  {items ? (
                    <table className="order-items-table">
                      <thead>
                        <tr>
                          <th>المنتج</th>
                          <th>الكمية</th>
                          <th>السعر</th>
                          <th>المجموع</th>
                        </tr>
                      </thead>
                      <tbody>
                        {items.map((it) => (
                          <tr key={it.id || `${it.product_name}-${it.quantity}`}>
                            <td>{it.product_name}</td>
                            <td>{it.quantity}</td>
                            <td>{formatMoney(it.unit_price)}</td>
                            <td>
                              {formatMoney(Number(it.unit_price || 0) * Number(it.quantity || 0))}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <p className="orders-muted">
                      لا أسطر order_items — تأكد من تشغيل ORDER_ITEMS_MIGRATION.sql
                    </p>
                  )}

                  {o.tracking_number ? (
                    <div className="order-tracking-panel">
                      <div className="order-tracking-panel-head">
                        <strong>حالة الشحنة</strong>
                        <button
                          type="button"
                          className="btn-icon"
                          title={isFr ? "Actualiser le suivi" : "تحديث التتبع"}
                          disabled={trackingLoadingId === o.id}
                          onClick={() => void fetchTracking(o.id, true)}
                        >
                          <RefreshCw
                            size={15}
                            className={trackingLoadingId === o.id ? "spin" : ""}
                          />
                        </button>
                      </div>

                      {trackingLoadingId === o.id && !trackingByOrder[o.id] ? (
                        <p className="orders-muted">جاري جلب حالة الشحنة…</p>
                      ) : trackingByOrder[o.id] ? (
                        <div className="order-tracking-info">
                          <div>
                            <span>الحالة</span>
                            <strong>
                              {trackingStatusLabel(trackingByOrder[o.id]?.status || "unknown")}
                            </strong>
                          </div>

                          <div>
                            <span>رقم التتبع</span>
                            <strong dir="ltr">
                              {trackingByOrder[o.id]?.tracking_number || o.tracking_number}
                            </strong>
                          </div>

                          {trackingByOrder[o.id]?.last_tracking_at ? (
                            <div>
                              <span>آخر تحديث</span>
                              <strong>
                                {new Date(
                                  trackingByOrder[o.id]!.last_tracking_at!
                                ).toLocaleString("ar-DZ")}
                              </strong>
                            </div>
                          ) : null}

                          {trackingByOrder[o.id]?.tracking_url &&
                          !String(
                            trackingByOrder[o.id]?.tracking_number || o.tracking_number || ""
                          ).startsWith("SANDBOX-") ? (
                            <a
                              href={trackingByOrder[o.id]!.tracking_url!}
                              target="_blank"
                              rel="noreferrer"
                              className="order-tracking-link"
                            >
                              فتح صفحة التتبع الخارجي ↗
                            </a>
                          ) : null}

                          {trackingByOrder[o.id]?.events?.length ? (
                            <div className="order-tracking-events">
                              {trackingByOrder[o.id]!.events.slice(0, 5).map((event) => (
                                <div
                                  className="order-tracking-event"
                                  key={`${event.event_at}-${event.status}-${event.source}`}
                                >
                                  <span>{trackingStatusLabel(event.normalized_status || event.status)}</span>
                                  <time dir="ltr">
                                    {new Date(event.event_at).toLocaleString("ar-DZ")}
                                  </time>
                                </div>
                              ))}
                            </div>
                          ) : null}
                        </div>
                      ) : (
                        <p className="orders-muted">
                          تعذّر جلب حالة الشحنة حالياً. اضغط تحديث للمحاولة مرة أخرى.
                        </p>
                      )}
                    </div>
                  ) : null}
                </div>
              )}

              <div className="order-actions">
                <select
                  className="order-status-select"
                  value={o.status}
                  disabled={busyId === o.id}
                  onChange={(e) => setStatus(o.id, e.target.value as OrderStatus)}
                >
                  {(Object.keys(ORDER_STATUS_LABEL) as OrderStatus[]).map((s) => (
                    <option key={s} value={s}>
                      {ORDER_STATUS_LABEL[s]}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  className="btn-icon"
                  title={isFr ? "Détails / Imprimer" : "تفاصيل / طباعة"}
                  onClick={() => setPreview(o)}
                >
                  <Printer size={16} />
                </button>
                <button
                  type="button"
                  className="btn-icon"
                  title={isFr ? "Copier le résumé" : "نسخ الملخص"}
                  onClick={() => {
                    navigator.clipboard?.writeText(buildOrderPlainText(o));
                  }}
                >
                  <Copy size={16} />
                </button>
                <button
                  type="button"
                  className="btn-icon ship"
                  title={o.tracking_number ? (isFr ? "Expédiée" : "تم الشحن") : (isFr ? "Expédier avec Yalidine" : "شحن مع ياليدين")}
                  disabled={busyId === o.id || Boolean(o.tracking_number)}
                  onClick={() => ship(o)}
                >
                  <Truck size={16} />
                </button>
                <button type="button" className="btn-icon" title={isFr ? "WhatsApp" : "واتساب"} onClick={() => wa(o)}>
                  <MessageCircle size={16} />
                </button>
                <button
                  type="button"
                  className="btn-icon"
                  title={open ? (isFr ? "Masquer les détails" : "إخفاء التفاصيل") : (isFr ? "Afficher les articles" : "عرض البنود")}
                  onClick={() => {
                    const nextOpen = open ? null : o.id;
                    setExpanded(nextOpen);
                    if (nextOpen && o.tracking_number) {
                      void fetchTracking(o.id);
                    }
                  }}
                >
                  {open ? "−" : "+"}
                </button>
                <button
                  type="button"
                  className="btn-icon danger"
                  title={isFr ? "Supprimer" : "حذف"}
                  disabled={busyId === o.id}
                  onClick={() => remove(o.id)}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </article>
          );
        })}
      </div>

      
      {shipConfirm && (
        <div className="print-modal-overlay" role="dialog" aria-modal="true">
          <div className="print-modal ship-confirm-modal">
            <div className="print-modal-head">
              <h3>تأكيد الشحن</h3>
              <button type="button" className="btn-icon" onClick={() => setShipConfirm(null)} aria-label={isFr ? "Fermer" : "إغلاق"}>
                <X size={18} />
              </button>
            </div>
            <p className="ship-confirm-text">
              سيتم إنشاء طرد لدى شركة التوصيل المختارة للطلب الخاص بـ <strong>{shipConfirm.customer_name}</strong>
              {" "}({shipConfirm.wilaya_name || "—"}) · {formatMoney(shipConfirm.total_price)} دج
            </p>
            <label style={{display:"grid",gap:7,margin:"12px 0"}}>
              <span style={{fontSize:12,opacity:.7}}>شركة التوصيل</span>
              <select value={shipCarrier} onChange={(e)=>setShipCarrier(e.target.value as any)} style={{width:"100%",padding:"11px 12px",borderRadius:12,border:"1px solid rgba(255,255,255,.12)",background:"rgba(255,255,255,.05)",color:"inherit"}}>
                <option value="yalidine">Yalidine Express</option>
                <option value="zr_express">ZR Express</option>
                <option value="maystro">Maystro Delivery</option>
                <option value="noest">NOEST Express</option>
              </select>
            </label>
            <div className="print-modal-actions">
              <button type="button" className="btn-primary" onClick={confirmShip}>
                <Truck size={16} /> تأكيد الشحن
              </button>
              <button type="button" className="btn-ghost" onClick={() => setShipConfirm(null)}>
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {preview && (
        <div className="print-modal-overlay" role="dialog" aria-modal="true">
          <div className="print-modal">
            <div className="print-modal-head">
              <h3>ملخص الطلب</h3>
              <button type="button" className="btn-icon" onClick={() => setPreview(null)}>
                <X size={18} />
              </button>
            </div>
            <pre className="print-modal-body">{buildOrderPlainText(preview)}</pre>
            <div className="print-modal-actions">
              <button type="button" className="btn-primary" onClick={() => printOrder(preview)}>
                <Printer size={16} /> طباعة
              </button>
              <button
                type="button"
                className="btn-ghost"
                onClick={() => navigator.clipboard?.writeText(buildOrderPlainText(preview))}
              >
                <Copy size={16} /> نسخ
              </button>
              <button type="button" className="btn-ghost" onClick={() => wa(preview)}>
                <MessageCircle size={16} /> واتساب
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .orders-panel{color:#e2e8f0}
        .orders-hero{display:flex;justify-content:space-between;gap:12px;align-items:flex-start;margin-bottom:16px;flex-wrap:wrap}
        .orders-hero h2{display:flex;align-items:center;gap:8px;margin:0 0 4px;font-size:1.15rem;color:#f8fafc}
        .orders-hero p{margin:0;color:#94a3b8;font-size:.9rem}
        .orders-hero-actions{display:flex;gap:8px;flex-wrap:wrap}
        .btn-ghost{display:inline-flex;align-items:center;gap:6px;border:1px solid rgba(148,163,184,.35);background:rgba(15,23,42,.5);color:#e2e8f0;border-radius:10px;padding:8px 12px;font:inherit;cursor:pointer}
        .btn-primary{display:inline-flex;align-items:center;gap:6px;border:0;background:#2563eb;color:#fff;border-radius:10px;padding:10px 14px;font:inherit;cursor:pointer;font-weight:600}
        .orders-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:12px}
        .ostat{background:rgba(15,23,42,.55);border:1px solid rgba(148,163,184,.2);border-radius:12px;padding:10px 12px}
        .ostat span{display:block;font-size:.75rem;color:#94a3b8}
        .ostat b{font-size:1.05rem;color:#f1f5f9}
        .orders-filters{display:flex;gap:6px;margin-bottom:14px;flex-wrap:wrap}
        .orders-filters button{border:0;background:rgba(148,163,184,.15);color:#e2e8f0;border-radius:999px;padding:6px 12px;font:inherit;cursor:pointer}
        .orders-filters .of-active{background:#2563eb;color:#fff}
        .orders-err{background:rgba(239,68,68,.15);color:#fecaca;padding:10px;border-radius:10px;margin-bottom:10px}
        .orders-ok{background:rgba(34,197,94,.15);color:#bbf7d0;padding:10px;border-radius:10px;margin-bottom:10px;font-size:.9rem}
        .ship-confirm-text{margin:8px 0 4px;line-height:1.55;color:#e2e8f0;font-size:.92rem}
        .ship-confirm-modal{max-width:400px}
        .orders-muted{color:#94a3b8;font-size:.9rem}
        .orders-list{display:flex;flex-direction:column;gap:12px}
        .order-card{
          border:1px solid rgba(148,163,184,.28);
          border-radius:16px;
          padding:14px 14px 12px;
          background:linear-gradient(180deg, rgba(30,41,59,.95), rgba(15,23,42,.98));
          color:#f1f5f9;
          box-shadow:0 8px 24px rgba(0,0,0,.25);
        }
        .order-card-head{display:flex;justify-content:space-between;gap:12px;align-items:flex-start}
        .order-name{display:block;font-size:1.05rem;font-weight:700;color:#fff}
        .order-phone{display:block;font-size:.88rem;color:#cbd5e1;margin-top:2px}
        .order-card-meta{text-align:left;display:flex;flex-direction:column;align-items:flex-end;gap:6px}
        .order-badge{font-size:.72rem;font-weight:700;padding:3px 10px;border-radius:999px}
        .order-badge.st-new{background:#1d4ed8;color:#fff}
        .order-badge.st-confirmed{background:#15803d;color:#fff}
        .order-badge.st-shipped{background:#b45309;color:#fff}
        .order-badge.st-done{background:#475569;color:#fff}
        .order-badge.st-cancelled{background:#b91c1c;color:#fff}
        .order-total{font-size:1.05rem;color:#fbbf24;font-weight:800}
        .order-body{margin-top:10px;padding:10px 12px;border-radius:12px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.08)}
        .order-products{margin:0 0 6px;font-size:.95rem;font-weight:600;color:#f8fafc;line-height:1.45}
        .order-ship{margin:0;font-size:.82rem;color:#cbd5e1;line-height:1.4}
        .order-details{margin:10px 0;padding:10px;background:rgba(0,0,0,.25);border-radius:10px}
        .order-items-table{width:100%;border-collapse:collapse;font-size:.85rem;color:#e2e8f0}
        .order-items-table th,.order-items-table td{padding:6px 4px;border-bottom:1px solid rgba(148,163,184,.2);text-align:right}
        .order-items-table th{color:#94a3b8;font-weight:600}
        .order-actions{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-top:12px}
        .order-status-select{
          font:inherit;border-radius:10px;padding:8px 10px;
          border:1px solid rgba(148,163,184,.35);
          background:#0f172a;color:#f1f5f9;min-width:7.5rem;
        }
        .btn-icon{
          display:inline-flex;align-items:center;justify-content:center;
          width:38px;height:38px;border-radius:11px;
          border:1px solid rgba(148,163,184,.3);
          background:rgba(15,23,42,.8);color:#e2e8f0;cursor:pointer;
        }
        .btn-icon.danger{color:#fca5a5}
        .btn-icon.ship{color:#86efac}
        .btn-icon.ship:disabled{opacity:.45}
        
.order-tracking-card{width:100%;margin:10px 0 2px;padding:11px 12px;display:flex;align-items:center;gap:11px;border:1px solid rgba(255,255,255,.09);border-radius:14px;background:linear-gradient(135deg,rgba(34,197,94,.10),rgba(15,23,42,.72));color:inherit;text-align:right;cursor:pointer;transition:transform .18s ease,border-color .18s ease,background .18s ease,box-shadow .18s ease}
.order-tracking-card:hover{transform:translateY(-1px);border-color:rgba(74,222,128,.38);background:linear-gradient(135deg,rgba(34,197,94,.15),rgba(15,23,42,.82));box-shadow:0 8px 24px rgba(0,0,0,.18)}
.order-tracking-icon{width:34px;height:34px;flex:0 0 34px;display:grid;place-items:center;border-radius:10px;background:rgba(34,197,94,.14);color:#86efac}
.order-tracking-main{min-width:0;flex:1;display:flex;flex-direction:column;gap:3px}
.order-tracking-title{display:flex;align-items:center;gap:5px;font-size:.78rem;font-weight:800;color:#bbf7d0}
.order-tracking-arrow{font-size:.9rem;opacity:.75}
.order-tracking-number{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:.78rem;font-weight:600;color:#e2e8f0}
.order-tracking-badge{flex:0 0 auto;padding:5px 8px;border-radius:999px;font-size:.65rem;font-weight:800;color:#86efac;background:rgba(34,197,94,.10);border:1px solid rgba(134,239,172,.16)}
.order-tracking{margin:6px 0 0;font-size:.82rem;color:#86efac;font-weight:600}
        .order-tracking-panel{
          margin-top:12px;
          padding:12px;
          border:1px solid rgba(148,163,184,.18);
          border-radius:12px;
          background:rgba(15,23,42,.55);
        }
        .order-tracking-panel-head{
          display:flex;
          align-items:center;
          justify-content:space-between;
          gap:10px;
          margin-bottom:10px;
        }
        .order-tracking-panel-head strong{
          font-size:.9rem;
          color:#f8fafc;
        }
        .order-tracking-info{
          display:grid;
          gap:8px;
        }
        .order-tracking-info > div:not(.order-tracking-events){
          display:flex;
          align-items:center;
          justify-content:space-between;
          gap:12px;
          padding:8px 0;
          border-bottom:1px solid rgba(148,163,184,.1);
        }
        .order-tracking-info > div span{
          color:#94a3b8;
          font-size:.78rem;
        }
        .order-tracking-info > div strong{
          color:#e2e8f0;
          font-size:.82rem;
          text-align:left;
        }
        .order-tracking-link{
          display:inline-flex;
          align-items:center;
          justify-content:center;
          margin-top:2px;
          padding:8px 12px;
          border-radius:9px;
          background:rgba(34,197,94,.12);
          border:1px solid rgba(34,197,94,.25);
          color:#86efac;
          text-decoration:none;
          font-size:.82rem;
          font-weight:700;
        }
        .order-tracking-link:hover{
          background:rgba(34,197,94,.18);
        }
        .order-tracking-events{
          display:grid;
          gap:6px;
          margin-top:4px;
          padding-top:8px;
          border-top:1px solid rgba(148,163,184,.12);
        }
        .order-tracking-event{
          display:flex;
          align-items:center;
          justify-content:space-between;
          gap:10px;
          font-size:.76rem;
        }
        .order-tracking-event span{
          color:#cbd5e1;
          font-weight:600;
        }
        .order-tracking-event time{
          color:#64748b;
          font-size:.7rem;
        }

        .spin{animation:spin 1s linear infinite}
        @keyframes spin{to{transform:rotate(360deg)}}
        .print-modal-overlay{
          position:fixed;inset:0;z-index:80;background:rgba(2,6,23,.75);
          display:grid;place-items:center;padding:16px;
        }
        .print-modal{
          width:min(440px,100%);background:#0f172a;border:1px solid rgba(148,163,184,.3);
          border-radius:16px;padding:14px;color:#f1f5f9;
          box-shadow:0 20px 50px rgba(0,0,0,.45);
        }
        .print-modal-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:8px}
        .print-modal-head h3{margin:0;font-size:1rem}
        .print-modal-body{
          margin:0;white-space:pre-wrap;font-family:ui-monospace,Tahoma,monospace;
          font-size:.82rem;line-height:1.5;background:rgba(0,0,0,.35);
          border-radius:12px;padding:12px;max-height:50vh;overflow:auto;color:#e2e8f0;
        }
        .print-modal-actions{display:flex;flex-wrap:wrap;gap:8px;margin-top:12px}
      `}</style>
    </div>
  );
}
