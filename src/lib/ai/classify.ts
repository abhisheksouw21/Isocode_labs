import { isIsoDate } from "../dates";
import { complaintSignals } from "./complaint";
import { extractEntities, type Extracted } from "./extract";
import { classifyWithLlm, llmConfigured } from "./llm";
import { defaultModel, predict, type CategoryLabel } from "./naive-bayes";

export type LaneLabel = CategoryLabel | "UNSORTED";

export type Triage = {
  category: CategoryLabel;
  confidence: number;
  lane: LaneLabel;
  classifiedBy: "LOCAL" | "LLM";
  gmAlert: boolean;
  extracted: Extracted;
  scores: Partial<Record<CategoryLabel, number>>;
  reasons: string[];
  note?: string;
};

export function confidenceThreshold(): number {
  const value = Number(process.env.AI_CONFIDENCE_THRESHOLD ?? 0.65);
  return Number.isFinite(value) && value > 0 && value < 1 ? value : 0.65;
}

/**
 * Routing rules, in order:
 * 1. Complaint keywords or a complaint label always go to the complaint lane and alert the GM.
 * 2. Below the confidence threshold, the enquiry goes to the unsorted lane the GM sees.
 * 3. Otherwise it goes to its category's lane.
 */
export function decideLane(category: CategoryLabel, confidence: number, signals: string[], threshold = confidenceThreshold()) {
  const isComplaint = signals.length > 0 || (category === "COMPLAINT" && confidence >= 0.4);
  if (isComplaint) return { category: "COMPLAINT" as const, lane: "COMPLAINT" as const, gmAlert: true };
  if (confidence < threshold) return { category, lane: "UNSORTED" as const, gmAlert: false };
  return { category, lane: category, gmAlert: false };
}

export async function triageEnquiry(message: string, receivedAt: Date, opts: { useLlm?: boolean } = {}): Promise<Triage> {
  const signals = complaintSignals(message);
  const extracted = extractEntities(message, receivedAt);
  const local = predict(defaultModel(), message);
  const reasons = signals.length ? [`Complaint words: ${signals.join(", ")}`] : [];

  if ((opts.useLlm ?? true) && llmConfigured()) {
    try {
      const llm = await classifyWithLlm(message, receivedAt);
      const merged: Extracted = {
        ...extracted,
        checkIn: extracted.checkIn ?? (llm.checkIn && isIsoDate(llm.checkIn) ? llm.checkIn : undefined),
        checkOut: extracted.checkOut ?? (llm.checkOut && isIsoDate(llm.checkOut) ? llm.checkOut : undefined),
        guests: extracted.guests ?? llm.guests ?? undefined,
        adults: extracted.adults ?? llm.adults ?? undefined,
        children: extracted.children ?? llm.children ?? undefined,
        budget: extracted.budget ?? llm.budget ?? undefined,
      };
      const decision = decideLane(llm.category, llm.confidence, signals);
      return {
        ...decision,
        confidence: llm.confidence,
        classifiedBy: "LLM",
        extracted: merged,
        scores: { [llm.category]: llm.confidence },
        reasons: [...reasons, `Cloud model said ${llm.category.toLowerCase()} (local model: ${local.label.toLowerCase()})`],
      };
    } catch (err) {
      reasons.push(`Cloud model unavailable (${err instanceof Error ? err.message : "error"}), used local model`);
    }
  }

  const decision = decideLane(local.label, local.confidence, signals);
  if (local.knownTokens < 3) reasons.push("Few familiar words, so confidence is capped");
  return {
    ...decision,
    confidence: Number(local.confidence.toFixed(3)),
    classifiedBy: "LOCAL",
    extracted,
    scores: local.scores,
    reasons,
  };
}
