import { useEffect, useMemo, useState } from "react";
import { MessageCircle, Trash2, RefreshCw, ShoppingBag, Download, Copy } from "lucide-react";
import {
  loadOrders,
  updateOrderStatus,
  deleteOrder,
  ORDER_STATUS_LABEL,
  type OrderRow,
  type OrderStatus,
} from "@/lib/storeData";

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

function exportOrdersCsv(orders: OrderRow[]) {
  // Columns aligned with common Yalidine / ZR import habits
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
      .map((c) => `"${String(c).replace(/"/g, '""')}"`)
      .join(",");
  });
  const bom = "\uFEFF";
  const csv = bom + [headers.join(","), ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `ab-store-orders-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function copyCustomerAddress(o: OrderRow) {
  const lines = [
    o.customer_name,
    o.phone,
    o.wilaya_name || "",
    o.commune || "",
    o.address || "",
    o.delivery_type === "desk" || o.delivery_type === "stopdesk" ? "مكتب / stopdesk" : "منزل",
    orderItemsSummary(o),
    `الإجمالي: ${Number(o.total_price || 0).toLocaleString("ar-DZ")} دج`,
  ].filter(Boolean);
  navigator.clipboard?.writeText(lines.join("\n"));
}

export function OrdersPanel({ storeId, whatsapp }: { storeId: string; whatsapp: string }) {
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [day, setDay] = useState<DayFilter>("today");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

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
    if (!confirm("حذف هذا الطلب نهائياً؟")) return;
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

  const wa = (o: OrderRow) => {
    const text =
      `مرحباً ${o.customer_name}، بخصوص طلبك:\n` +
      `${orderItemsSummary(o)}\n` +
      `الإجمالي: ${Number(o.total_price).toLocaleString("ar-DZ")} دج`;
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
          <p>كل طلب يُحفظ هنا — غيّر الحالة، صدّر للشحن، أو تواصل واتساب.</p>
        </div>
        <div className="orders-hero-actions">
          <button type="button" className="btn-ghost" onClick={() => exportOrdersCsv(visible)} title="تصدير CSV">
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
          <b>{totalDzd.toLocaleString("ar-DZ")} دج</b>
        </div>
      </div>

      <div className="orders-filters">
        {(
          [
            ["today", "اليوم"],
            ["yesterday", "أمس"],
            ["7d", "7 أيام"],
            ["all", "الكل"],
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
      {loading && !orders.length && <p className="orders-muted">جاري التحميل…</p>}
      {!loading && !visible.length && <p className="orders-muted">لا طلبات في هذه الفترة.</p>}

      <div className="orders-list">
        {visible.map((o) => {
          const open = expanded === o.id;
          const items = o.items && o.items.length ? o.items : null;
          return (
            <article key={o.id} className={`order-card ${STATUS_CLASS[o.status] || ""}`}>
              <header className="order-card-head" onClick={() => setExpanded(open ? null : o.id)}>
                <div>
                  <strong>{o.customer_name}</strong>
                  <span className="order-phone">{o.phone}</span>
                </div>
                <div className="order-card-meta">
                  <span className={`order-status ${STATUS_CLASS[o.status]}`}>
                    {ORDER_STATUS_LABEL[o.status] || o.status}
                  </span>
                  <b>{Number(o.total_price || 0).toLocaleString("ar-DZ")} دج</b>
                </div>
              </header>

              <p className="order-products-line">{orderItemsSummary(o)}</p>
              <p className="order-ship-line">
                {(o.wilaya_name || "—") +
                  (o.commune ? ` · ${o.commune}` : "") +
                  ` · ${o.delivery_type === "desk" || o.delivery_type === "stopdesk" ? "مكتب" : "منزل"}`}
                {o.shipping_price != null ? ` · شحن ${Number(o.shipping_price).toLocaleString("ar-DZ")} دج` : ""}
              </p>

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
                            <td>{Number(it.unit_price || 0).toLocaleString("ar-DZ")}</td>
                            <td>
                              {(Number(it.unit_price || 0) * Number(it.quantity || 0)).toLocaleString(
                                "ar-DZ",
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <p className="orders-muted">لا توجد أسطر order_items — تأكد من تشغيل ORDER_ITEMS_MIGRATION.sql</p>
                  )}
                  {o.tracking_number && (
                    <p className="order-track">تتبع: {o.tracking_number}</p>
                  )}
                </div>
              )}

              <div className="order-actions">
                <select
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
                <button type="button" className="btn-icon" title="نسخ العنوان" onClick={() => copyCustomerAddress(o)}>
                  <Copy size={16} />
                </button>
                <button type="button" className="btn-icon" title="واتساب" onClick={() => wa(o)}>
                  <MessageCircle size={16} />
                </button>
                <button
                  type="button"
                  className="btn-icon danger"
                  title="حذف"
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

      <style>{`
        .orders-hero{display:flex;justify-content:space-between;gap:12px;align-items:flex-start;margin-bottom:16px;flex-wrap:wrap}
        .orders-hero h2{display:flex;align-items:center;gap:8px;margin:0 0 4px;font-size:1.15rem}
        .orders-hero p{margin:0;opacity:.75;font-size:.9rem}
        .orders-hero-actions{display:flex;gap:8px;flex-wrap:wrap}
        .btn-ghost{display:inline-flex;align-items:center;gap:6px;border:1px solid rgba(15,23,42,.12);background:#fff;border-radius:10px;padding:8px 12px;font:inherit;cursor:pointer}
        .orders-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:12px}
        .ostat{background:rgba(15,23,42,.04);border-radius:12px;padding:10px 12px}
        .ostat span{display:block;font-size:.75rem;opacity:.7}
        .ostat b{font-size:1.05rem}
        .orders-filters{display:flex;gap:6px;margin-bottom:14px;flex-wrap:wrap}
        .orders-filters button{border:0;background:rgba(15,23,42,.06);border-radius:999px;padding:6px 12px;font:inherit;cursor:pointer}
        .orders-filters .of-active{background:#0f172a;color:#fff}
        .orders-err{background:#fef2f2;color:#b91c1c;padding:10px;border-radius:10px;margin-bottom:10px}
        .orders-muted{opacity:.65;font-size:.9rem}
        .orders-list{display:flex;flex-direction:column;gap:12px}
        .order-card{border:1px solid rgba(15,23,42,.1);border-radius:14px;padding:12px 14px;background:#fff}
        .order-card-head{display:flex;justify-content:space-between;gap:10px;cursor:pointer}
        .order-phone{display:block;font-size:.85rem;opacity:.7;direction:ltr;text-align:right}
        .order-card-meta{text-align:left;display:flex;flex-direction:column;align-items:flex-end;gap:4px}
        .order-status{font-size:.75rem;padding:2px 8px;border-radius:999px;background:rgba(15,23,42,.08)}
        .st-new .order-status,.order-status.st-new{background:#dbeafe;color:#1d4ed8}
        .st-confirmed .order-status,.order-status.st-confirmed{background:#dcfce7;color:#15803d}
        .st-shipped .order-status,.order-status.st-shipped{background:#fef3c7;color:#b45309}
        .order-products-line{margin:8px 0 4px;font-size:.9rem}
        .order-ship-line{margin:0 0 8px;font-size:.8rem;opacity:.7}
        .order-details{margin:8px 0;padding:10px;background:rgba(15,23,42,.03);border-radius:10px}
        .order-items-table{width:100%;border-collapse:collapse;font-size:.85rem}
        .order-items-table th,.order-items-table td{padding:6px 4px;border-bottom:1px solid rgba(15,23,42,.08);text-align:right}
        .order-actions{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
        .order-actions select{font:inherit;border-radius:8px;padding:6px 8px;border:1px solid rgba(15,23,42,.15)}
        .btn-icon{display:inline-flex;align-items:center;justify-content:center;width:36px;height:36px;border-radius:10px;border:1px solid rgba(15,23,42,.1);background:#fff;cursor:pointer}
        .btn-icon.danger{color:#b91c1c}
        .spin{animation:spin 1s linear infinite}
        @keyframes spin{to{transform:rotate(360deg)}}
      `}</style>
    </div>
  );
}
