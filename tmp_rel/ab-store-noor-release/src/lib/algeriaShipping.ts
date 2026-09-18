/** 58 wilayas + simple default shipping (home / desk) */
export type Wilaya = { code: number; nameAr: string; nameFr: string; zone: "north" | "high" | "south" };

export const WILAYAS: Wilaya[] = [
  { code: 1, nameAr: "أدرار", nameFr: "Adrar", zone: "south" },
  { code: 2, nameAr: "الشلف", nameFr: "Chlef", zone: "north" },
  { code: 3, nameAr: "الأغواط", nameFr: "Laghouat", zone: "high" },
  { code: 4, nameAr: "أم البواقي", nameFr: "Oum El Bouaghi", zone: "high" },
  { code: 5, nameAr: "باتنة", nameFr: "Batna", zone: "high" },
  { code: 6, nameAr: "بجاية", nameFr: "Béjaïa", zone: "north" },
  { code: 7, nameAr: "بسكرة", nameFr: "Biskra", zone: "south" },
  { code: 8, nameAr: "بشار", nameFr: "Béchar", zone: "south" },
  { code: 9, nameAr: "البليدة", nameFr: "Blida", zone: "north" },
  { code: 10, nameAr: "البويرة", nameFr: "Bouira", zone: "north" },
  { code: 11, nameAr: "تمنراست", nameFr: "Tamanrasset", zone: "south" },
  { code: 12, nameAr: "تبسة", nameFr: "Tébessa", zone: "high" },
  { code: 13, nameAr: "تلمسان", nameFr: "Tlemcen", zone: "north" },
  { code: 14, nameAr: "تيارت", nameFr: "Tiaret", zone: "high" },
  { code: 15, nameAr: "تيزي وزو", nameFr: "Tizi Ouzou", zone: "north" },
  { code: 16, nameAr: "الجزائر", nameFr: "Alger", zone: "north" },
  { code: 17, nameAr: "الجلفة", nameFr: "Djelfa", zone: "high" },
  { code: 18, nameAr: "جيجل", nameFr: "Jijel", zone: "north" },
  { code: 19, nameAr: "سطيف", nameFr: "Sétif", zone: "high" },
  { code: 20, nameAr: "سعيدة", nameFr: "Saïda", zone: "high" },
  { code: 21, nameAr: "سكيكدة", nameFr: "Skikda", zone: "north" },
  { code: 22, nameAr: "سيدي بلعباس", nameFr: "Sidi Bel Abbès", zone: "north" },
  { code: 23, nameAr: "عنابة", nameFr: "Annaba", zone: "north" },
  { code: 24, nameAr: "قالمة", nameFr: "Guelma", zone: "north" },
  { code: 25, nameAr: "قسنطينة", nameFr: "Constantine", zone: "north" },
  { code: 26, nameAr: "المدية", nameFr: "Médéa", zone: "north" },
  { code: 27, nameAr: "مستغانم", nameFr: "Mostaganem", zone: "north" },
  { code: 28, nameAr: "المسيلة", nameFr: "M'Sila", zone: "high" },
  { code: 29, nameAr: "معسكر", nameFr: "Mascara", zone: "north" },
  { code: 30, nameAr: "ورقلة", nameFr: "Ouargla", zone: "south" },
  { code: 31, nameAr: "وهران", nameFr: "Oran", zone: "north" },
  { code: 32, nameAr: "البيض", nameFr: "El Bayadh", zone: "south" },
  { code: 33, nameAr: "إليزي", nameFr: "Illizi", zone: "south" },
  { code: 34, nameAr: "برج بوعريريج", nameFr: "Bordj Bou Arréridj", zone: "high" },
  { code: 35, nameAr: "بومرداس", nameFr: "Boumerdès", zone: "north" },
  { code: 36, nameAr: "الطارف", nameFr: "El Tarf", zone: "north" },
  { code: 37, nameAr: "تندوف", nameFr: "Tindouf", zone: "south" },
  { code: 38, nameAr: "تيسمسيلت", nameFr: "Tissemsilt", zone: "high" },
  { code: 39, nameAr: "الوادي", nameFr: "El Oued", zone: "south" },
  { code: 40, nameAr: "خنشلة", nameFr: "Khenchela", zone: "high" },
  { code: 41, nameAr: "سوق أهراس", nameFr: "Souk Ahras", zone: "high" },
  { code: 42, nameAr: "تيبازة", nameFr: "Tipaza", zone: "north" },
  { code: 43, nameAr: "ميلة", nameFr: "Mila", zone: "north" },
  { code: 44, nameAr: "عين الدفلى", nameFr: "Aïn Defla", zone: "north" },
  { code: 45, nameAr: "النعامة", nameFr: "Naâma", zone: "south" },
  { code: 46, nameAr: "عين تموشنت", nameFr: "Aïn Témouchent", zone: "north" },
  { code: 47, nameAr: "غرداية", nameFr: "Ghardaïa", zone: "south" },
  { code: 48, nameAr: "غليزان", nameFr: "Relizane", zone: "north" },
  { code: 49, nameAr: "تيميمون", nameFr: "Timimoun", zone: "south" },
  { code: 50, nameAr: "برج باجي مختار", nameFr: "Bordj Badji Mokhtar", zone: "south" },
  { code: 51, nameAr: "أولاد جلال", nameFr: "Ouled Djellal", zone: "south" },
  { code: 52, nameAr: "بني عباس", nameFr: "Béni Abbès", zone: "south" },
  { code: 53, nameAr: "عين صالح", nameFr: "In Salah", zone: "south" },
  { code: 54, nameAr: "عين قزام", nameFr: "In Guezzam", zone: "south" },
  { code: 55, nameAr: "تقرت", nameFr: "Touggourt", zone: "south" },
  { code: 56, nameAr: "جانت", nameFr: "Djanet", zone: "south" },
  { code: 57, nameAr: "المغير", nameFr: "El M'Ghair", zone: "south" },
  { code: 58, nameAr: "المنيعة", nameFr: "El Meniaa", zone: "south" },
];

/** Default platform rates — merchant can override later */
const ZONE_RATES = {
  north: { home: 500, desk: 350 },
  high: { home: 700, desk: 500 },
  south: { home: 1000, desk: 800 },
} as const;

export function shippingFee(wilayaCode: number, delivery: "home" | "desk"): number {
  const w = WILAYAS.find((x) => x.code === wilayaCode);
  const zone = w?.zone || "high";
  return ZONE_RATES[zone][delivery];
}
