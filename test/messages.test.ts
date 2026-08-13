import { describe, it, expect } from "vitest";
import { makeEnvelope, parseEnvelope } from "../src/index.js";

describe("phase 1G additive messages", () => {
  it("round-trips the 1G additive messages", () => {
    const qa = makeEnvelope("QUICK_ASKS_GET", { app: "mail.google.com" });
    expect(parseEnvelope(JSON.stringify(qa)).type).toBe("QUICK_ASKS_GET");
    const list = makeEnvelope("QUICK_ASKS", { items: [{ question: "attach a photo", uses: 4 }] });
    expect((parseEnvelope(JSON.stringify(list)).payload as any).items[0].uses).toBe(4);
    const pick = makeEnvelope("TIEBREAK_PICK", { choice: "neither" }, "s1");
    expect((parseEnvelope(JSON.stringify(pick)).payload as any).choice).toBe("neither");
    const st = makeEnvelope("STATUS", { state: "continuing", detail: "attach a photo" }, "s1");
    expect((parseEnvelope(JSON.stringify(st)).payload as any).detail).toBe("attach a photo");
    const end = makeEnvelope("SESSION_END", { outcome: "done", message: "m", recap: [],
      masteryNote: "that's 3 tasks you've mastered" }, "s1");
    expect((parseEnvelope(JSON.stringify(end)).payload as any).masteryNote).toContain("3 tasks");
  });
});

describe("phase 1H additive fields", () => {
  it("round-trips the 1H additive fields", () => {
    const ask = makeEnvelope("ASK", { text: "explain this", mouse: { x: 1, y: 2 },
      digest: { app: "a.com", title: "T", locale: "en", landmarks: [], keyButtons: [],
        outline: [{ kind: "heading", level: 2, name: "History" }, { kind: "landmark", name: "navigation" }] },
      selection: { text: "The cat is a domesticated species.", bounds: [10, 20, 300, 40] } });
    const p = parseEnvelope(JSON.stringify(ask)).payload as any;
    expect(p.digest.outline[0].name).toBe("History");
    expect(p.selection.text).toContain("domesticated");
    const step = { index: 0, action: "narrate", anchor: "selection",
      instruction: "n", why: "w", render: "full" };
    const env = makeEnvelope("STEP", { step, totalSteps: 1 }, "s1");
    expect((parseEnvelope(JSON.stringify(env)).payload as any).step.anchor).toBe("selection");
  });
});
