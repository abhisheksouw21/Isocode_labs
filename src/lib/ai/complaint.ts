const PATTERNS: RegExp[] = [
  /\bcomplain/,
  /\brefund/,
  /\bcharged twice\b|\bdouble charged\b|\bovercharg/,
  /\brude\b|\bmisbehav/,
  /\bdirty\b|\bunhygienic\b|\bfilthy\b|\bsmell(?:ed|s|y)?\b|\bdamp\b/,
  /\bcockroach|\binsects?\b|\bbed ?bugs?\b|\brats?\b/,
  /\bdisappoint/,
  /\bworst\b|\bterrible\b|\bhorrible\b|\bawful\b|\bpathetic\b/,
  /\bunacceptable\b|\bescalat/,
  /\bnot working\b|\bdidn'?t work\b|\bbroken\b|\bleak/,
  /\bnever coming back\b|\bcompensation\b/,
  /\bno hot water\b|\bnobody came\b|\bnot responding\b/,
];

/** Deterministic safety net: complaints must reach the GM even if the model misses them. */
export function complaintSignals(message: string): string[] {
  const text = message.toLowerCase();
  return PATTERNS.filter((p) => p.test(text)).map((p) => text.match(p)![0]);
}
