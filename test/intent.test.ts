import { describe, it, expect } from "vitest";
import { IntentIndex, INTENT_MATCH, INTENT_STRONG } from "../src/index.js";

describe("IntentIndex", () => {
  it("matches a paraphrase to the same intent within an app", () => {
    const idx = new IntentIndex();
    // add(intentId, app, examples) — app arg included per finalized signature.
    // Seed with a realistic example pool (see recipe/intent notes): a single
    // "search for X" phrase shares only `search`+`for` with a "spider man"
    // query, which lexically tops out at ~0.57 — below INTENT_MATCH. A real
    // intent accumulates several phrasings; the pooled vector then clears 0.62.
    idx.add("gmail.search", "mail.google.com", [
      "how do i search for apples",
      "search my mail",
      "how do i search for messages",
    ]);
    const m = idx.match("how do I search for spider man", "mail.google.com");
    expect(m?.intentId).toBe("gmail.search");
    expect(m!.score).toBeGreaterThanOrEqual(INTENT_MATCH);
  });

  it("returns null for an unrelated question", () => {
    const idx = new IntentIndex();
    idx.add("gmail.compose", "mail.google.com", ["write a new email", "compose message"]);
    expect(idx.match("what is the weather today", "mail.google.com")).toBeNull();
  });

  it("does not match across different apps", () => {
    const idx = new IntentIndex();
    idx.add("gmail.search", "mail.google.com", ["search my mail"]);
    expect(idx.match("search my mail", "youtube.com")).toBeNull();
  });

  it("bands classify by strong/match/new thresholds", () => {
    const idx = new IntentIndex();
    expect(idx.bands(INTENT_STRONG)).toBe("match");
    expect(idx.bands(0.9)).toBe("match");
    expect(idx.bands(INTENT_MATCH)).toBe("gray");
    expect(idx.bands(0.7)).toBe("gray");
    expect(idx.bands(0.3)).toBe("new");
  });

  it("exposes the threshold constants", () => {
    expect(INTENT_MATCH).toBe(0.62);
    expect(INTENT_STRONG).toBe(0.85);
  });
});
