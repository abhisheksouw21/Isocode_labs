import { z } from "zod";
import { CATEGORIES } from "./naive-bayes";

const LlmResult = z.object({
  category: z.enum(CATEGORIES),
  confidence: z.number().min(0).max(1),
  checkIn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  checkOut: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  guests: z.number().int().positive().max(5000).nullable().optional(),
  adults: z.number().int().positive().max(500).nullable().optional(),
  children: z.number().int().min(0).max(100).nullable().optional(),
  budget: z.number().positive().nullable().optional(),
});
export type LlmClassification = z.infer<typeof LlmResult>;

export function llmConfigured(): boolean {
  return Boolean(process.env.LLM_API_KEY);
}

/**
 * Optional cloud model via any OpenAI-compatible endpoint (OpenAI, Gemini's
 * OpenAI endpoint, OpenRouter). Off unless LLM_API_KEY is set. It only
 * classifies and extracts; its output is schema-checked and never reaches the
 * guest without code-built facts and a human send.
 */
export async function classifyWithLlm(message: string, receivedAt: Date): Promise<LlmClassification> {
  const base = process.env.LLM_BASE_URL ?? "https://generativelanguage.googleapis.com/v1beta/openai";
  const model = process.env.LLM_MODEL ?? "gemini-2.5-flash";
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), Number(process.env.LLM_TIMEOUT_MS ?? 6000));
  try {
    const res = await fetch(`${base}/chat/completions`, {
      method: "POST",
      signal: controller.signal,
      headers: { "content-type": "application/json", authorization: `Bearer ${process.env.LLM_API_KEY}` },
      body: JSON.stringify({
        model,
        temperature: 0,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              "You triage enquiries for a coffee-estate resort. Reply with JSON only: " +
              '{"category":"ROOM|WEDDING|OFFSITE|COMPLAINT","confidence":0-1,"checkIn":"YYYY-MM-DD"|null,"checkOut":"YYYY-MM-DD"|null,"guests":int|null,"adults":int|null,"children":int|null,"budget":rupees|null}. ' +
              `The message arrived on ${receivedAt.toISOString().slice(0, 10)}; resolve dates to the next occurrence. Use null when unsure. Never invent prices.`,
          },
          { role: "user", content: message.slice(0, 2000) },
        ],
      }),
    });
    if (!res.ok) throw new Error(`LLM HTTP ${res.status}`);
    const body = await res.json();
    const content = body?.choices?.[0]?.message?.content;
    return LlmResult.parse(JSON.parse(String(content ?? "")));
  } finally {
    clearTimeout(timer);
  }
}
