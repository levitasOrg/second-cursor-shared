/** Deterministic, offline intent matcher.
 *
 *  A question is matched to a previously-seen intent by lexical token-vector
 *  cosine similarity, scoped to the SAME app. No network, no model, no
 *  randomness or time — identical inputs always yield identical scores.
 */

/** A paraphrase at or above this cosine is treated as the same intent.
 *  Loosened from 0.62 → 0.50 (Phase 1E): a paraphrased repeat that shares
 *  only the task *pattern* (e.g. "search for X") tops out around 0.57
 *  lexically, so 0.62 missed it. Safe to loosen because a wrong Tier-1 match
 *  just fails local re-validation and falls through to Tier-3 — same cost as a
 *  miss. The ambiguity guard below keeps a near-tie from picking wrongly. */
export const INTENT_MATCH = 0.5;
/** A near-identical question (used by the store to dedup into one intent). */
export const INTENT_STRONG = 0.85;
/** If the top-2 same-app candidate scores are within this of each other, the
 *  match is genuinely ambiguous — worse than a miss (spec §20). `match()`
 *  surfaces the runner-up (`second`) and callers decide: the store's Tier-1
 *  lookup treats an ambiguous match as a miss, while the session can ask the
 *  user which stored question they meant (§5 tiebreak). */
export const INTENT_AMBIGUITY = 0.08;

/** Common English pure-function words stripped before vectorizing.
 *  Deliberately EXCLUDES task-shape words that carry guidance intent —
 *  `search`, `open`, `find`, `send`, `attach`, `new`, and light phrasal
 *  prepositions like `for` ("search FOR spider man"). Those are what let a
 *  paraphrase clear the match threshold; only content-free grammatical words
 *  (the/is/a/my/how/…) are dropped. */
const STOPWORDS = new Set<string>([
  "the", "a", "an", "and", "or", "i", "you", "me", "my", "do",
  "does", "did", "how", "to", "of", "in", "on", "is", "are", "was",
  "with",
]);

/** Heuristic: does this question ask for COMPREHENSION (explain-mode) rather
 *  than a task to perform? Explain asks skip the recipe and knowledge tiers
 *  entirely (§21: explain narration must be grounded, and recipes are
 *  guide-only §5), so classifying them up front saves a wasted Tier-2 call. */
export function isExplainAsk(question: string): boolean {
  const q = question.toLowerCase();
  return /^(explain|describe|tell me about)\b/.test(q) ||
    /\b(what is|what's|what does|what do|what are|why is|why does|is this|are these|does this|meaning of)\b/.test(q);
}

/** An explicit imperative task verb at the head of the question — the user is
 *  telling us to DO something, so guide-mode wins even over a live selection
 *  ("delete my account" while a paragraph happens to be highlighted). */
const GUIDE_VERB_RE = /^(click|type|open|go to|search|send|delete|fill|submit)\b/i;
/** Whole-page markers: the user wants every major section covered (§5 full). */
const FULL_DEPTH_RE = /\b(whole|entire|everything|every part|all of it|fully)\b/i;
/** §22b deictic cues: with the mouse resting on an element, "this/that/it/
 *  here" refers to THAT element — the ask is a focused explain at the
 *  pointer. Without a pointer target the cue anchors nothing (stays gist). */
const DEICTIC_RE = /\b(this|that|it|here)\b(?!\s+(page|site|website|screen|tab|form))/i;

/** §5/§22a ask classifier: mode (guide|explain) plus, for explain asks, how
 *  DEEP the narration should go — "gist" (3–5 stops), "full" (one stop per
 *  major section) or "focused" (the selection/anchor only). Precedence:
 *   1. an explicit guide verb → guide (a selection is ignored for MODE);
 *   2. a selection → focused explain, whatever the phrasing;
 *   3. otherwise `isExplainAsk` decides the mode, and whole-page markers
 *      upgrade an explain from "gist" to "full".
 *  Guide asks never carry a depth. `isExplainAsk` stays exported unchanged. */
export function classifyAsk(question: string, hasSelection = false,
    hasPointerTarget = false):
    { mode: "guide" | "explain"; depth?: "gist" | "full" | "focused" } {
  if (GUIDE_VERB_RE.test(question)) return { mode: "guide" };
  if (hasSelection) return { mode: "explain", depth: "focused" };
  if (!isExplainAsk(question)) return { mode: "guide" };
  if (FULL_DEPTH_RE.test(question)) return { mode: "explain", depth: "full" };
  // §22b: a deictic explain with the mouse on an element is focused there.
  if (hasPointerTarget && DEICTIC_RE.test(question))
    return { mode: "explain", depth: "focused" };
  return { mode: "explain", depth: "gist" };
}

/** §22b: lexical token-frequency cosine between two short texts — the
 *  narration↔target agreement score the planner's self-repair pass uses.
 *  Same math as IntentIndex matching; 0 when either side has no tokens.
 *  Narration GLUE (deictic and pacing words: "this…", "tap next when
 *  you're ready") is dropped first — live-probe evidence: "This is the
 *  article title — everything on this page…" cosine-matched the link
 *  "Permanent link to this revision of this page" at 0.59 purely on
 *  this/page overlap and yanked the target off the h1. */
const NARRATION_GLUE = new Set(["this", "that", "these", "those", "it", "its",
  "here", "there", "about", "everything", "anything", "see", "tap", "click",
  "next", "ready", "want", "like", "when", "now", "your", "youre", "one"]);
export function similarity(a: string, b: string): number {
  const strip = (t: string) => tokenize(t).filter((w) => !NARRATION_GLUE.has(w));
  return cosine(freq(strip(a)), freq(strip(b)));
}

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

/** Result of `IntentIndex.match`: the best same-app intent plus — when other
 *  candidates exist — the runner-up already computed for the ambiguity window,
 *  surfaced so callers can tiebreak instead of silently taking the best (§5). */
export interface IntentMatch {
  intentId: string;
  score: number;
  second?: { key: string; score: number };
}

/** The ambiguity rule in one place: a match is ambiguous when its runner-up
 *  scores within INTENT_AMBIGUITY of it. Consumers: the store's Tier-1 lookup
 *  (ambiguous → miss, spec §20) and the session's §5 tiebreak (ambiguous gray
 *  match → ask the user). */
export function isAmbiguousMatch(m: IntentMatch): boolean {
  return m.second !== undefined && m.score - m.second.score < INTENT_AMBIGUITY;
}

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

  /** Best same-app intent for a question, or null below INTENT_MATCH.
   *  When another same-app candidate exists, the runner-up rides along as
   *  `second` — a near-tie (see `isAmbiguousMatch`) is NOT swallowed here:
   *  the store's Tier-1 lookup treats it as a miss, and the session uses the
   *  surfaced pair to ask the user which one they meant (§5 tiebreak). */
  match(question: string, app: string): IntentMatch | null {
    const q = freq(tokenize(question));
    if (q.size === 0) return null;
    let best: { intentId: string; score: number } | null = null;
    let second: { intentId: string; score: number } | null = null;
    for (const entry of this.entries.values()) {
      if (entry.app !== app) continue; // app-scoped candidates only
      const score = cosine(q, freq(entry.tokens));
      const cand = { intentId: entry.intentId, score };
      if (!best || score > best.score) {
        second = best;
        best = cand;
      } else if (!second || score > second.score) {
        second = cand;
      }
    }
    if (!best || best.score < INTENT_MATCH) return null;
    return {
      ...best,
      ...(second ? { second: { key: second.intentId, score: second.score } } : {}),
    };
  }

  /** Classify a score into a UX band (spec §5): strong / gray / new. */
  bands(score: number): IntentBand {
    if (score >= INTENT_STRONG) return "match";
    if (score >= INTENT_MATCH) return "gray";
    return "new";
  }
}
