import { useEffect, useMemo, useState } from "react";
import { MessageCircle, Trash2, RefreshCw, ShoppingBag } from "lucide-react";
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

export function OrdersPanel({ storeId, whatsapp }: { storeId: string; whatsapp: string }) {
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [day, setDay] = useState<DayFilter>("today");
  const [busyId, setBusyId] = useState<string | null>(null);

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
    const digits = String(whatsapp || "").replace(/\D/g, "");
    const text =
      `مرحباً ${o.customer_name}، بخصوص طلبك:\n` +
      `${o.product_name} × ${o.quantity}\n` +
      `الإجمالي: ${Number(o.total_price).toLocaleString("ar-DZ")} دج`;
    window.open(`https://wa.me/${String(o.phone).replace(/\D/g, "")}?text=${encodeURIComponent(text)}`, "_blank");
  };

  return (
    <div className="orders-panel">
      <div className="orders-hero">
        <div>
          <h2><ShoppingBag size={20} /> الطلبات</h2>
          <p>كل طلب يصل لواتسابك ويُحفظ هنا — غيّر الحالة أو احذف أو اتركه.</p>
        </div>
        <button type="button" className="orders-refresh" onClick={reload}>
          <RefreshCw size={16} /> تحديث
        </button>
      </div>

      <div className="orders-day-bar">
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
            className={day === k ? "on" : ""}
            onClick={() => setDay(k)}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="orders-summary">
        <div>
          <span>عدد الطلبات</span>
          <b>{visible.length}</b>
        </div>
        <div>
          <span>جدد</span>
          <b className="c-new">{newCount}</b>
        </div>
        <div>
          <span>الإجمالي</span>
          <b>{totalDzd.toLocaleString("ar-DZ")} دج</b>
        </div>
      </div>

      {err && <p className="orders-err">{err}</p>}
      {loading && <p className="orders-muted">جاري التحميل…</p>}

      {!loading && visible.length === 0 && (
        <div className="orders-empty">
          <p>لا طلبات في هذه الفترة.</p>
          <p className="orders-muted">شارك رابط متجرك — عندما يطلب زبون سيظهر هنا فوراً مع واتساب.</p>
        </div>
      )}

      <div className="orders-list">
        {visible.map((o) => {
          const st = (o.status || "new") as OrderStatus;
          return (
            <article key={o.id} className={`order-card ${STATUS_CLASS[st] || "st-new"}`}>
              <div className="order-card-top">
                <div>
                  <strong>{o.customer_name}</strong>
                  <span className="order-phone" dir="ltr">{o.phone}</span>
                </div>
                <span className={`order-badge ${STATUS_CLASS[st]}`}>
                  {ORDER_STATUS_LABEL[st] || st}
                </span>
              </div>
              <p className="order-products">{o.product_name}{o.quantity > 1 ? ` × ${o.quantity}` : ""}</p>
              <div className="order-meta">
                <span>{o.wilaya_name || "—"}</span>
                <span>{o.delivery_type === "desk" ? "مكتب" : "منزل"}</span>
                <span className="order-total">{Number(o.total_price).toLocaleString("ar-DZ")} دج</span>
              </div>
              <time className="order-time">
                {new Date(o.created_at).toLocaleString("ar-DZ")}
              </time>
              <div className="order-actions">
                <select
                  value={st}
                  disabled={busyId === o.id}
                  onChange={(e) => setStatus(o.id, e.target.value as OrderStatus)}
                >
                  {(Object.keys(ORDER_STATUS_LABEL) as OrderStatus[]).map((k) => (
                    <option key={k} value={k}>
                      {ORDER_STATUS_LABEL[k]}
                    </option>
                  ))}
                </select>
                <button type="button" className="oa-wa" onClick={() => wa(o)} title="واتساب الزبون">
                  <MessageCircle size={16} /> واتساب
                </button>
                <button
                  type="button"
                  className="oa-del"
                  disabled={busyId === o.id}
                  onClick={() => remove(o.id)}
                  title="حذف"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
