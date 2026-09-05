import { getGeminiModel } from "@/lib/ai/gemini";

const PRODUCT_PROMPT = `Analizează imaginea de produs (raft / ambalaj) din România.
Clasifică brandul după criteriul Cardtip (ProductScoreCard Tip 1–5):

1 = „moartea țării” — produs dăunător / fără legătură cu economia locală productivă
2 = „vinzi la străini” — brand străin FĂRĂ fabrică, producție sau salarii relevante în România (import pur / retail străin)
3 = „mulți bani rămân pe glie” (GALBEN) — acționariat străin SAU brand internațional, DAR fabrica, producția și/sau salariile sunt în România (ex: Mărgăritar — fabrică RO → Tip 3, NU Tip 2)
4 = „măcar banii finali ajung pe glie” — majoritar românesc (producție + lanț local), retenție RON ~60–80%
5 = „libertatea țării” — brand/companie românească cu retenție ~100%

Reguli stricte:
- Dacă fabrica/producția/salariile sunt în RO → minim Tip 3 (galben), chiar dacă acționariatul e străin. Nu marca Tip 2.
- Tip 2 doar când banii pleacă aproape integral în afară, fără amprentă productivă RO.

Răspunde STRICT JSON fără markdown:
{"brand":"Nume","pret":null,"categorie_tip":3,"procent_retentie_ron":40,"cui":null,"este_romanesc":true,"motiv":"explicație scurtă"}
pret = număr dacă apare pe etichetă, altfel null. categorie_tip = 1|2|3|4|5.`;

const RECEIPT_PROMPT = `Analizează bonul fiscal românesc din imagine.
Extrage magazinul, adresa (dacă apare), data bonului, suma totală și lista produselor cu prețuri.

Răspunde STRICT JSON fără markdown:
{"magazin":"Nume magazin","adresa":"stradă / localitate sau null","data_bon":"YYYY-MM-DD","total":12.34,"produse":[{"nume":"Produs","pret":1.23}],"este_chioc_local":false}

Reguli:
- data_bon: citește data tipărită pe bon (nu data de azi). Folosește format YYYY-MM-DD.
- este_chioc_local: true doar dacă pare chioșc / magazin de cartier / MF / abonament local FĂRĂ lanț corporatist (nu Mega Image, Kaufland, Profi, Lidl, Auchan, Penny etc.).
- magazin: denumirea exactă de pe bon (ex: "MEGA IMAGE", "LA COCOȘ", "CHIOSC RAHOVA").`;

export type CardTip = 1 | 2 | 3 | 4 | 5;

export type ProductScanResult = {
  brand: string;
  pret: number | null;
  categorie_tip: CardTip;
  procent_retentie_ron: number | null;
  cui: string | null;
  este_romanesc: boolean;
  motiv: string | null;
};

export type ReceiptProduct = {
  nume: string;
  pret?: number;
};

export type ReceiptScanResult = {
  magazin: string;
  adresa: string | null;
  data_bon: string | null;
  total: number;
  produse: ReceiptProduct[];
  este_chioc_local: boolean;
};

export function parseGeminiJson<T>(raw: string): T {
  let text = raw.trim();
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) text = fence[1].trim();

  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start >= 0 && end > start) {
    text = text.slice(start, end + 1);
  }

  return JSON.parse(text) as T;
}

function normalizeTip(value: unknown): CardTip {
  const n = Number(value);
  if (n === 1 || n === 2 || n === 3 || n === 4 || n === 5) return n;
  return 2;
}

async function geminiGenerateFromImage(
  systemInstruction: string,
  imageBase64: string,
  mimeType: string
): Promise<string> {
  const model = getGeminiModel();
  const safeMime =
    mimeType === "image/png" || mimeType === "image/webp" || mimeType === "image/gif"
      ? mimeType
      : "image/jpeg";

  try {
    const result = await model.generateContent([
      { text: systemInstruction },
      { inlineData: { mimeType: safeMime, data: imageBase64 } },
    ]);
    const text = result.response.text()?.trim() ?? "";
    if (!text) throw new Error("Gemini nu a returnat un răspuns.");
    return text;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (/404|Not Found/i.test(message)) {
      throw new Error(
        "Modelul Gemini nu este disponibil. Verifică GEMINI_API_KEY / GEMINI_MODEL."
      );
    }
    if (/quota|rate|429|resource.exhausted|high demand/i.test(message)) {
      throw new Error("GEMINI_BUSY");
    }
    throw new Error(`Eroare Gemini: ${message.slice(0, 180)}`);
  }
}

export async function geminiScanProduct(
  imageBase64: string,
  mimeType: string
): Promise<ProductScanResult> {
  const raw = await geminiGenerateFromImage(PRODUCT_PROMPT, imageBase64, mimeType);
  const parsed = parseGeminiJson<{
    brand?: string;
    pret?: number | string | null;
    categorie_tip?: number;
    procent_retentie_ron?: number | string | null;
    cui?: string | null;
    este_romanesc?: boolean;
    motiv?: string | null;
  }>(raw);

  const brand = String(parsed.brand ?? "").trim().replace(/^["']|["']$/g, "");
  if (!brand) throw new Error("Nu am identificat un brand.");

  const pretRaw = parsed.pret;
  const pretValue =
    pretRaw == null || pretRaw === ""
      ? null
      : typeof pretRaw === "number"
        ? pretRaw
        : Number(String(pretRaw).replace(",", "."));

  const retRaw = parsed.procent_retentie_ron;
  const retValue =
    retRaw == null || retRaw === ""
      ? null
      : typeof retRaw === "number"
        ? retRaw
        : Number(String(retRaw).replace(",", "."));

  const categorie_tip = normalizeTip(parsed.categorie_tip);
  const este_romanesc =
    parsed.este_romanesc != null
      ? Boolean(parsed.este_romanesc)
      : categorie_tip >= 3;

  return {
    brand,
    pret:
      pretValue != null && Number.isFinite(pretValue) && pretValue > 0 ? pretValue : null,
    categorie_tip,
    procent_retentie_ron:
      retValue != null && Number.isFinite(retValue)
        ? Math.min(100, Math.max(0, Math.round(retValue)))
        : null,
    cui: parsed.cui ? String(parsed.cui).trim() : null,
    este_romanesc,
    motiv: parsed.motiv ? String(parsed.motiv).trim() : null,
  };
}

export async function geminiScanReceipt(
  imageBase64: string,
  mimeType: string
): Promise<ReceiptScanResult> {
  const raw = await geminiGenerateFromImage(RECEIPT_PROMPT, imageBase64, mimeType);
  const parsed = parseGeminiJson<{
    magazin?: string;
    adresa?: string | null;
    data_bon?: string | null;
    total?: number | string;
    produse?: Array<{ nume?: string; pret?: number | string }>;
    este_chioc_local?: boolean;
  }>(raw);

  const magazin = String(parsed.magazin ?? "Magazin").trim();
  const total =
    typeof parsed.total === "number"
      ? parsed.total
      : Number(String(parsed.total ?? "").replace(",", "."));

  if (!Number.isFinite(total) || total <= 0) {
    throw new Error("Nu am extras suma totală din bon.");
  }

  const produse: ReceiptProduct[] = [];
  for (const item of parsed.produse ?? []) {
    const nume = String(item.nume ?? "").trim();
    if (!nume) continue;
    const pretRaw = item.pret;
    const pretValue =
      pretRaw == null
        ? undefined
        : typeof pretRaw === "number"
          ? pretRaw
          : Number(String(pretRaw).replace(",", "."));
    produse.push({
      nume,
      pret:
        pretValue != null && Number.isFinite(pretValue) && pretValue > 0
          ? pretValue
          : undefined,
    });
  }

  const dataBon = parsed.data_bon ? String(parsed.data_bon).trim() : null;

  return {
    magazin,
    adresa: parsed.adresa ? String(parsed.adresa).trim() : null,
    data_bon: dataBon,
    total,
    produse,
    este_chioc_local: Boolean(parsed.este_chioc_local),
  };
}

export function buildReceiptText(
  magazin: string,
  total: number,
  produse: ReceiptProduct[] = [],
  dataBon?: string | null,
  adresa?: string | null
): string {
  const dateLabel = dataBon?.trim() || new Date().toLocaleDateString("ro-RO");
  const productLines =
    produse.length > 0
      ? produse.map((p, index) => {
          const price = p.pret != null ? ` - ${p.pret.toFixed(2)} Lei` : "";
          return `Articol ${index + 1}: ${p.nume}${price}`;
        })
      : ["Articol 1"];

  const lines = [`Magazin: ${magazin}`];
  if (adresa) lines.push(`Adresa: ${adresa}`);
  lines.push(...productLines, `Data: ${dateLabel}`, `Suma Totală: ${total.toFixed(2)}`);
  return lines.join("\n");
}
