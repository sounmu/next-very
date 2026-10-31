import { GoogleGenAI, Type, type Schema } from "@google/genai";
import { isUnit, seed, type ExtractResult, type Unit } from "@marginlog/core";
import sharp from "sharp";
import { z } from "zod";

const TIMEOUT_MS = 8000;
/** Alias used by the @google/genai 2.32 README examples; override with GEMINI_MODEL. */
const DEFAULT_GEMINI_MODEL = "gemini-flash-latest";
/** Lablup's OpenAI-compatible endpoint; override with LABLUP_BASE_URL and LABLUP_MODEL. */
const DEFAULT_LABLUP_BASE_URL = "https://api.console.lablup.ai/v1";
const DEFAULT_LABLUP_MODEL = "DeepSeek-V4.1-Flash-B300";

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

/** The same shape as responseSchema, in the JSON Schema form OpenAI-compatible servers take. */
const jsonSchema = {
  type: "object",
  properties: {
    supplier: { type: "string" },
    date: { type: "string", description: "YYYY-MM-DD" },
    items: {
      type: "array",
      items: {
        type: "object",
        properties: {
          rawName: { type: "string" },
          packSize: { type: ["number", "null"] },
          packUnit: { enum: [...UNIT_VALUES, null] },
          quantity: { type: "number" },
          unitPrice: { type: "integer" },
          amount: { type: "integer" },
        },
        required: ["rawName", "packSize", "packUnit", "quantity", "unitPrice", "amount"],
        additionalProperties: false,
      },
    },
    total: { type: "integer" },
  },
  required: ["supplier", "date", "items", "total"],
  additionalProperties: false,
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

type ModelOutput = z.infer<typeof ModelOutputSchema>;

function toExtraction(out: ModelOutput): Extraction {
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
}

/** Runs `call` with an abort signal that fires after TIMEOUT_MS. */
async function withTimeout<T>(call: (signal: AbortSignal) => Promise<T>): Promise<T> {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      controller.abort();
      reject(new Error(`OCR timed out after ${TIMEOUT_MS}ms`));
    }, TIMEOUT_MS);
  });
  try {
    return await Promise.race([call(controller.signal), timeout]);
  } finally {
    clearTimeout(timer);
  }
}

async function extractWithGemini(jpeg: Buffer, apiKey: string): Promise<ModelOutput> {
  const ai = new GoogleGenAI({ apiKey });
  const response = await withTimeout((abortSignal) =>
    ai.models.generateContent({
      model: process.env.GEMINI_MODEL || DEFAULT_GEMINI_MODEL,
      contents: [
        {
          role: "user",
          parts: [{ inlineData: { mimeType: "image/jpeg", data: jpeg.toString("base64") } }, { text: PROMPT }],
        },
      ],
      config: { responseMimeType: "application/json", responseSchema, temperature: 0, abortSignal },
    }),
  );
  const text = response.text;
  if (!text) throw new Error("Gemini returned no text");
  return ModelOutputSchema.parse(JSON.parse(text));
}

const ChatResponseSchema = z.object({
  choices: z.array(z.object({ message: z.object({ content: z.string().nullable() }) })).min(1),
});

async function extractWithLablup(jpeg: Buffer, apiKey: string): Promise<ModelOutput> {
  const baseUrl = (process.env.LABLUP_BASE_URL || DEFAULT_LABLUP_BASE_URL).replace(/\/+$/, "");
  const body = await withTimeout(async (signal) => {
    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: process.env.LABLUP_MODEL || DEFAULT_LABLUP_MODEL,
        temperature: 0,
        messages: [
          {
            role: "user",
            content: [
              { type: "image_url", image_url: { url: `data:image/jpeg;base64,${jpeg.toString("base64")}` } },
              { type: "text", text: PROMPT },
            ],
          },
        ],
        response_format: { type: "json_schema", json_schema: { name: "invoice", strict: true, schema: jsonSchema } },
        // DeepSeek reasons before answering by default, which pushes a 15-row receipt past
        // TIMEOUT_MS (~8s). Reading printed values needs no reasoning: off, it takes 1-3s.
        chat_template_kwargs: { thinking: false },
      }),
      signal,
    });
    if (!res.ok) throw new Error(`Lablup returned ${res.status}: ${(await res.text()).slice(0, 200)}`);
    return res.json();
  });
  const text = ChatResponseSchema.parse(body).choices[0].message.content;
  if (!text) throw new Error("Lablup returned no text");
  return ModelOutputSchema.parse(JSON.parse(text));
}

type Provider = "lablup" | "gemini";

/** OCR_PROVIDER picks the model; without it, Lablup when its key is set, else Gemini. */
function pickProvider(): { provider: Provider; apiKey: string } {
  const choice = process.env.OCR_PROVIDER || (process.env.LABLUP_API_KEY ? "lablup" : "gemini");
  if (choice !== "lablup" && choice !== "gemini") throw new Error(`Unknown OCR_PROVIDER: ${choice}`);
  const keyName = choice === "lablup" ? "LABLUP_API_KEY" : "GEMINI_API_KEY";
  const apiKey = process.env[keyName];
  if (!apiKey) throw new Error(`${keyName} is not set`);
  return { provider: choice, apiKey };
}

/**
 * Reads an invoice photo. The model only reads printed values; ingredient
 * mapping happens in aliases.ts. Falls back to the seed demo invoice extraction
 * when the provider's key is missing, the call fails or it takes over 8 seconds,
 * unless DEMO_FALLBACK=0.
 */
export async function extractInvoice(image: Buffer, mime: string): Promise<Extraction> {
  try {
    const { provider, apiKey } = pickProvider();
    const jpeg = await normalizeImage(image);
    const out = provider === "lablup" ? await extractWithLablup(jpeg, apiKey) : await extractWithGemini(jpeg, apiKey);
    return toExtraction(out);
  } catch (err) {
    if (process.env.DEMO_FALLBACK === "0") throw err;
    console.warn(`[ocr] using demo extract for ${mime} upload:`, err instanceof Error ? err.message : err);
    return { result: structuredClone(seed.demoInvoice.extraction), isDemo: true };
  }
}
