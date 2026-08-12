/** Deterministic, offline intent matcher.
 *
 *  A question is matched to a previously-seen intent by lexical token-vector
 *  cosine similarity, scoped to the SAME app. No network, no model, no
 *  randomness or time — identical inputs always yield identical scores.
 */

/** A paraphrase at or above this cosine is treated as the same intent. */
export const INTENT_MATCH = 0.62;
/** A near-identical question (used by the store to dedup into one intent). */
export const INTENT_STRONG = 0.85;

/** ~30 common English stopwords stripped before vectorizing.
 *  Deliberately EXCLUDES light phrasal prepositions like "for" — in guidance
 *  questions ("search FOR spider man") they carry real intent signal and are
 *  what lets a paraphrase clear the match threshold. */
const STOPWORDS = new Set<string>([
  "the", "a", "an", "and", "or", "but", "i", "you", "me", "my",
  "we", "they", "it", "he", "she", "do", "does", "did", "how", "to",
  "of", "in", "on", "at", "is", "are", "was", "with", "this", "that",
]);

/** lowercase → split on non-alphanumeric → drop stopwords/empties. */
export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length > 0 && !STOPWORDS.has(t));
}

function freq(tokens: string[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const t of tokens) m.set(t, (m.get(t) ?? 0) + 1);
  return m;
}

function cosine(a: Map<string, number>, b: Map<string, number>): number {
  let dot = 0;
  for (const [k, av] of a) {
    const bv = b.get(k);
    if (bv !== undefined) dot += av * bv;
  }
  let na = 0;
  for (const av of a.values()) na += av * av;
  let nb = 0;
  for (const bv of b.values()) nb += bv * bv;
  if (na === 0 || nb === 0) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

type IntentEntry = { intentId: string; app: string; tokens: string[] };

export type IntentBand = "match" | "gray" | "new";

export class IntentIndex {
  private readonly entries = new Map<string, IntentEntry>();

  /** Register (or extend) an intent with example questions, scoped to `app`.
   *  Repeated calls for the same intentId pool their example tokens. */
  add(intentId: string, app: string, examples: string[]): void {
    const existing = this.entries.get(intentId);
    const tokens = examples.flatMap((e) => tokenize(e));
    if (existing) {
      existing.tokens.push(...tokens);
    } else {
      this.entries.set(intentId, { intentId, app, tokens });
    }
  }

  /** Best same-app intent for a question, or null below INTENT_MATCH. */
  match(question: string, app: string): { intentId: string; score: number } | null {
    const q = freq(tokenize(question));
    if (q.size === 0) return null;
    let best: { intentId: string; score: number } | null = null;
    for (const entry of this.entries.values()) {
      if (entry.app !== app) continue; // app-scoped candidates only
      const score = cosine(q, freq(entry.tokens));
      if (!best || score > best.score) best = { intentId: entry.intentId, score };
    }
    if (!best || best.score < INTENT_MATCH) return null;
    return best;
  }

  /** Classify a score into a UX band (spec §5): strong / gray / new. */
  bands(score: number): IntentBand {
    if (score >= INTENT_STRONG) return "match";
    if (score >= INTENT_MATCH) return "gray";
    return "new";
  }
}
