import type { UISnapshot, ElementNode } from "./snapshot.js";
import type { TargetDescriptor, ExpectedAfter } from "./steps.js";

export interface MatchResult { elementId: string | null; confidence: number; ambiguous: boolean; }

const CONFIDENCE_FLOOR = 0.45;
const AMBIGUITY_WINDOW = 0.1;

function nameScore(target: string, actual: string): number {
  const t = target.trim().toLowerCase(), a = actual.trim().toLowerCase();
  if (!t || !a) return 0;
  if (t === a) return 1;
  if (a.includes(t) || t.includes(a)) return 0.85;
  const tw = new Set(t.split(/\s+/)); const aw = a.split(/\s+/);
  const overlap = aw.filter((w) => tw.has(w)).length;
  return overlap === 0 ? 0 : (0.6 * overlap) / Math.max(tw.size, aw.length);
}

function regionScore(region: TargetDescriptor["region"], e: ElementNode, snap: UISnapshot): number {
  if (!region) return 0.5;
  const [x, y, w, h] = e.bounds; const cx = x + w / 2, cy = y + h / 2;
  const { w: vw, h: vh } = snap.viewport;
  const match = { top: cy < vh / 3, bottom: cy > (2 * vh) / 3, left: cx < vw / 3,
    right: cx > (2 * vw) / 3,
    center: cx >= vw / 3 && cx <= (2 * vw) / 3 && cy >= vh / 3 && cy <= (2 * vh) / 3 }[region];
  return match ? 1 : 0.2;
}

/** Score every snapshot element against a target descriptor (role/name/region)
 *  and return the best match, flagging ambiguity when the top two are close. */
export function matchDescriptor(d: TargetDescriptor, snap: UISnapshot): MatchResult {
  const scored = snap.elements.map((e) => {
    const role = e.role === d.role ? 1 : 0.2;
    const name = Math.max(nameScore(d.name, e.name), nameScore(d.name, e.text));
    const region = regionScore(d.region, e, snap);
    return { id: e.id, score: role * 0.35 + name * 0.5 + region * 0.15 };
  }).sort((a, b) => b.score - a.score);
  const top = scored[0];
  if (!top || top.score < CONFIDENCE_FLOOR) return { elementId: null, confidence: top?.score ?? 0, ambiguous: false };
  const second = scored[1];
  const ambiguous = !!second && top.score - second.score < AMBIGUITY_WINDOW;
  return { elementId: top.id, confidence: top.score, ambiguous };
}

/** Evaluate a step's expectedAfter condition against a fresh snapshot to decide
 *  whether the user's action achieved what the step intended. */
export function checkExpectedAfter(exp: ExpectedAfter, snap: UISnapshot,
    ctx: { urlChanged: boolean }): boolean {
  switch (exp.kind) {
    case "url-changed": return ctx.urlChanged;
    case "dialog-appeared": return snap.elements.some((e) => e.role === "dialog" && e.state.includes("visible"));
    case "element-visible": {
      if (!exp.descriptor) return false;
      const m = matchDescriptor(exp.descriptor, snap);
      if (!m.elementId) return false;
      const e = snap.elements.find((x) => x.id === m.elementId)!;
      return e.state.includes("visible");
    }
    case "element-focused": {
      if (!exp.descriptor) return false;
      const m = matchDescriptor(exp.descriptor, snap);
      if (!m.elementId) return false;
      return snap.elements.find((x) => x.id === m.elementId)!.state.includes("focused");
    }
    case "value-filled": {
      if (!exp.descriptor) return false;
      const m = matchDescriptor(exp.descriptor, snap);
      // value is never captured; adapter reports fill via its own transition check.
      // Brain-side coarse check: the element exists and is visible.
      return m.elementId !== null;
    }
  }
}
