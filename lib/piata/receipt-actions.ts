"use server";

import { createClient } from "@supabase/supabase-js";
import { getSessionUser } from "@/lib/auth/session";
import type { ReceiptProduct } from "@/lib/piata/gemini-scan";
import {
  isEligibleForKosonBonus,
  isReceiptDateToday,
  KIOSK_RECEIPT_BONUS,
  parseReceiptDate,
  todayInBucharest,
} from "@/lib/piata/receipt-ocr";

export type ReceiptBonusPayload = {
  magazin: string;
  adresa?: string | null;
  total: number;
  dataBon?: string | null;
  produse?: ReceiptProduct[];
  esteChiocLocal?: boolean;
  rawText?: string;
};

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("SUPABASE_SERVICE_ROLE_KEY lipsește");
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

async function creditKoson(userId: string, amount: number, description: string) {
  const admin = getServiceClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("koson_balance")
    .eq("id", userId)
    .maybeSingle();

  const current = Number(profile?.koson_balance ?? 0);
  await admin
    .from("profiles")
    .update({ koson_balance: current + amount })
    .eq("id", userId);

  await admin.from("koson_transactions").insert({
    user_id: userId,
    amount,
    description,
  });
}

async function saveScannedReceipt(input: {
  userId: string | null;
  magazin: string;
  adresa: string | null;
  total: number;
  dataBon: string | null;
  produse: ReceiptProduct[];
  pointsAwarded: number;
  eligible: boolean;
  rejectionReason: string | null;
  rawText: string | null;
}) {
  const admin = getServiceClient();
  const parsed = parseReceiptDate(input.dataBon);
  const receiptDate = parsed
    ? `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, "0")}-${String(parsed.getDate()).padStart(2, "0")}`
    : null;

  const { error } = await admin.from("scanned_receipts").insert({
    user_id: input.userId,
    store_name: input.magazin,
    store_address: input.adresa,
    total: input.total,
    receipt_date: receiptDate,
    products: input.produse,
    points_awarded: input.pointsAwarded,
    eligible: input.eligible,
    rejection_reason: input.rejectionReason,
    raw_text: input.rawText,
  });

  if (error) throw error;
}

export async function applyReceiptScanBonus(payload: ReceiptBonusPayload): Promise<{
  applied: boolean;
  saved: boolean;
  message: string;
}> {
  const magazin = payload.magazin.trim();
  const total = Number(payload.total);
  const produse = payload.produse ?? [];
  const adresa = payload.adresa?.trim() || null;
  const dataBon = payload.dataBon?.trim() || null;

  if (!magazin || !Number.isFinite(total) || total <= 0) {
    return { applied: false, saved: false, message: "Completează magazinul și suma totală." };
  }

  const user = await getSessionUser();
  const storeEligible = isEligibleForKosonBonus(magazin, {
    geminiLocalFlag: payload.esteChiocLocal,
  });
  const dateOk = isReceiptDateToday(dataBon);
  const today = todayInBucharest().label;

  let points = 0;
  let rejectionReason: string | null = null;
  let message: string;

  if (!storeEligible) {
    rejectionReason = "retailer_neeligibil";
    message =
      "Bon salvat. Acest magazin nu primește puncte Koson (lanț corporatist / neeligibil).";
  } else if (!dateOk) {
    rejectionReason = dataBon ? "data_diferita" : "data_lipsa";
    message = dataBon
      ? `Bon salvat (data bonului: ${dataBon}). Punctele se acordă doar pentru bonuri din ziua fotografierii (${today}).`
      : `Bon salvat. Nu am putut citi data de pe bon — fără puncte Koson (azi: ${today}).`;
  } else if (!user) {
    rejectionReason = "neautentificat";
    message = "Bon salvat. Autentifică-te ca să primești punctele Koson.";
  } else {
    points = KIOSK_RECEIPT_BONUS;
    message = `+${KIOSK_RECEIPT_BONUS} puncte Koson — susținere retail / chioșc cu amprentă locală.`;
  }

  let saved = false;
  try {
    await saveScannedReceipt({
      userId: user?.id ?? null,
      magazin,
      adresa,
      total,
      dataBon,
      produse,
      pointsAwarded: points,
      eligible: Boolean(storeEligible && dateOk && user),
      rejectionReason,
      rawText: payload.rawText ?? null,
    });
    saved = true;
  } catch {
    message =
      "Nu am putut salva bonul. Rulează migrarea scanned_receipts în Supabase, apoi reîncearcă.";
    return { applied: false, saved: false, message };
  }

  if (points > 0 && user) {
    try {
      await creditKoson(user.id, points, `Bon ${magazin} — ${total.toFixed(2)} Lei`);
      return { applied: true, saved, message };
    } catch {
      return {
        applied: false,
        saved,
        message: "Bon salvat, dar creditarea Koson a eșuat. Încearcă din nou.",
      };
    }
  }

  return { applied: false, saved, message };
}

/** Compatibilitate UI vechi — parsează textul generat. */
export async function applyKioskReceiptBonus(ocrText: string): Promise<{
  applied: boolean;
  message: string;
}> {
  const text = ocrText.trim();
  const magazin = text.match(/magazin\s*:\s*(.+)/i)?.[1]?.split("\n")[0]?.trim() ?? "";
  const adresa = text.match(/adresa\s*:\s*(.+)/i)?.[1]?.split("\n")[0]?.trim() ?? null;
  const totalRaw = text.match(/suma\s*total[aă]?\s*:\s*([\d.,]+)/i)?.[1];
  const total = totalRaw ? Number(totalRaw.replace(",", ".")) : NaN;
  const dataBon = text.match(/data\s*:\s*([^\n]+)/i)?.[1]?.trim() ?? null;

  const produse: ReceiptProduct[] = [];
  for (const line of text.split("\n")) {
    const m = line.match(/articol\s*\d+\s*:\s*(.+?)(?:\s*-\s*([\d.,]+)\s*lei)?$/i);
    if (!m) continue;
    const pret = m[2] ? Number(m[2].replace(",", ".")) : undefined;
    produse.push({
      nume: m[1].trim(),
      pret: pret != null && Number.isFinite(pret) ? pret : undefined,
    });
  }

  const result = await applyReceiptScanBonus({
    magazin,
    adresa,
    total: Number.isFinite(total) ? total : 0,
    dataBon,
    produse,
    rawText: text,
  });

  return { applied: result.applied, message: result.message };
}
