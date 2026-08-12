import { describe, it, expect } from "vitest";
import { IntentIndex, INTENT_MATCH, INTENT_STRONG, INTENT_AMBIGUITY,
  isExplainAsk } from "../src/index.js";

describe("isExplainAsk", () => {
  it("classifies comprehension asks as explain", () => {
    for (const q of ["explain this page", "what is this button", "is this email a scam?",
      "what does this badge mean", "why is this here", "tell me about this section"])
      expect(isExplainAsk(q)).toBe(true);
    for (const q of ["search for cats", "attach a photo", "open settings", "send the email"])
      expect(isExplainAsk(q)).toBe(false);
  });
});

describe("IntentIndex", () => {
  it("matches a paraphrase to the same intent within an app", () => {
    const idx = new IntentIndex();
    // add(intentId, app, examples) — app arg included per finalized signature.
    // A "search for X" phrase shares only `search`+`for` with a "spider man"
    // query, which lexically tops out at ~0.57. That is below the old 0.62
    // floor but clears the loosened 0.50 floor — so only TWO seed phrasings
    // are needed now; Tier-1 re-validation is the safety net for loose matches.
    idx.add("gmail.search", "mail.google.com", [
      "how do i search for apples",
      "search my mail",
    ]);
    const m = idx.match("how do I search for spider man", "mail.google.com");
    expect(m?.intentId).toBe("gmail.search");
    expect(m!.score).toBeGreaterThanOrEqual(INTENT_MATCH);
  });

  it("returns null when two same-app intents score near-equal (ambiguity guard)", () => {
    const idx = new IntentIndex();
    // Two intents in the SAME app whose examples share the `send` token, so the
    // query "send" lands equally close to both (0.8165 each — well above the
    // 0.50 floor, yet within INTENT_AMBIGUITY). A genuinely ambiguous match is
    // worse than a miss (spec §20): return null and let Tier-3 disambiguate.
    idx.add("gmail.sendEmail", "mail.google.com", ["send email", "send a message"]);
    idx.add("gmail.sendFile", "mail.google.com", ["send file", "send attachment"]);
    expect(idx.match("send", "mail.google.com")).toBeNull();
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
    expect(INTENT_MATCH).toBe(0.5);
    expect(INTENT_STRONG).toBe(0.85);
    expect(INTENT_AMBIGUITY).toBe(0.08);
  });
});
