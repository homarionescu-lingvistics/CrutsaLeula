export function extractSearchTermsFromOcr(text: string): string[] {
  const lines = text
    .split(/\r?\n|[|;,]/)
    .map((line) => line.replace(/[^a-zA-Z0-9ăâîșțĂÂÎȘȚ\s.%]/g, " ").replace(/\s+/g, " ").trim())
    .filter((line) => line.length >= 3);

  const terms = new Set<string>();
  for (const line of lines) {
    terms.add(line.toLowerCase());
    for (const word of line.split(/\s+/)) {
      if (word.length >= 4) terms.add(word.toLowerCase());
    }
  }

  return Array.from(terms).slice(0, 8);
}

export async function runOcrOnImageFile(file: File): Promise<string> {
  const { createWorker } = await import("tesseract.js");
  const worker = await createWorker("ron+eng");
  try {
    const { data } = await worker.recognize(file);
    return data.text ?? "";
  } finally {
    await worker.terminate();
  }
}
