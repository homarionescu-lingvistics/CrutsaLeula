export const KIOSK_RECEIPT_BONUS = 20;

/** Retaileri / branduri cu amprentă locală — primesc Kosoni. */
export const LOCAL_RETAIL_WHITELIST = [
  "Carrefour",
  "Supermarket La Cocoș",
  "Annabella",
  "Unicarm",
  "Diana",
  "Senic",
  "Supeco",
  "Amigo",
  "Intercost",
  "Elan Trio",
  "Paco",
  "Global Cash & Carry",
  "Sergiana",
  "Simpa",
  "Ovisim",
  "Freshful",
  "Bricolaj",
  "Dedeman",
  "Mathaus",
  "Ambient",
  "Brick",
  "Agroland",
  "eMAG",
  "Emag",
  "Altex",
  "Flanco",
  "F64",
  "PC Garage",
  "Catena",
  "Tei",
  "Ana Maria",
  "Dona",
  "Ropharma",
  "Evofarm",
  "Minifarm",
  "Musette",
  "Benvenuti",
  "Marelbo",
  "Anna Cori",
  "Il Passo",
  "Otter",
  "Jolidon",
  "Nissa",
  "Teilor",
  "Sabrini",
  "Cărturești",
  "Cupio",
  "Rifco",
  "Vinexpert",
  "Oscar Downstream",
  "Arabesque",
  "Romstal",
  "Baurom",
  "Moldmetal",
  "Biofarm",
  "Antibiotice Iași",
  "Terapia Cluj",
  "Zentiva",
  "Allview",
  "Țiriac Auto",
  "Radacini",
  "Romgaz",
  "Hidroelectrica",
  "RBC Gaz",
] as const;

/** Lanțuri corporatiste — fără puncte Koson. */
export const CORPORATE_RETAIL_BLACKLIST = [
  "Mega Image",
  "MegaImage",
  "Kaufland",
  "Profi",
  "Lidl",
  "Auchan",
  "Penny",
  "Penny Market",
  "Shop&Go",
  "Shop and Go",
  "Cora",
  "Metro Cash",
  "Selgros",
] as const;

function stripDiacritics(value: string): string {
  return value
    .replace(/[ăâ]/g, "a")
    .replace(/[ĂÂ]/g, "A")
    .replace(/[îí]/g, "i")
    .replace(/[ÎÍ]/g, "I")
    .replace(/[șş]/g, "s")
    .replace(/[ȘŞ]/g, "S")
    .replace(/[țţ]/g, "t")
    .replace(/[ȚŢ]/g, "T")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export function normalizeStoreName(value: string): string {
  return stripDiacritics(value)
    .toLowerCase()
    .replace(/[^a-z0-9&+\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function matchesList(storeName: string, list: readonly string[]): boolean {
  const normalized = normalizeStoreName(storeName);
  if (!normalized) return false;
  return list.some((entry) => {
    const needle = normalizeStoreName(entry);
    return needle.length > 0 && (normalized.includes(needle) || needle.includes(normalized));
  });
}

export function isBlacklistedRetailer(storeName: string): boolean {
  return matchesList(storeName, CORPORATE_RETAIL_BLACKLIST);
}

export function isWhitelistedRetailer(storeName: string): boolean {
  return matchesList(storeName, LOCAL_RETAIL_WHITELIST);
}

/** Chioșc / magazin de cartier fără denumire de corporație. */
export function isLocalKioskStore(storeName: string, geminiLocalFlag?: boolean): boolean {
  if (isBlacklistedRetailer(storeName)) return false;
  if (isWhitelistedRetailer(storeName)) return false;
  if (geminiLocalFlag) return true;

  const n = normalizeStoreName(storeName);
  return /chioc|chiosc|magazin(ul)?\s+(de\s+)?cartier|minimarket|abac|\bmf\b|la\s+nea|la\s+tant|alimentara|cooperativa/.test(
    n
  );
}

export function isEligibleForKosonBonus(
  storeName: string,
  options?: { geminiLocalFlag?: boolean }
): boolean {
  if (isBlacklistedRetailer(storeName)) return false;
  if (isWhitelistedRetailer(storeName)) return true;
  return isLocalKioskStore(storeName, options?.geminiLocalFlag);
}

/** Parsează data bonului (YYYY-MM-DD sau format RO). */
export function parseReceiptDate(raw: string | null | undefined): Date | null {
  if (!raw?.trim()) return null;
  const text = raw.trim();

  const iso = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) {
    const d = new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));
    return Number.isNaN(d.getTime()) ? null : d;
  }

  const ro = text.match(/(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})/);
  if (ro) {
    let year = Number(ro[3]);
    if (year < 100) year += 2000;
    const d = new Date(year, Number(ro[2]) - 1, Number(ro[1]));
    return Number.isNaN(d.getTime()) ? null : d;
  }

  return null;
}

export function todayInBucharest(): { y: number; m: number; d: number; label: string } {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Bucharest",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const y = Number(parts.find((p) => p.type === "year")?.value);
  const m = Number(parts.find((p) => p.type === "month")?.value);
  const d = Number(parts.find((p) => p.type === "day")?.value);
  return { y, m, d, label: `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}` };
}

export function isReceiptDateToday(raw: string | null | undefined): boolean {
  const parsed = parseReceiptDate(raw);
  if (!parsed) return false;
  const today = todayInBucharest();
  return (
    parsed.getFullYear() === today.y &&
    parsed.getMonth() + 1 === today.m &&
    parsed.getDate() === today.d
  );
}

/** Legacy helper — text OCR vechi (fără Gemini). */
export function isKioskReceipt(ocrText: string): boolean {
  const text = ocrText.trim();
  if (text.length < 12) return false;

  const magazinMatch = text.match(/magazin\s*:\s*(.+)/i);
  const storeName = magazinMatch?.[1]?.split("\n")[0]?.trim() ?? "";
  if (storeName && isBlacklistedRetailer(storeName)) return false;
  if (storeName && (isWhitelistedRetailer(storeName) || isLocalKioskStore(storeName))) {
    return true;
  }

  const hasTotal = /(suma\s*total[aă]?|total)\s*:?\s*[\d.,]+/i.test(text);
  const hasDate = /\d{1,2}[./-]\d{1,2}[./-]\d{2,4}/.test(text);
  return hasTotal && hasDate && /chioc|chiosc|cartier|articol\s*\d+/i.test(text);
}
