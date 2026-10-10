import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";

const env = (key: string) => (process.env[key] || "").trim();
const text = (v: unknown, max = 2000) => String(v ?? "").trim().slice(0, max);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Cache-Control", "private, no-store");
  if (req.method !== "POST") return res.status(405).json({ error: "method_not_allowed" });
  const token = String(req.headers.authorization || "").replace(/^Bearer\s+/i, "").trim();
  const url = env("SUPABASE_URL") || env("VITE_SUPABASE_URL");
  const anon = env("SUPABASE_ANON_KEY") || env("VITE_SUPABASE_ANON_KEY");
  const service = env("SUPABASE_SERVICE_ROLE_KEY");
  const apiKey = env("GROQ_API_KEY");
  const model = env("GROQ_MODEL") || "openai/gpt-oss-20b";
  if (!token || !url || !anon) return res.status(401).json({ error: "authentication_required" });
  if (!apiKey) return res.status(503).json({ error: "groq_not_configured", message: "أضف GROQ_API_KEY إلى متغيرات البيئة في Vercel." });
  const body: any = typeof req.body === "string" ? (() => { try { return JSON.parse(req.body); } catch { return {}; } })() : (req.body || {});
  const question = text(body.question, 1500);
  const storeId = text(body.storeId, 80);
  if (!question || !storeId) return res.status(400).json({ error: "question_and_store_required" });
  const authClient = createClient(url, anon, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: auth, error: authError } = await authClient.auth.getUser(token);
  if (authError || !auth.user) return res.status(401).json({ error: "invalid_session" });
  const db = createClient(url, service || anon, { auth: { persistSession: false, autoRefreshToken: false }, global: service ? {} : { headers: { Authorization: `Bearer ${token}` } } });
  const { data: store, error: storeError } = await db.from("stores").select("id,owner_id,name,slug,plan").eq("id", storeId).eq("owner_id", auth.user.id).maybeSingle();
  if (storeError || !store) return res.status(403).json({ error: "store_access_denied" });
  const [productsResult, ordersResult] = await Promise.all([
    db.from("products").select("id,name,category,price,is_active,stock,track_stock").eq("store_id", storeId).limit(100),
    db.from("orders").select("id,status,total_price,quantity,product_name,created_at").eq("store_id", storeId).order("created_at", { ascending: false }).limit(100),
  ]);
  const products = productsResult.error ? [] : (productsResult.data || []);
  const orders = ordersResult.error ? [] : (ordersResult.data || []);
  const snapshot = {
    store: { name: store.name, plan: store.plan },
    products: products.map((p: any) => ({ name: p.name, category: p.category, price: p.price, active: p.is_active, stock: p.stock, stockTracked: p.track_stock })),
    recentOrders: orders.map((o: any) => ({ status: o.status, total: o.total_price, quantity: o.quantity, product: o.product_name, createdAt: o.created_at })),
    dataNotes: { productsQuerySucceeded: !productsResult.error, ordersQuerySucceeded: !ordersResult.error, productCount: products.length, orderCount: orders.length },
  };
  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", { method: "POST", headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" }, body: JSON.stringify({ model, temperature: 0.25, max_tokens: 1200, messages: [
      { role: "system", content: "أنت Dzair Copilot، مساعد للتجار الجزائريين. أجب باللغة التي استعملها المستخدم. استخدم فقط لقطة بيانات المتجر المقدمة. لا تخترع مبيعات أو مخزونًا أو طلبات؛ اذكر بوضوح إذا كانت البيانات ناقصة. لا تنفذ عمليات كتابة أو تغييرات؛ قدم إرشادات فقط. احترم خصوصية المتجر ولا تطلب أسرارًا." },
      { role: "user", content: `سؤال التاجر: ${question}\n\nبيانات المتجر المصرح بها فقط (JSON): ${JSON.stringify(snapshot)}` },
    ] }), signal: AbortSignal.timeout(20000) });
    if (!response.ok) { console.error("[dzair-copilot] Groq error", response.status, (await response.text()).slice(0, 500)); return res.status(502).json({ error: "ai_provider_error", message: "تعذر الوصول إلى Groq الآن. حاول مجددًا بعد قليل." }); }
    const payload: any = await response.json();
    const answer = text(payload?.choices?.[0]?.message?.content, 8000);
    if (!answer) return res.status(502).json({ error: "empty_ai_response" });
    return res.status(200).json({ answer, model, dataUsed: { products: products.length, orders: orders.length, productsAvailable: !productsResult.error, ordersAvailable: !ordersResult.error } });
  } catch (error) {
    console.error("[dzair-copilot] request failed", error);
    return res.status(502).json({ error: "ai_request_failed", message: "حدث خطأ أثناء الاتصال بالمساعد. حاول مجددًا." });
  }
}
