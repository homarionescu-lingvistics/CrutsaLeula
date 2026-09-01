"use server";

import { getSessionUser } from "@/lib/auth/session";
import { isKioskReceipt, KIOSK_RECEIPT_BONUS } from "@/lib/piata/receipt-ocr";
import { bumpTrust } from "@/lib/scofaluta/points";

export async function applyKioskReceiptBonus(ocrText: string): Promise<{
  applied: boolean;
  message: string;
}> {
  if (!isKioskReceipt(ocrText)) {
    return { applied: false, message: "Bonul nu pare a fi de chioșc mic (fără coduri de bare)." };
  }

  const user = await getSessionUser();
  if (!user) {
    return { applied: false, message: "Autentifică-te ca să primești punctele Koson." };
  }

  await bumpTrust(user.id, KIOSK_RECEIPT_BONUS);
  return {
    applied: true,
    message: `+${KIOSK_RECEIPT_BONUS} puncte Koson — susținere adaos comercial românesc local.`,
  };
}
