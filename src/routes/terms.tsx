import { createFileRoute } from "@tanstack/react-router";
import { getLanguage } from "@/i18n";
import { LegalPage, type LegalSection } from "@/components/LegalPage";

export const Route = createFileRoute("/terms")({
  head: () => ({ meta: [
    { title: "شروط الاستخدام | Dzair Store" },
    { name: "description", content: "شروط استخدام منصة Dzair Store للتجار والزبائن." },
  ] }),
  component: Terms,
});

function Terms() {
  const fr = getLanguage() === "fr";
  const sections: LegalSection[] = fr ? [
    { title: "1. Objet", paragraphs: ["Dzair Store fournit des outils permettant aux commerçants de créer une boutique en ligne, présenter leurs produits, recevoir des commandes et gérer leur activité depuis un tableau de bord."] },
    { title: "2. Compte et sécurité", paragraphs: ["Le titulaire du compte est responsable de l’exactitude des informations fournies et de la protection de ses identifiants. Les privilèges d’administration sont réservés aux comptes autorisés par la plateforme."] },
    { title: "3. Utilisation de la boutique", paragraphs: ["Le commerçant est responsable des produits, prix, descriptions, images, coordonnées, promotions et contenus qu’il publie, ainsi que de la conformité de son activité aux lois et règles applicables."] },
    { title: "4. Commandes et clients", paragraphs: ["Le commerçant est responsable de la confirmation, de la préparation, de l’expédition et du service après-vente de ses commandes. Dzair Store fournit les outils de gestion mais n’est pas le vendeur des produits publiés par les commerçants."] },
    { title: "5. WhatsApp et transporteurs", paragraphs: ["Certaines fonctions utilisent WhatsApp ou des intégrations de livraison. La disponibilité et les conditions de ces services peuvent dépendre des fournisseurs externes. Les fonctions annoncées comme « bientôt » ne sont pas garanties comme disponibles."] },
    { title: "6. Formules et paiements", paragraphs: ["La plateforme propose actuellement une formule gratuite et des formules payantes selon les fonctionnalités publiées sur la page des tarifs. Les paiements d’abonnement peuvent faire l’objet d’une vérification manuelle. L’activation d’un forfait payant n’est effective qu’après validation par la plateforme."] },
    { title: "7. Frais et commissions", paragraphs: ["Les conditions tarifaires affichées au moment de l’abonnement s’appliquent à la formule choisie. Les plans actuellement publiés n’appliquent pas de commission sur les ventes, sauf modification clairement annoncée des tarifs."] },
    { title: "8. Contenus interdits et abus", paragraphs: ["Il est interdit d’utiliser la plateforme pour des activités illégales, frauduleuses, trompeuses, abusives ou portant atteinte aux droits d’autrui. Dzair Store peut limiter ou suspendre un compte lorsqu’une mesure de sécurité ou de conformité est nécessaire."] },
    { title: "9. Disponibilité et modifications", paragraphs: ["La plateforme peut évoluer, être temporairement indisponible pour maintenance ou voir certaines fonctions modifiées. Les fonctionnalités futures ne constituent pas une promesse de disponibilité à une date déterminée."] },
    { title: "10. Données et confidentialité", paragraphs: ["Le traitement des données est décrit dans la Politique de confidentialité de Dzair Store, qui fait partie intégrante des règles d’utilisation de la plateforme."] },
    { title: "11. Contact et litiges", paragraphs: ["Toute demande concernant le compte, la boutique, les commandes ou les données doit être adressée par les moyens de contact disponibles sur la plateforme. Les obligations légales applicables demeurent prioritaires."] },
  ] : [
    { title: "1. الهدف", paragraphs: ["توفر Dzair Store أدوات تمكّن التجار من إنشاء متجر إلكتروني، عرض المنتجات، استقبال الطلبات وإدارة النشاط من لوحة تحكم."] },
    { title: "2. الحساب والأمان", paragraphs: ["يتحمل صاحب الحساب مسؤولية صحة المعلومات التي يقدمها وحماية بيانات الدخول. وتقتصر صلاحيات الإدارة العليا على الحسابات المصرح لها من طرف المنصة."] },
    { title: "3. استخدام المتجر", paragraphs: ["التاجر مسؤول عن المنتجات والأسعار والأوصاف والصور وبيانات التواصل والعروض والمحتوى الذي ينشره، وعن توافق نشاطه مع القوانين والقواعد المطبقة."] },
    { title: "4. الطلبات والزبائن", paragraphs: ["التاجر مسؤول عن تأكيد الطلبات وتجهيزها وشحنها وخدمة ما بعد البيع. توفر Dzair Store أدوات الإدارة، لكنها ليست البائع للمنتجات التي ينشرها التجار."] },
    { title: "5. واتساب وشركات التوصيل", paragraphs: ["تستخدم بعض الوظائف واتساب أو تكاملات مع شركات التوصيل. وقد تعتمد إتاحة هذه الخدمات وشروطها على مزودين خارجيين. والوظائف التي تحمل عبارة «قريبًا» ليست مضمونة التوفر حاليًا."] },
    { title: "6. الباقات والمدفوعات", paragraphs: ["توفر المنصة حاليًا باقة مجانية وباقات مدفوعة بحسب المزايا المنشورة في صفحة الأسعار. وقد تخضع مدفوعات الاشتراك للمراجعة اليدوية، ولا يصبح الاشتراك المدفوع فعالًا إلا بعد اعتماد المنصة."] },
    { title: "7. الرسوم والعمولات", paragraphs: ["تطبق الأسعار المعروضة وقت الاشتراك على الباقة المختارة. والباقات المنشورة حاليًا لا تفرض عمولة على المبيعات، إلا إذا تم تغيير الأسعار والإعلان عن ذلك بوضوح."] },
    { title: "8. المحتوى الممنوع وإساءة الاستخدام", paragraphs: ["يُمنع استخدام المنصة في أنشطة غير قانونية أو احتيالية أو مضللة أو مسيئة أو تنتهك حقوق الآخرين. ويمكن لـ Dzair Store تقييد أو تعليق الحساب عند الحاجة لأسباب أمنية أو تنظيمية."] },
    { title: "9. توفر المنصة والتعديلات", paragraphs: ["قد تتطور المنصة أو تتوقف مؤقتًا للصيانة أو تتغير بعض وظائفها. ولا تشكل المزايا المعلن عنها بأنها «قريبًا» وعدًا بتوفرها في تاريخ محدد."] },
    { title: "10. البيانات والخصوصية", paragraphs: ["توضح سياسة الخصوصية الخاصة بـ Dzair Store كيفية معالجة البيانات، وتعتبر جزءًا من قواعد استخدام المنصة."] },
    { title: "11. التواصل والنزاعات", paragraphs: ["يجب إرسال الطلبات المتعلقة بالحساب أو المتجر أو الطلبات أو البيانات عبر وسائل التواصل المتاحة في المنصة. وتبقى الالتزامات القانونية المطبقة هي المرجع الأساسي."] },
  ];
  return <LegalPage kind="terms" title={fr ? "Conditions d’utilisation" : "شروط الاستخدام"} intro={fr ? "Ces conditions présentent les règles principales d’utilisation de Dzair Store pour les commerçants et les clients." : "توضح هذه الشروط القواعد الأساسية لاستخدام Dzair Store من طرف التجار والزبائن."} updated={fr ? "Dernière mise à jour : 5 octobre 2026" : "آخر تحديث: 5 أكتوبر 2026"} sections={sections} />;
}
