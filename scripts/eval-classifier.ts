import evalSet from "../data/enquiries.eval.json";
import { triageEnquiry } from "../src/lib/ai/classify";

async function main() {
  const receivedAt = new Date("2026-11-08T09:00:00+05:30");
  let correct = 0;
  let unsorted = 0;
  const confusion: Record<string, Record<string, number>> = {};
  const rows = [];
  for (const ex of evalSet) {
    const t = await triageEnquiry(ex.text, receivedAt, { useLlm: false });
    const ok = t.category === ex.label;
    if (ok) correct++;
    if (t.lane === "UNSORTED") unsorted++;
    confusion[ex.label] ??= {};
    confusion[ex.label][t.category] = (confusion[ex.label][t.category] ?? 0) + 1;
    rows.push({ id: ex.id, expected: ex.label, got: t.category, lane: t.lane, conf: t.confidence, ok });
  }
  console.table(rows);
  console.log(`Accuracy ${correct}/${evalSet.length} = ${((correct / evalSet.length) * 100).toFixed(1)}%`);
  console.log(`Sent to unsorted lane: ${unsorted}`);
  const wrongButRouted = rows.filter((r) => !r.ok && r.lane !== "UNSORTED").length;
  console.log(`Wrong AND confidently routed: ${wrongButRouted}`);
  console.log("Confusion (expected -> got):", JSON.stringify(confusion));
}
main();
