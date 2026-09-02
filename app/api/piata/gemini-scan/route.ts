import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

const PRODUCT_PROMPT =
  "Ești un asistent de scanare pentru aplicația Cruțănomia. Analizează această imagine de la raft sau de pe ambalaj. Identifică brandul principal sau numele produsului din imagine. Întoarce-mi STRICT un singur cuvânt sau o expresie scurtă reprezentând brandul (Ex: 'Elmas', 'Mărgăritar', 'Alpro'). Nu adăuga nicio introducere, nuanță sau punctuație suplimentară.";

const RECEIPT_PROMPT =
  "Analizează acest bon fiscal românesc. Extrage din el numele magazinului și Suma Totală platită. Întoarce textul STRICT sub formatul JSON: {'magazin': 'Nume', 'total': valoare_numerică}. Dacă este un bon generic de chioșc fără produse clare, extrage doar totalul.";

type ScanBody = {
  mode?: "product" | "receipt";
  imageBase64?: string;
  mimeType?: string;
};

function parseGeminiJson<T>(raw: string): T {
  const cleaned = raw.replace(/```json/gi, "").replace(/```/g, "").trim();
  const normalized = cleaned.replace(/'/g, '"');
  return JSON.parse(normalized) as T;
}

export async function POST(request: Request) {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    return NextResponse.json({ error: "Serviciul de scanare nu este configurat." }, { status: 503 });
  }

  let body: ScanBody;
  try {
    body = (await request.json()) as ScanBody;
  } catch {
    return NextResponse.json({ error: "Cerere invalidă." }, { status: 400 });
  }

  const { mode, imageBase64, mimeType = "image/jpeg" } = body;
  if (!mode || !imageBase64) {
    return NextResponse.json({ error: "Lipsesc datele imaginii." }, { status: 400 });
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const imagePart = {
    inlineData: { data: imageBase64, mimeType },
  };

  try {
    if (mode === "product") {
      const model = genAI.getGenerativeModel({
        model: "gemini-1.5-flash",
        systemInstruction: PRODUCT_PROMPT,
      });
      const result = await model.generateContent([imagePart]);
      const brand = result.response.text().trim().replace(/^["']|["']$/g, "");
      if (!brand) {
        return NextResponse.json({ error: "Nu am identificat un brand." }, { status: 422 });
      }
      return NextResponse.json({ brand });
    }

    if (mode === "receipt") {
      const model = genAI.getGenerativeModel({
        model: "gemini-1.5-flash",
        systemInstruction: RECEIPT_PROMPT,
      });
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
        return NextResponse.json({ error: "Nu am extras suma totală din bon." }, { status: 422 });
      }
      return NextResponse.json({ magazin, total });
    }

    return NextResponse.json({ error: "Mod scanare necunoscut." }, { status: 400 });
  } catch {
    return NextResponse.json({ error: "Scanarea a eșuat." }, { status: 500 });
  }
}
