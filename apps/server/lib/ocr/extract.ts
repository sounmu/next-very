import { GoogleGenAI, Type, type Schema } from "@google/genai";
import { isUnit, type ExtractResult, type Preset, type Unit } from "@marginlog/core";
import sharp from "sharp";
import { z } from "zod";

const TIMEOUT_MS = 8000;
/** Alias used by the @google/genai 2.32 README examples; override with GEMINI_MODEL. */
const DEFAULT_GEMINI_MODEL = "gemini-flash-latest";

const PROMPT = [
  "This photo is a Korean supplier invoice or receipt (거래명세서, 영수증, 주문내역). Read it and return JSON only.",
  "supplier: the supplier (seller) name exactly as printed.",
  "date: the purchase date as YYYY-MM-DD.",
  "items: one entry per printed row. rawName is the item name exactly as printed; do not rename, translate or normalize it.",
  "packSize and packUnit: the size of one pack as printed, e.g. 10kg -> 10 and kg, 1L -> 1 and L, 30구 -> 30 and ea.",
  "packUnit is one of g, kg, mL, L, ea (ea = pieces). When the size or unit is not printed, use null; never guess.",
  "quantity: number of packs. unitPrice: price of one pack in won. amount: row amount in won.",
  "total: the invoice total in won. Copy numbers as printed; never compute or guess missing values.",
].join("\n");

const UNIT_VALUES = ["g", "kg", "mL", "L", "ea"];

const responseSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    supplier: { type: Type.STRING },
    date: { type: Type.STRING, description: "YYYY-MM-DD" },
    items: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          rawName: { type: Type.STRING },
          packSize: { type: Type.NUMBER, nullable: true },
          packUnit: { type: Type.STRING, format: "enum", enum: UNIT_VALUES, nullable: true },
          quantity: { type: Type.NUMBER },
          unitPrice: { type: Type.INTEGER },
          amount: { type: Type.INTEGER },
        },
        required: ["rawName", "packSize", "packUnit", "quantity", "unitPrice", "amount"],
        propertyOrdering: ["rawName", "packSize", "packUnit", "quantity", "unitPrice", "amount"],
      },
    },
    total: { type: Type.INTEGER },
  },
  required: ["supplier", "date", "items", "total"],
  propertyOrdering: ["supplier", "date", "items", "total"],
};

const ModelOutputSchema = z.object({
  supplier: z.string(),
  date: z.string(),
  items: z.array(
    z.object({
      rawName: z.string(),
      packSize: z.number().nullable(),
      packUnit: z.string().nullable(),
      quantity: z.number(),
      unitPrice: z.number(),
      amount: z.number(),
    }),
  ),
  total: z.number(),
});

export interface Extraction {
  result: ExtractResult;
  isDemo: boolean;
}

const UNIT_SPELLINGS: Record<string, Unit> = { ml: "mL", l: "L", 개: "ea", ea: "ea", g: "g", kg: "kg" };

function toUnit(value: string | null): Unit | null {
  if (value === null) return null;
  const text = value.trim();
  if (isUnit(text)) return text;
  return UNIT_SPELLINGS[text.toLowerCase()] ?? null;
}

const won = (n: number): number => Math.max(0, Math.round(n));

async function normalizeImage(image: Buffer): Promise<Buffer> {
  return sharp(image)
    .rotate()
    .resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: 80 })
    .toBuffer();
}

async function extractWithGemini(image: Buffer, apiKey: string): Promise<Extraction> {
  const jpeg = await normalizeImage(image);
  const ai = new GoogleGenAI({ apiKey });
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      controller.abort();
      reject(new Error(`OCR timed out after ${TIMEOUT_MS}ms`));
    }, TIMEOUT_MS);
  });

  try {
    const response = await Promise.race([
      ai.models.generateContent({
        model: process.env.GEMINI_MODEL || DEFAULT_GEMINI_MODEL,
        contents: [
          {
            role: "user",
            parts: [{ inlineData: { mimeType: "image/jpeg", data: jpeg.toString("base64") } }, { text: PROMPT }],
          },
        ],
        config: {
          responseMimeType: "application/json",
          responseSchema,
          temperature: 0,
          abortSignal: controller.signal,
        },
      }),
      timeout,
    ]);
    const text = response.text;
    if (!text) throw new Error("Gemini returned no text");
    const out = ModelOutputSchema.parse(JSON.parse(text));
    return {
      isDemo: false,
      result: {
        supplier: out.supplier.trim(),
        date: out.date.trim(),
        items: out.items.map((i) => ({
          rawName: i.rawName.trim(),
          packSize: i.packSize,
          packUnit: toUnit(i.packUnit),
          quantity: i.quantity,
          unitPrice: won(i.unitPrice),
          amount: won(i.amount),
          confidence: "high",
        })),
        total: won(out.total),
      },
    };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Reads an invoice photo. The model only reads printed values; ingredient
 * mapping happens in aliases.ts. Falls back to the store preset's demo invoice
 * extraction when the key is missing, the call fails or it takes over 8 seconds, unless
 * DEMO_FALLBACK=0.
 */
export async function extractInvoice(image: Buffer, mime: string, preset: Preset): Promise<Extraction> {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("GEMINI_API_KEY is not set");
    return await extractWithGemini(image, apiKey);
  } catch (err) {
    if (process.env.DEMO_FALLBACK === "0") throw err;
    console.warn(`[ocr] using demo extract for ${mime} upload:`, err instanceof Error ? err.message : err);
    return { result: structuredClone(preset.demoInvoice.extraction), isDemo: true };
  }
}
