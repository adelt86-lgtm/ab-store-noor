import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";

const env = (key: string) => (process.env[key] || "").trim();
const xmlText = (value: string) => value.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1").replace(/<[^>]+>/g, " ").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/\s+/g, " ").trim();

async function authenticated(req: VercelRequest) {
  const token = String(req.headers.authorization || "").replace(/^Bearer\s+/i, "").trim();
  const url = env("SUPABASE_URL") || env("VITE_SUPABASE_URL");
  const key = env("SUPABASE_ANON_KEY") || env("VITE_SUPABASE_ANON_KEY");
  if (!token || !url || !key) return null;
  const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await db.auth.getUser(token);
  return error || !data.user ? null : { user: data.user };
}

async function fetchTrends() {
  const url = "https://trends.google.com/trending/rss?geo=DZ";
  const response = await fetch(url, { headers: { "User-Agent": "DzairStoreProductRadar/1.0 (market research; contact: support@dzair.store)", Accept: "application/rss+xml, application/xml, text/xml" }, signal: AbortSignal.timeout(12000) });
  if (!response.ok) throw new Error(`Google Trends source returned HTTP ${response.status}`);
  const xml = await response.text();
  const items = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/gi)].slice(0, 20).map((match, index) => {
    const part = match[1];
    const get = (tag: string) => xmlText(part.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i"))?.[1] || "");
    const title = get("title");
    const link = get("link");
    const pubDate = get("pubDate");
    const traffic = get("ht:approx_traffic");
    const news = [...part.matchAll(/<ht:news_item>([\s\S]*?)<\/ht:news_item>/gi)].slice(0, 3).map((n) => {
      const body = n[1];
      const getN = (tag: string) => xmlText(body.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i"))?.[1] || "");
      return { title: getN("ht:news_item_title"), url: getN("ht:news_item_url"), source: getN("ht:news_item_source") };
    });
    return { id: `${index}-${title}`, title, url: link, publishedAt: pubDate, approxTraffic: traffic || null, news };
  }).filter((item) => item.title && item.url);
  if (!items.length) throw new Error("Google Trends returned no readable trend items for Algeria.");
  return { source: url, fetchedAt: new Date().toISOString(), items };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Cache-Control", "private, no-store");
  res.setHeader("Vary", "Authorization");
  if (req.method !== "GET") return res.status(405).json({ error: "method_not_allowed" });
  if (!(await authenticated(req))) return res.status(401).json({ error: "authentication_required" });
  try {
    const trends = await fetchTrends();
    const apiKey = env("GROQ_API_KEY");
    const model = env("GROQ_MODEL") || "openai/gpt-oss-20b";
    if (!apiKey) return res.status(200).json({ ...trends, aiConfigured: false, opportunities: [], note: "Live Google Trends loaded. Set GROQ_API_KEY to generate AI product hypotheses." });
    const prompt = `You are a cautious product researcher for Algerian ecommerce. Use ONLY these live Google Trends search topics as evidence: ${JSON.stringify(trends.items.map(({title, approxTraffic, publishedAt, news}) => ({title, approxTraffic, publishedAt, news: news.map(n=>({title:n.title,source:n.source,url:n.url}))})))}. Generate at most 8 product opportunity hypotheses for an Algerian merchant. Never claim a topic proves product sales, purchase intent, profit, or competition. Do not invent statistics. Each item must have: name (product idea), why (brief rationale grounded in one or more provided trend titles), relatedTrend (exact title from input), risk (one sentence), confidence (low|medium only), evidence (array of exact input trend titles). If a trend isn't commerce-related, skip it. Respond as strict JSON object {"opportunities":[...]}. Language: Arabic. `;
    const aiResponse = await fetch("https://api.groq.com/openai/v1/chat/completions", { method: "POST", headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" }, body: JSON.stringify({ model, temperature: 0.2, max_tokens: 1800, messages: [{ role: "system", content: "Return valid JSON only. Do not fabricate evidence or numeric market metrics." }, { role: "user", content: prompt }] }), signal: AbortSignal.timeout(20000) });
    if (!aiResponse.ok) {
      const body = await aiResponse.text();
      console.error("[product-radar] Groq error", aiResponse.status, body.slice(0, 500));
      return res.status(200).json({ ...trends, aiConfigured: true, opportunities: [], aiError: "تعذر إنشاء التحليل الذكي الآن. بيانات الاتجاهات المباشرة متاحة أعلاه." });
    }
    const payload: any = await aiResponse.json();
    const content = String(payload?.choices?.[0]?.message?.content || "");
    let parsed: any = null;
    try { parsed = JSON.parse(content.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "")); } catch { parsed = null; }
    const knownTitles = new Set(trends.items.map((item) => item.title));
    const opportunities = Array.isArray(parsed?.opportunities) ? parsed.opportunities.slice(0, 8).map((x: any) => ({ name: String(x.name || "").slice(0, 120), why: String(x.why || "").slice(0, 500), relatedTrend: String(x.relatedTrend || ""), risk: String(x.risk || "").slice(0, 300), confidence: x.confidence === "medium" ? "medium" : "low", evidence: Array.isArray(x.evidence) ? x.evidence.filter((v: unknown) => typeof v === "string" && knownTitles.has(v)).slice(0, 4) : [] })).filter((x: any) => x.name && knownTitles.has(x.relatedTrend) && x.evidence.length) : [];
    return res.status(200).json({ ...trends, aiConfigured: true, model, opportunities });
  } catch (error) {
    console.error("[product-radar] source failure", error);
    return res.status(502).json({ error: "live_source_unavailable", message: "تعذر الوصول إلى مصدر Google Trends الآن. لن نعرض بيانات تجريبية مكان البيانات الحقيقية." });
  }
}
