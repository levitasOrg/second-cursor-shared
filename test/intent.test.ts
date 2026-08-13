import { describe, it, expect } from "vitest";
import { IntentIndex, INTENT_MATCH, INTENT_STRONG, INTENT_AMBIGUITY,
  isExplainAsk, isAmbiguousMatch, classifyAsk } from "../src/index.js";

describe("isExplainAsk", () => {
  it("classifies comprehension asks as explain", () => {
    for (const q of ["explain this page", "what is this button", "is this email a scam?",
      "what does this badge mean", "why is this here", "tell me about this section"])
      expect(isExplainAsk(q)).toBe(true);
    for (const q of ["search for cats", "attach a photo", "open settings", "send the email"])
      expect(isExplainAsk(q)).toBe(false);
  });
});

describe("classifyAsk", () => {
  it("classifies mode + explain depth per the §5/§22a table", () => {
    const table: Array<[string, boolean,
        { mode: "guide" | "explain"; depth?: "gist" | "full" | "focused" }]> = [
      // plain explain asks → gist
      ["explain this page", false, { mode: "explain", depth: "gist" }],
      ["what is this button", false, { mode: "explain", depth: "gist" }],
      ["tell me about this section", false, { mode: "explain", depth: "gist" }],
      // whole-page markers → full
      ["explain the whole page", false, { mode: "explain", depth: "full" }],
      ["explain the entire form", false, { mode: "explain", depth: "full" }],
      ["what does everything here do", false, { mode: "explain", depth: "full" }],
      ["explain all of it", false, { mode: "explain", depth: "full" }],
      ["describe this page fully", false, { mode: "explain", depth: "full" }],
      // a selection makes any non-guide-verb ask a focused explain
      ["explain what I selected", true, { mode: "explain", depth: "focused" }],
      ["what does this mean", true, { mode: "explain", depth: "focused" }],
      ["hmm", true, { mode: "explain", depth: "focused" }],
      // guide verbs → guide, no depth — and the override beats a selection
      ["search for cats", false, { mode: "guide" }],
      ["open settings", false, { mode: "guide" }],
      ["go to my orders", false, { mode: "guide" }],
      ["delete my account", true, { mode: "guide" }],
      ["click the blue button", true, { mode: "guide" }],
      // non-explain, non-verb, no selection → guide
      ["attach a photo", false, { mode: "guide" }],
    ];
    for (const [q, hasSelection, expected] of table)
      expect(classifyAsk(q, hasSelection), `${q} (sel=${hasSelection})`).toEqual(expected);
  });

  it("defaults hasSelection to false", () => {
    expect(classifyAsk("explain this page")).toEqual({ mode: "explain", depth: "gist" });
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

  it("surfaces the runner-up on a near-tie instead of hiding it (§5 tiebreak)", () => {
    const idx = new IntentIndex();
    // Two intents in the SAME app whose examples share the `send` token, so the
    // query "send" lands equally close to both (0.8165 each — well above the
    // 0.50 floor, yet within INTENT_AMBIGUITY). match() no longer swallows the
    // tie: it returns the best WITH `second` populated, and callers decide —
    // the store's Tier-1 lookup treats it as a miss (guard preserved) while the
    // session can ask the user which one they meant (§5).
    idx.add("gmail.sendEmail", "mail.google.com", ["send email", "send a message"]);
    idx.add("gmail.sendFile", "mail.google.com", ["send file", "send attachment"]);
    const m = idx.match("send", "mail.google.com");
    expect(m).not.toBeNull();
    expect(m!.second).toBeDefined();
    expect(m!.score - m!.second!.score).toBeLessThan(INTENT_AMBIGUITY);
    expect(new Set([m!.intentId, m!.second!.key]))
      .toEqual(new Set(["gmail.sendEmail", "gmail.sendFile"]));
    expect(isAmbiguousMatch(m!)).toBe(true);
  });

  it("a decisive best match is not ambiguous (wide gap or no runner-up)", () => {
    const idx = new IntentIndex();
    idx.add("gmail.search", "mail.google.com", ["search my mail"]);
    const solo = idx.match("search my mail", "mail.google.com");
    expect(solo).not.toBeNull();
    expect(solo!.second).toBeUndefined();
    expect(isAmbiguousMatch(solo!)).toBe(false);
    // Add a distant second intent: still surfaced, still not ambiguous.
    idx.add("gmail.archive", "mail.google.com", ["archive selected mail conversations"]);
    const m = idx.match("search my mail", "mail.google.com");
    expect(m!.intentId).toBe("gmail.search");
    if (m!.second) expect(isAmbiguousMatch(m!)).toBe(false);
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
