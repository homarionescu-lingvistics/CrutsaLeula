import { GoogleGenerativeAI } from "@google/generative-ai";

export const GEMINI_KEY_STORAGE = "user_gemini_key";

const PRODUCT_PROMPT =
  "Ești un asistent de scanare pentru aplicația Cruțănomia. Analizează această imagine de la raft sau de pe ambalaj. Identifică brandul principal sau numele produsului din imagine. Întoarce-mi STRICT un singur cuvânt sau o expresie scurtă reprezentând brandul (Ex: 'Elmas', 'Mărgăritar', 'Alpro'). Nu adăuga nicio introducere, nuanță sau punctuație suplimentară.";

const RECEIPT_PROMPT =
  "Analizează acest bon fiscal românesc. Extrage din el numele magazinului și Suma Totală platită. Întoarce textul STRICT sub formatul JSON: {'magazin': 'Nume', 'total': valoare_numerică}. Dacă este un bon generic de chioșc fără produse clare, extrage doar totalul.";

export function getStoredGeminiKey(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(GEMINI_KEY_STORAGE) ?? "";
}

export function setStoredGeminiKey(key: string): void {
  localStorage.setItem(GEMINI_KEY_STORAGE, key.trim());
}

async function fileToImagePart(file: File) {
  const base64 = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      resolve(dataUrl.split(",")[1] ?? "");
    };
    reader.onerror = () => reject(new Error("Nu am putut citi imaginea."));
    reader.readAsDataURL(file);
  });

  return {
    inlineData: {
      data: base64,
      mimeType: file.type || "image/jpeg",
    },
  };
}

function requireApiKey(apiKey: string): string {
  const trimmed = apiKey.trim();
  if (!trimmed) {
    throw new Error("Adaugă cheia API Gemini în setările de mai sus.");
  }
  return trimmed;
}

function parseGeminiJson<T>(raw: string): T {
  const cleaned = raw
    .replace(/```json/gi, "")
    .replace(/```/g, "")
    .trim();
  const normalized = cleaned.replace(/'/g, '"');
  return JSON.parse(normalized) as T;
}

export async function geminiIdentifyProductBrand(
  file: File,
  apiKey: string
): Promise<string> {
  const genAI = new GoogleGenerativeAI(requireApiKey(apiKey));
  const model = genAI.getGenerativeModel({
    model: "gemini-1.5-flash",
    systemInstruction: PRODUCT_PROMPT,
  });
  const imagePart = await fileToImagePart(file);
  const result = await model.generateContent([imagePart]);
  const brand = result.response.text().trim().replace(/^["']|["']$/g, "");
  if (!brand) throw new Error("Gemini nu a identificat un brand.");
  return brand;
}

export type GeminiReceiptResult = {
  magazin: string;
  total: number;
};

export async function geminiParseReceipt(
  file: File,
  apiKey: string
): Promise<GeminiReceiptResult> {
  const genAI = new GoogleGenerativeAI(requireApiKey(apiKey));
  const model = genAI.getGenerativeModel({
    model: "gemini-1.5-flash",
    systemInstruction: RECEIPT_PROMPT,
  });
  const imagePart = await fileToImagePart(file);
  const result = await model.generateContent([imagePart]);
  const parsed = parseGeminiJson<{ magazin?: string; total?: number | string }>(
    result.response.text()
  );
  const magazin = String(parsed.magazin ?? "Chioșc").trim();
  const total =
    typeof parsed.total === "number"
      ? parsed.total
      : Number(String(parsed.total ?? "").replace(",", "."));
  if (!Number.isFinite(total) || total <= 0) {
    throw new Error("Gemini nu a extras suma totală din bon.");
  }
  return { magazin, total };
}

export function buildKioskReceiptText(magazin: string, total: number): string {
  const today = new Date().toLocaleDateString("ro-RO");
  return `Magazin: ${magazin}\nArticol 1\nData: ${today}\nSuma Totală: ${total.toFixed(2)}`;
}
