import { useMemo, useState } from "react";
import { Bookmark, ExternalLink, PackageSearch, Search, ShieldCheck, Store, Users } from "lucide-react";

type Lang = "ar" | "fr";
type Supplier = { id: string; name: string; description: string; category: string; categoryFr: string; telegram?: string; members?: number; location?: string };

// Annuaire source: https://ilyesderradji.com/telegram_channels/ (consulté le 2026-10-10).
// Les compteurs sont des instantanés observés et les fournisseurs ne sont pas certifiés par Dzair Store.
const suppliers: Supplier[] = [
  { id: "special-bag", name: "Special bag", description: "حقائب يد نسائية للبيع بالجملة.", category: "حقائب يد", categoryFr: "Sacs à main", telegram: "https://t.me/+QDOlzWUd3cY4OGY8", members: 1513 },
  { id: "elhana-phon", name: "Elhana_Phon", description: "إكسسوارات الهواتف ولواحقها.", category: "ملحقات الهواتف", categoryFr: "Accessoires téléphones", telegram: "https://t.me/elhanaphon40", members: 392 },
  { id: "max-phone-eulma", name: "MAX PHONE EL EULMA", description: "إكسسوارات الهواتف للبيع بالجملة ونصف الجملة.", category: "ملحقات الهواتف", categoryFr: "Accessoires téléphones", telegram: "https://t.me/MAXPHONE19ELEULMA", members: 1352, location: "العلمة" },
  { id: "max-phone", name: "MAX PHONE", description: "إكسسوارات الهواتف بالجملة.", category: "ملحقات الهواتف", categoryFr: "Accessoires téléphones", telegram: "https://t.me/+meaWt3Ndko0wNjFk", members: 1274 },
  { id: "women-accessories", name: "ساعات وإكسسوارات نساء (العلمة)", description: "منتجات الساعات وإكسسوارات النساء بالجملة من العلمة.", category: "ساعات", categoryFr: "Montres", telegram: "https://t.me/Z_7_0_K", members: 2487, location: "العلمة" },
  { id: "safir-gros", name: "safir gros", description: "توفير منتجات حسب الطلب؛ القناة تذكر حدًا أدنى للطلب أكثر من 15,000 دج.", category: "كل المنتوجات", categoryFr: "Produits variés", telegram: "https://t.me/safirgroseleulma", members: 37962, location: "العلمة" },
  { id: "riadou", name: "زووم العلمة", description: "قناة عامة ضمن سوق العلمة وعروض الجملة.", category: "كل المنتوجات", categoryFr: "Produits variés", telegram: "https://t.me/Riadou1", members: 7309, location: "العلمة" },
  { id: "groupe-tsh", name: "Groupe Tsh", description: "قناة جملة عامة لمتابعة العروض والمنتجات.", category: "كل المنتوجات", categoryFr: "Produits variés", telegram: "https://t.me/tshjomla123", members: 45078 },
  { id: "eleulma-market", name: "سوق العلمة لتحطيم الأسعار", description: "قناة عامة تركز على أسعار وعروض سوق العلمة.", category: "كل المنتوجات", categoryFr: "Produits variés", telegram: "https://t.me/Eleulma_Market", members: 8770, location: "العلمة" },
  { id: "dziri-gros", name: "Dziri Gros المنتجات الرابحة", description: "منتجات رائجة ومصادر للجملة والتجارة الإلكترونية.", category: "كل المنتوجات", categoryFr: "Produits variés", telegram: "https://t.me/dzirigros", members: 27118 },
  { id: "sa3ti", name: "Sa3ti", description: "بيع الساعات اليدوية بالجملة.", category: "ساعات", categoryFr: "Montres", telegram: "https://t.me/sa3tiofficiel", members: 49145 },
  { id: "phoenix-eulma", name: "Phoenix eulma", description: "قناة عروض جملة متنوعة من سوق العلمة.", category: "كل المنتوجات", categoryFr: "Produits variés", telegram: "https://t.me/Phoenix_eulma", members: 22543, location: "العلمة" },
  { id: "eulmiz-import", name: "Eulmiz العلميز Import", description: "سلع متنوعة بالجملة وعروض تجارية يومية.", category: "كل المنتوجات", categoryFr: "Produits variés", telegram: "https://t.me/eulmiz", members: 14216 },
  { id: "alliance-fragrance", name: "Alliance Fragrance", description: "عطور زيتية بالجملة.", category: "عطور", categoryFr: "Parfums", telegram: "https://t.me/alliance_fragrance", members: 7917 },
  { id: "accessoires-phone-dz", name: "Accessoires Phone Dz", description: "إكسسوارات الهاتف النقال بالجملة.", category: "ملحقات الهواتف", categoryFr: "Accessoires téléphones", telegram: "https://t.me/acc_phone", members: 4813 },
  { id: "az-accessories-mobile", name: "AZ Accessories Mobile", description: "ملحقات هواتف بالجملة من بلفور.", category: "ملحقات الهواتف", categoryFr: "Accessoires téléphones", telegram: "https://t.me/azbelfort", location: "بلفور" },
  { id: "nova-marche", name: "Nova Marché", description: "منتجات متنوعة لاكتشاف عروض وأسعار مختلفة.", category: "كل المنتوجات", categoryFr: "Produits variés", telegram: "https://t.me/laghoua", members: 11336 },
  { id: "el-mlkey-gros", name: "الملكي للجملة - العلمة", description: "منتجات مطلوبة في سوق الجملة الإلكتروني.", category: "كل المنتوجات", categoryFr: "Produits variés", telegram: "https://t.me/el_mlkey_gros_eleulma", members: 32876, location: "العلمة" },
  { id: "cadeau-decoration", name: "GIVAT Déco", description: "هدايا وديكور وتغليف بالجملة؛ القناة تعلن التوصيل إلى الولايات.", category: "ديكور وهدايا", categoryFr: "Déco & cadeaux", telegram: "https://t.me/topcadeaudz", members: 39189, location: "العلمة" },
  { id: "ayoub-gros", name: "الجملة العلمة ayoub", description: "تجارة متنوعة وبيع منتجات بالجملة.", category: "كل المنتوجات", categoryFr: "Produits variés", telegram: "https://t.me/ayoubkhabab", members: 44842, location: "العلمة" },
  { id: "alm-galaxy", name: "ALM GALAXY", description: "إكسسوارات الهواتف بالجملة ونصف الجملة.", category: "ملحقات الهواتف", categoryFr: "Accessoires téléphones", telegram: "https://t.me/almgalaxy", members: 11233, location: "بلفور" },
  { id: "souq-eulma-remote", name: "سوق العلمة عن بعد", description: "توفير السلع بالجملة عن بعد مع شحن وتوصيل معلن لكل الولايات.", category: "كل المنتوجات", categoryFr: "Produits variés", telegram: "https://t.me/eulma_grosist", members: 12771, location: "العلمة" },
  { id: "eldjawd-phone", name: "الجودة فون", description: "أنواع مختلفة من إكسسوارات الهواتف بالجملة.", category: "ملحقات الهواتف", categoryFr: "Accessoires téléphones", telegram: "https://t.me/eldjawd", members: 3213, location: "بلفور" },
  { id: "mrigla35", name: "MRIGLA 35", description: "ساعات يدوية بالجملة.", category: "ساعات", categoryFr: "Montres", telegram: "https://t.me/mrigla35", members: 51247 },
  { id: "bilal-slides", name: "Bilal slides", description: "أحذية رياضية ونعال بالجملة؛ القناة تذكر التوصيل إلى 58 ولاية.", category: "أحذية ونعال", categoryFr: "Chaussures & claquettes", telegram: "https://t.me/bilalslidess", members: 18074 },
  { id: "el-raid-perfumes", name: "El Raid Perfumes", description: "بيع العطور بالجملة مع توصيل معلن.", category: "عطور", categoryFr: "Parfums", telegram: "https://t.me/elraid_parfum", members: 12995 },
  { id: "bks-electronic", name: "BKS ELECTRONIC GROS", description: "إكسسوارات الهواتف بالجملة.", category: "ملحقات الهواتف", categoryFr: "Accessoires téléphones", telegram: "https://t.me/bkselectronic", members: 8075 },
  { id: "raid-gros", name: "الرائد للبيع بالجملة", description: "بيع سلع بالجملة مع توصيل معلن؛ مقر معلن بالحميز.", category: "كل المنتوجات", categoryFr: "Produits variés", telegram: "https://t.me/raidgros", members: 32149 },
  { id: "school-supplies-eulma", name: "العلمة للجملة أدوات مدرسية", description: "قناة متخصصة في أدوات مدرسية ومنتجات بالجملة.", category: "أدوات مدرسية", categoryFr: "Fournitures scolaires", telegram: "https://t.me/Jibelna", members: 9228, location: "العلمة" },
  { id: "stip-accessories", name: "Stip accessories", description: "إكسسوارات الهواتف بالجملة.", category: "ملحقات الهواتف", categoryFr: "Accessoires téléphones", telegram: "https://t.me/houssamtelecom", members: 4655 },
  { id: "ht-belfort", name: "HT BELFORT GROS", description: "إكسسوارات الهواتف بالجملة من سوق بلفور.", category: "ملحقات الهواتف", categoryFr: "Accessoires téléphones", telegram: "https://t.me/HTbelfortdz", members: 13509, location: "بلفور" },
  { id: "freres-phone", name: "FRERES PHONE الإخوة للهواتف", description: "بيع إكسسوارات الهواتف النقالة بالجملة.", category: "ملحقات الهواتف", categoryFr: "Accessoires téléphones", telegram: "https://t.me/freresphonebelfort", members: 7575, location: "بلفور" },
  { id: "el-rayees", name: "EL RAYEES", description: "مصدر متنوع لمن يريد بدء التجارة الإلكترونية.", category: "كل المنتوجات", categoryFr: "Produits variés", telegram: "https://t.me/ElrayessShop", members: 16944 },
  { id: "eulma-biznassa", name: "العلمة لبيع السلع بالجملة بزناسة", description: "توفير سلع بالجملة؛ القناة تعرض معلومات التواصل والطلب.", category: "كل المنتوجات", categoryFr: "Produits variés", telegram: "https://t.me/eleulmashop213", members: 90847, location: "العلمة" },
  { id: "amel-lova", name: "AMEL LOVA SHOP", description: "قناة عامة لمنتجات التجارة الإلكترونية والجملة.", category: "كل المنتوجات", categoryFr: "Produits variés", telegram: "https://t.me/Amelecommerce", members: 4549, location: "العلمة" },
  { id: "codinaf", name: "CODINAF El EULMA", description: "لوازم الرضع وملابس الأطفال بالجملة.", category: "ملابس أطفال", categoryFr: "Vêtements enfants", telegram: "https://t.me/codinaf19", members: 20997, location: "العلمة" },
  { id: "eulma-sourcing", name: "العلمة الجملة Sourcing", description: "توفير سلع بالجملة ومصادر للمنتجات.", category: "كل المنتوجات", categoryFr: "Produits variés", telegram: "https://t.me/jouda2016", members: 53004, location: "العلمة" },
  { id: "el-eulma-shop", name: "El-eulma Shop", description: "بيع أنواع مختلفة من السلع بالجملة.", category: "كل المنتوجات", categoryFr: "Produits variés", telegram: "https://t.me/eleulmashopsa", members: 24236, location: "العلمة" },
  { id: "hm-gros", name: "HM GROS", description: "تجارة منتجات متنوعة بالجملة من العلمة.", category: "كل المنتوجات", categoryFr: "Produits variés", telegram: "https://t.me/HMgroupe19", members: 14681, location: "العلمة" },
  { id: "eulma-original", name: "العلمة الأصيل للجملة فقط", description: "مصدر عام لمنتجات متنوعة بالجملة؛ تحقق من الحد الأدنى حسب المنتج.", category: "كل المنتوجات", categoryFr: "Produits variés", telegram: "https://t.me/eleulmagrow", members: 41003, location: "العلمة" },
  { id: "tony-phone", name: "Tony Phone", description: "مدرج في الدليل الأصلي ضمن ملحقات الهواتف، لكن المصدر لا يعرض رابط تيليغرام مباشرًا حاليًا.", category: "ملحقات الهواتف", categoryFr: "Accessoires téléphones" },
  { id: "mdl-phone-gros", name: "MDL phone gros", description: "إكسسوارات الهواتف بالجملة مع توصيل معلن.", category: "ملحقات الهواتف", categoryFr: "Accessoires téléphones", telegram: "https://t.me/MDLGROS16", members: 25369, location: "بلفور" },
  { id: "bl-phone-gros", name: "BL phone gros", description: "إكسسوارات الهواتف بالجملة؛ القناة تعلن التوصيل إلى 58 ولاية.", category: "ملحقات الهواتف", categoryFr: "Accessoires téléphones", telegram: "https://t.me/blphonegros", members: 4876 },
];
const SOURCE_URL = "https://ilyesderradji.com/telegram_channels/";

export default function WholesaleDirectory({ language }: { language: Lang }) {
  const fr = language === "fr";
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [savedOnly, setSavedOnly] = useState(false);
  const [saved, setSaved] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem("dzair-wholesale-saved") || "[]") as string[]; } catch { return []; }
  });
  const categories = [...new Set(suppliers.map((s) => fr ? s.categoryFr : s.category))];
  const visible = useMemo(() => suppliers.filter((s) => {
    const text = `${s.name} ${s.description} ${s.category} ${s.categoryFr} ${s.location || ""}`.toLowerCase();
    return text.includes(query.toLowerCase()) && (category === "all" || (fr ? s.categoryFr : s.category) === category) && (!savedOnly || saved.includes(s.id));
  }), [query, category, savedOnly, saved, fr]);
  const toggleSaved = (id: string) => setSaved((current) => {
    const next = current.includes(id) ? current.filter((x) => x !== id) : [...current, id];
    try { localStorage.setItem("dzair-wholesale-saved", JSON.stringify(next)); } catch { /* storage can be disabled */ }
    return next;
  });
  const fmt = (n: number) => new Intl.NumberFormat(fr ? "fr-DZ" : "ar-DZ").format(n);
  return <div className="ab-content wholesale-page" dir={fr ? "ltr" : "rtl"}>
    <header className="wholesale-hero"><div><span className="wholesale-kicker"><PackageSearch size={15}/>{fr ? "RÉSEAU FOURNISSEURS ALGÉRIE" : "شبكة موردي الجزائر"}</span><h2>{fr ? "Annuaire des grossistes" : "دليل تجار الجملة"}</h2><p>{fr ? "Trouvez des fournisseurs Telegram par catégorie, ouvrez leur canal et gardez vos favoris à portée de main." : "اكتشف موردي الجملة عبر تيليغرام حسب التخصص، افتح القنوات مباشرة واحفظ المفضلة للعودة إليها."}</p><small><ShieldCheck size={14}/>{fr ? "Liens publics · vérifiez prix, stock et conditions avant paiement." : "روابط عامة · تحقّق من الأسعار والمخزون والشروط قبل الدفع."}</small></div><div className="wholesale-hero-icon"><Store size={34}/></div></header>
    <div className="wholesale-stats"><div><strong>{suppliers.length}</strong><span>{fr ? "Canaux répertoriés" : "قناة مدرجة"}</span></div><div><strong>{categories.length}</strong><span>{fr ? "Catégories" : "تخصصات"}</span></div><div><strong>{saved.length}</strong><span>{fr ? "Favoris" : "المفضلة"}</span></div></div>
    <div className="wholesale-notice">{fr ? "43 entrées reprises du répertoire public consulté le 10/10/2026, réparties selon ses 9 catégories. Dzair Store n'est affilié à aucun fournisseur et ne garantit ni les offres ni les transactions. Les abonnés sont des instantanés indicatifs." : "تم إدراج القنوات الـ43 من الدليل العام الذي تمت مراجعته يوم 10/10/2026، ضمن تصنيفاته التسعة. Dzair Store غير تابع لأي مورد ولا يضمن العروض أو المعاملات. أعداد المشتركين لقطات تقريبية قابلة للتغيير."}</div>
    <div className="wholesale-toolbar"><label className="wholesale-search"><Search size={17}/><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={fr ? "Rechercher un fournisseur ou produit…" : "ابحث عن مورد أو منتج…"}/></label><select value={category} onChange={(e) => setCategory(e.target.value)}><option value="all">{fr ? "Toutes les catégories" : "كل التخصصات"}</option>{categories.map((c) => <option key={c} value={c}>{c}</option>)}</select><button type="button" className={`wholesale-filter ${savedOnly ? "active" : ""}`} onClick={() => setSavedOnly((v) => !v)}><Bookmark size={15}/>{fr ? "Favoris" : "المفضلة"}</button></div>
    {visible.length ? <div className="wholesale-grid">{visible.map((s) => <article className="wholesale-card" key={s.id}><div className="wholesale-card-top"><span className="wholesale-card-icon"><Store size={19}/></span><button type="button" className={`wholesale-save ${saved.includes(s.id) ? "saved" : ""}`} aria-label={saved.includes(s.id) ? (fr ? "Retirer des favoris" : "إزالة من المفضلة") : (fr ? "Ajouter aux favoris" : "إضافة للمفضلة")} onClick={() => toggleSaved(s.id)}><Bookmark size={17} fill={saved.includes(s.id) ? "currentColor" : "none"}/></button></div><h3>{s.name}</h3><p>{s.description}</p><div className="wholesale-meta"><span>{fr ? s.categoryFr : s.category}</span>{s.location && <span>{s.location}</span>}</div>{typeof s.members === "number" && <div className="wholesale-members"><Users size={14}/>{fmt(s.members)} {fr ? "abonnés (dernier relevé)" : "مشترك (آخر رصد)"}</div>}{s.telegram ? <a className="wholesale-open" href={s.telegram} target="_blank" rel="noopener noreferrer">{fr ? "Ouvrir sur Telegram" : "فتح قناة تيليغرام"}<ExternalLink size={15}/></a> : <a className="wholesale-open" href={SOURCE_URL} target="_blank" rel="noopener noreferrer">{fr ? "Lien Telegram indisponible · voir la source" : "رابط تيليغرام غير متاح · راجع المصدر"}<ExternalLink size={15}/></a>}</article>)}</div> : <div className="wholesale-empty">{fr ? "Aucun fournisseur ne correspond à ces filtres." : "لا يوجد مورد مطابق لهذه الفلاتر."}</div>}
    <footer className="wholesale-footer">{fr ? "Vous connaissez un fournisseur fiable ? L'ajout de fournisseurs avec validation et signalement sera disponible dans une prochaine version." : "تعرف موردًا موثوقًا؟ ستتوفر إضافة الموردين مع المراجعة والإبلاغ عن الروابط في إصدار لاحق."} <a href={SOURCE_URL} target="_blank" rel="noopener noreferrer">{fr ? "Voir la source consultée" : "عرض المصدر الذي تمت مراجعته"}<ExternalLink size={13}/></a></footer>
  </div>;
}
