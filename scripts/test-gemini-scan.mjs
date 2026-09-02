import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

process.env.GEMINI_API_KEY = fs
  .readFileSync(path.join(__dirname, "../.env.local"), "utf8")
  .match(/GEMINI_API_KEY=(.+)/)?.[1]
  ?.trim();

const { geminiScanProduct, geminiScanReceipt } = await import("../lib/piata/gemini-scan.ts");

const productB64 = fs.readFileSync(path.join(__dirname, "../WhatsApp Image Produs.jpeg")).toString("base64");
const receiptB64 = fs.readFileSync(path.join(__dirname, "../WhatsApp Image BON.jpeg")).toString("base64");

console.log("=== PRODUS ===");
const product = await geminiScanProduct(productB64, "image/jpeg");
console.log(JSON.stringify(product, null, 2));

console.log("=== BON ===");
const receipt = await geminiScanReceipt(receiptB64, "image/jpeg");
console.log(JSON.stringify(receipt, null, 2));
