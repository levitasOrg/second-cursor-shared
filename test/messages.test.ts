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
