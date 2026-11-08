import train from "../../../data/enquiries.train.json";

export const CATEGORIES = ["ROOM", "WEDDING", "OFFSITE", "COMPLAINT"] as const;
export type CategoryLabel = (typeof CATEGORIES)[number];

const STOPWORDS = new Set(
  "a an the and or for to of in on at is are was were be we our us i my me you your do does did can could would will with from this that it its please hi hello hey any have has had need want looking there".split(
    " ",
  ),
);

function stem(word: string): string {
  if (word.length > 5 && word.endsWith("ing")) return word.slice(0, -3);
  if (word.length > 4 && word.endsWith("ies")) return `${word.slice(0, -3)}y`;
  if (word.length > 3 && word.endsWith("s") && !word.endsWith("ss")) return word.slice(0, -1);
  return word;
}

export function tokenize(text: string): string[] {
  const words = text
    .toLowerCase()
    .replace(/[’']/g, "")
    .replace(/\d+/g, " ")
    .split(/[^a-z]+/)
    .filter((w) => w.length > 1 && !STOPWORDS.has(w))
    .map(stem);
  const bigrams = words.slice(1).map((w, i) => `${words[i]}_${w}`);
  return [...words, ...bigrams];
}

export type NbModel = {
  vocab: Set<string>;
  logPrior: Record<CategoryLabel, number>;
  logLikelihood: Record<CategoryLabel, Map<string, number>>;
  logUnseen: Record<CategoryLabel, number>;
};

export function trainModel(examples: { text: string; label: string }[], alpha = 1): NbModel {
  const vocab = new Set<string>();
  const counts = Object.fromEntries(CATEGORIES.map((c) => [c, new Map<string, number>()])) as Record<CategoryLabel, Map<string, number>>;
  const docs = Object.fromEntries(CATEGORIES.map((c) => [c, 0])) as Record<CategoryLabel, number>;
  const totals = Object.fromEntries(CATEGORIES.map((c) => [c, 0])) as Record<CategoryLabel, number>;

  for (const ex of examples) {
    const label = ex.label as CategoryLabel;
    docs[label] += 1;
    for (const tok of tokenize(ex.text)) {
      vocab.add(tok);
      counts[label].set(tok, (counts[label].get(tok) ?? 0) + 1);
      totals[label] += 1;
    }
  }

  const v = vocab.size;
  const logPrior = {} as Record<CategoryLabel, number>;
  const logLikelihood = {} as Record<CategoryLabel, Map<string, number>>;
  const logUnseen = {} as Record<CategoryLabel, number>;
  for (const c of CATEGORIES) {
    logPrior[c] = Math.log(docs[c] / examples.length);
    const denom = totals[c] + alpha * v;
    logUnseen[c] = Math.log(alpha / denom);
    logLikelihood[c] = new Map([...counts[c]].map(([tok, n]) => [tok, Math.log((n + alpha) / denom)]));
  }
  return { vocab, logPrior, logLikelihood, logUnseen };
}

export type NbResult = {
  label: CategoryLabel;
  confidence: number;
  scores: Record<CategoryLabel, number>;
  knownTokens: number;
};

/**
 * Multinomial Naive Bayes. Raw NB posteriors are overconfident, so log scores
 * are divided by a temperature before the softmax, and messages with almost no
 * known vocabulary are capped low so they land in the unsorted lane.
 */
export function predict(model: NbModel, text: string, temperature = 1.5): NbResult {
  const tokens = tokenize(text).filter((t) => model.vocab.has(t));
  const log = {} as Record<CategoryLabel, number>;
  for (const c of CATEGORIES) {
    log[c] = model.logPrior[c] + tokens.reduce((acc, t) => acc + (model.logLikelihood[c].get(t) ?? model.logUnseen[c]), 0);
  }
  const max = Math.max(...Object.values(log));
  const exp = Object.fromEntries(CATEGORIES.map((c) => [c, Math.exp((log[c] - max) / temperature)])) as Record<CategoryLabel, number>;
  const z = Object.values(exp).reduce((a, b) => a + b, 0);
  const scores = Object.fromEntries(CATEGORIES.map((c) => [c, exp[c] / z])) as Record<CategoryLabel, number>;
  const label = CATEGORIES.reduce((best, c) => (scores[c] > scores[best] ? c : best), CATEGORIES[0]);
  const coverageCap = tokens.length >= 3 ? 1 : tokens.length === 2 ? 0.6 : 0.35;
  return { label, confidence: Math.min(scores[label], coverageCap), scores, knownTokens: tokens.length };
}

let cached: NbModel | null = null;
export function defaultModel(): NbModel {
  cached ??= trainModel(train);
  return cached;
}
