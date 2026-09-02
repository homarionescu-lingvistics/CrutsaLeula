import { GoogleGenerativeAI } from "@google/generative-ai";

const DEFAULT_MODEL = "gemini-3.5-flash";

const PRODUCT_PROMPT =
  "Analizează imaginea de produs de pe raft sau ambalaj. Răspunde STRICT JSON fără markdown: {\"brand\":\"Nume brand\",\"pret\":null,\"este_romanesc\":true}. pret este număr dacă apare pe etichetă, altfel null. este_romanesc este true dacă brandul/produsul pare românesc, altfel false.";

const RECEIPT_PROMPT =
  "Analizează bonul fiscal românesc din imagine. Extrage magazinul, suma totală plătită și lista produselor. Răspunde STRICT JSON fără markdown: {\"magazin\":\"Nume\",\"total\":12.34,\"produse\":[{\"nume\":\"Produs\",\"pret\":1.23}]}.";

export type ProductScanResult = {
  brand: string;
  pret: number | null;
  este_romanesc: boolean;
};

export type ReceiptProduct = {
  nume: string;
  pret?: number;
};

export type ReceiptScanResult = {
  magazin: string;
  total: number;
  produse: ReceiptProduct[];
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

function getGeminiModel(systemInstruction: string) {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("SERVER_AI_UNAVAILABLE");
  }

  const modelName = process.env.GEMINI_MODEL?.trim() || DEFAULT_MODEL;
  const genAI = new GoogleGenerativeAI(apiKey);
  return genAI.getGenerativeModel({ model: modelName, systemInstruction });
}

export async function geminiScanProduct(
  imageBase64: string,
  mimeType: string
): Promise<ProductScanResult> {
  const model = getGeminiModel(PRODUCT_PROMPT);
  const result = await model.generateContent([
    { inlineData: { data: imageBase64, mimeType } },
  ]);
  const parsed = parseGeminiJson<{
    brand?: string;
    pret?: number | string | null;
    este_romanesc?: boolean;
  }>(result.response.text());

  const brand = String(parsed.brand ?? "").trim().replace(/^["']|["']$/g, "");
  if (!brand) throw new Error("Nu am identificat un brand.");

  const pretRaw = parsed.pret;
  const pretValue =
    pretRaw == null || pretRaw === ""
      ? null
      : typeof pretRaw === "number"
        ? pretRaw
        : Number(String(pretRaw).replace(",", "."));

  return {
    brand,
    pret:
      pretValue != null && Number.isFinite(pretValue) && pretValue > 0 ? pretValue : null,
    este_romanesc: Boolean(parsed.este_romanesc),
  };
}

export async function geminiScanReceipt(
  imageBase64: string,
  mimeType: string
): Promise<ReceiptScanResult> {
  const model = getGeminiModel(RECEIPT_PROMPT);
  const result = await model.generateContent([
    { inlineData: { data: imageBase64, mimeType } },
  ]);
  const parsed = parseGeminiJson<{
    magazin?: string;
    total?: number | string;
    produse?: Array<{ nume?: string; pret?: number | string }>;
  }>(result.response.text());

  const magazin = String(parsed.magazin ?? "Chioșc").trim();
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

  return { magazin, total, produse };
}

export function buildReceiptText(
  magazin: string,
  total: number,
  produse: ReceiptProduct[] = []
): string {
  const today = new Date().toLocaleDateString("ro-RO");
  const productLines =
    produse.length > 0
      ? produse.map((p, index) => {
          const price = p.pret != null ? ` - ${p.pret.toFixed(2)} Lei` : "";
          return `Articol ${index + 1}: ${p.nume}${price}`;
        })
      : ["Articol 1"];

  return [`Magazin: ${magazin}`, ...productLines, `Data: ${today}`, `Suma Totală: ${total.toFixed(2)}`].join(
    "\n"
  );
}
