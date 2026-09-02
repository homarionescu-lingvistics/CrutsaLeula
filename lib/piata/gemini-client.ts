export type GeminiReceiptResult = {
  magazin: string;
  total: number;
};

async function fileToBase64(file: File): Promise<{ imageBase64: string; mimeType: string }> {
  const imageBase64 = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      resolve(dataUrl.split(",")[1] ?? "");
    };
    reader.onerror = () => reject(new Error("Nu am putut citi imaginea."));
    reader.readAsDataURL(file);
  });

  return { imageBase64, mimeType: file.type || "image/jpeg" };
}

async function postGeminiScan<T>(body: Record<string, unknown>): Promise<T> {
  const res = await fetch("/api/piata/gemini-scan", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = (await res.json()) as T & { error?: string };
  if (!res.ok) {
    throw new Error(data.error ?? "Scanarea a eșuat.");
  }
  return data;
}

export async function geminiIdentifyProductBrand(file: File): Promise<string> {
  const { imageBase64, mimeType } = await fileToBase64(file);
  const data = await postGeminiScan<{ brand: string }>({
    mode: "product",
    imageBase64,
    mimeType,
  });
  return data.brand;
}

export async function geminiParseReceipt(file: File): Promise<GeminiReceiptResult> {
  const { imageBase64, mimeType } = await fileToBase64(file);
  return postGeminiScan<GeminiReceiptResult>({
    mode: "receipt",
    imageBase64,
    mimeType,
  });
}

export function buildKioskReceiptText(magazin: string, total: number): string {
  const today = new Date().toLocaleDateString("ro-RO");
  return `Magazin: ${magazin}\nArticol 1\nData: ${today}\nSuma Totală: ${total.toFixed(2)}`;
}
