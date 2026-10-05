import { Link } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, FileText, ShieldCheck } from "lucide-react";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { getLanguage } from "@/i18n";

export type LegalSection = { title: string; paragraphs: string[]; bullets?: string[] };

type Props = {
  kind: "privacy" | "terms";
  title: string;
  intro: string;
  updated: string;
  sections: LegalSection[];
};

export function LegalPage({ kind, title, intro, updated, sections }: Props) {
  const language = getLanguage();
  const isFr = language === "fr";
  const back = isFr ? "Retour à l’accueil" : "العودة إلى الصفحة الرئيسية";
  const privacy = isFr ? "Politique de confidentialité" : "سياسة الخصوصية";
  const terms = isFr ? "Conditions d’utilisation" : "شروط الاستخدام";
  const icon = kind === "privacy" ? <ShieldCheck size={18} /> : <FileText size={18} />;

  return (
    <main className="min-h-screen bg-[#f6faf8] text-[#10231c]" dir={isFr ? "ltr" : "rtl"}>
      <header className="sticky top-0 z-20 border-b border-black/5 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-5 py-4">
          <Link to="/" className="flex items-center gap-2 font-extrabold no-underline text-[#10231c]">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#0d8b57] text-white"><ShieldCheck size={18} /></span>
            Dzair Store
          </Link>
          <div className="flex items-center gap-3">
            <LanguageSwitcher />
            <Link to="/" className="hidden items-center gap-1 rounded-lg border border-black/10 px-3 py-2 text-sm font-semibold sm:flex no-underline text-[#10231c]">
              {isFr ? <ArrowLeft size={15} /> : <ArrowRight size={15} />}{back}
            </Link>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-4xl px-5 py-10 sm:py-14">
        <div className="mb-8 rounded-3xl bg-[#0c1b16] p-7 text-white sm:p-10">
          <div className="mb-3 flex items-center gap-2 text-sm font-bold text-[#8ee8bc]">{icon}{kind === "privacy" ? privacy : terms}</div>
          <h1 className="m-0 text-3xl font-black sm:text-4xl">{title}</h1>
          <p className="mt-4 max-w-3xl text-base leading-8 text-[#c9d8d2]">{intro}</p>
          <p className="mt-4 text-xs text-[#93aaa1]">{updated}</p>
        </div>

        <article className="space-y-5">
          {sections.map((section) => (
            <section key={section.title} className="rounded-2xl border border-black/5 bg-white p-6 shadow-sm sm:p-7">
              <h2 className="mt-0 text-xl font-extrabold">{section.title}</h2>
              {section.paragraphs.map((p, i) => <p key={i} className="leading-8 text-[#40534c]">{p}</p>)}
              {section.bullets?.length ? <ul className="mt-3 list-disc space-y-2 ps-6 leading-7 text-[#40534c]">{section.bullets.map((b) => <li key={b}>{b}</li>)}</ul> : null}
            </section>
          ))}
        </article>

        <footer className="mt-10 flex flex-wrap items-center justify-between gap-4 border-t border-black/10 pt-6 text-sm text-[#60736c]">
          <span>© {new Date().getFullYear()} Dzair Store</span>
          <nav className="flex gap-4">
            <Link to="/privacy" className="underline underline-offset-4">{privacy}</Link>
            <Link to="/terms" className="underline underline-offset-4">{terms}</Link>
          </nav>
        </footer>
      </div>
    </main>
  );
}
