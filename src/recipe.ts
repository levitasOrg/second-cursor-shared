import type { Digest } from "./snapshot.js";
import type { Step, ExpectedAfter } from "./steps.js";

/** A coarse, privacy-safe shape of a page: app + locale + the landmark regions
 *  and key action buttons present. No page values, only role/name labels. */
export interface UIFingerprint {
  app: string;
  locale: string;
  landmarks: string[];
  keyButtons: string[];
}

/** Trust counters used by the RecipeStore (phase-2 columns carried now). */
export interface TrustCounters {
  successes: number;
  failures: number;
  lastConfirmed: number;
  envTags: string[];
}

/** One UI-fingerprinted variant of a recipe's steps. */
export interface RecipeVariant {
  id: string;
  fingerprint: UIFingerprint;
  steps: Step[];
  goalEvidence?: ExpectedAfter;
  trust: TrustCounters;
}

/** A saved intent: the pooled example questions + its per-UI variants. */
export interface Recipe {
  intentId: string;
  app: string;
  examples: string[];
  variants: RecipeVariant[];
}

/** Project a live Digest onto the privacy-safe fingerprint (drops title). */
export function fingerprintFromDigest(d: Digest): UIFingerprint {
  return {
    app: d.app,
    locale: d.locale,
    landmarks: [...d.landmarks],
    keyButtons: [...d.keyButtons],
  };
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 1; // trivially identical empty sets
  let inter = 0;
  for (const x of a) if (b.has(x)) inter++;
  const union = a.size + b.size - inter;
  return union === 0 ? 0 : inter / union;
}

/** Similarity of two UI fingerprints in [0,1].
 *  - Different app → 0 (hard gate: a recipe is never reused across apps).
 *  - Same app contributes a 0.5 base (app match is itself half the signal),
 *    and the structural Jaccard over (landmarks ∪ keyButtons) fills the upper
 *    half. Pure Jaccard tops out at 0.5 for the plan's own test case
 *    (2 shared / 4 union), which asserts a score > 0.5 — hence the base.
 *  - A locale mismatch caps the result at 0.5 (don't trust a cross-locale UI). */
export function fingerprintMatch(a: UIFingerprint, b: UIFingerprint): number {
  if (a.app !== b.app) return 0;
  const setA = new Set<string>([...a.landmarks, ...a.keyButtons]);
  const setB = new Set<string>([...b.landmarks, ...b.keyButtons]);
  const score = 0.5 + 0.5 * jaccard(setA, setB);
  if (a.locale !== b.locale) return Math.min(score, 0.5);
  return score;
}
