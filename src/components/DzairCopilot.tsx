import { useState, type FormEvent } from "react";
import { Bot, Send, Sparkles, UserRound, AlertCircle } from "lucide-react";
import { supabase } from "@/lib/supabase";

type Message = { role: "assistant" | "user"; content: string };
export default function DzairCopilot({ language, storeId }: { language: "ar" | "fr"; storeId: string }) {
  const fr = language === "fr";
  const [messages, setMessages] = useState<Message[]>([{ role: "assistant", content: fr ? "Bonjour ! Je suis Dzair Copilot. Je peux analyser les données disponibles de votre boutique et proposer des actions. Que souhaitez-vous savoir ?" : "مرحبًا! أنا Dzair Copilot. أستطيع تحليل بيانات متجرك المتاحة واقتراح خطوات عملية. بماذا أساعدك؟" }]);
  const [question, setQuestion] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const suggestions = fr ? ["Analyse mes commandes récentes", "Comment améliorer mes fiches produits ?", "Aide-moi à calculer une marge rentable"] : ["حلّل طلباتي الأخيرة", "كيف أحسّن صفحات المنتجات؟", "ساعدني في حساب هامش ربح مناسب"];
  async function send(e?: FormEvent, preset?: string) {
    e?.preventDefault(); const prompt = (preset ?? question).trim(); if (!prompt || busy) return;
    setMessages((old) => [...old, { role: "user", content: prompt }]); setQuestion(""); setBusy(true); setError("");
    try {
      const { data, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !data.session?.access_token) throw new Error(fr ? "Session expirée. Reconnectez-vous." : "انتهت الجلسة، أعد تسجيل الدخول.");
      const response = await fetch("/api/dzair-copilot", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${data.session.access_token}` }, body: JSON.stringify({ question: prompt, storeId }) });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.message || (fr ? "Le copilote n’a pas pu répondre. Vérifiez GROQ_API_KEY sur Vercel." : "تعذر على المساعد الإجابة. تحقق من GROQ_API_KEY في Vercel."));
      setMessages((old) => [...old, { role: "assistant", content: result.answer }]);
    } catch (err) { setError(err instanceof Error ? err.message : String(err)); }
    finally { setBusy(false); }
  }
  return <div className="ab-content copilot-page"><header className="copilot-hero"><div className="copilot-icon"><Bot size={27}/></div><div><span className="ab-kicker">DZAIR AI · GROQ</span><h2>{fr ? "Votre assistant de boutique" : "مساعد متجرك الذكي"}</h2><p>{fr ? "Réponses fondées sur les données de votre boutique, avec respect des autorisations. Le copilote conseille, il ne modifie rien à votre place." : "إجابات مبنية على بيانات متجرك مع احترام الصلاحيات. المساعد يقدم المشورة ولا يغيّر شيئًا بدلًا عنك."}</p></div></header>
    <div className="copilot-chat" aria-live="polite">{messages.map((m, i) => <article className={`copilot-message ${m.role}`} key={`${m.role}-${i}`}><span className="copilot-avatar">{m.role === "assistant" ? <Sparkles size={17}/> : <UserRound size={17}/>}</span><div><b>{m.role === "assistant" ? "Dzair Copilot" : (fr ? "Vous" : "أنت")}</b><p>{m.content}</p></div></article>)}{busy && <div className="copilot-loading"><span/> <span/> <span/>{fr ? "Analyse des données…" : "جارٍ تحليل البيانات…"}</div>}{error && <div className="copilot-error"><AlertCircle size={17}/>{error}</div>}</div>
    {messages.length <= 1 && <div className="copilot-suggestions">{suggestions.map((s) => <button key={s} type="button" onClick={() => void send(undefined, s)} disabled={busy}>{s}</button>)}</div>}
    <form className="copilot-composer" onSubmit={(e) => void send(e)}><textarea value={question} onChange={(e) => setQuestion(e.target.value)} placeholder={fr ? "Posez une question sur votre boutique…" : "اسأل عن متجرك أو مبيعاتك أو منتجاتك…"} rows={2} maxLength={1500}/><button type="submit" disabled={busy || !question.trim()}><Send size={17}/>{fr ? "Envoyer" : "إرسال"}</button></form>
    <p className="copilot-disclaimer">{fr ? "Les réponses IA peuvent contenir des erreurs. Vérifiez les chiffres dans le tableau de bord. Les clés API restent côté serveur." : "قد تخطئ إجابات الذكاء الاصطناعي؛ راجع الأرقام من لوحة التحكم. مفاتيح API محفوظة على الخادم."}</p></div>;
}
