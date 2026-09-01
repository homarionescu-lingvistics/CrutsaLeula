const EAN_PATTERN = /\b\d{8,13}\b/;

export function isKioskReceipt(ocrText: string): boolean {
  const text = ocrText.trim();
  if (text.length < 20) return false;

  const hasGenericArticle = /articol\s*\d+/i.test(text);
  const hasTotal = /(suma\s*total[aă]?|total)\s*:?\s*[\d.,]+/i.test(text);
  const hasDate = /\d{1,2}[./-]\d{1,2}[./-]\d{2,4}/.test(text);
  const lacksBarcode = !EAN_PATTERN.test(text);

  return hasGenericArticle && hasTotal && hasDate && lacksBarcode;
}

export const KIOSK_RECEIPT_BONUS = 20;
