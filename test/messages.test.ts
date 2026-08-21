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

describe("phase 1I additive fields", () => {
  it("round-trips the 1I additive fields", () => {
    const ask = makeEnvelope("ASK", { text: "what is this?", mouse: { x: 5, y: 6 },
      digest: { app: "a.com", title: "T", locale: "en", landmarks: [], keyButtons: [] },
      pointer: { elementId: "e7", role: "button", name: "Pay invoice now",
        bounds: [100, 200, 120, 32] } });
    const p = parseEnvelope(JSON.stringify(ask)).payload as any;
    expect(p.pointer.elementId).toBe("e7");
    expect(p.pointer.name).toContain("Pay invoice");
    const ev = makeEnvelope("EVENT", { kind: "struggle",
      detail: "circling near Send", elementId: "e3" }, "s1");
    expect((parseEnvelope(JSON.stringify(ev)).payload as any).kind).toBe("struggle");
    const ptrStep = { index: 0, action: "narrate", anchor: "pointer",
      instruction: "n", why: "w", render: "full" };
    const env = makeEnvelope("STEP", { step: ptrStep, totalSteps: 1 }, "s1");
    expect((parseEnvelope(JSON.stringify(env)).payload as any).step.anchor).toBe("pointer");
    // Regression pin: the 1H selection anchor still round-trips after the widen.
    const selStep = { ...ptrStep, anchor: "selection" };
    const env2 = makeEnvelope("STEP", { step: selStep, totalSteps: 1 }, "s1");
    expect((parseEnvelope(JSON.stringify(env2)).payload as any).step.anchor).toBe("selection");
  });
});

describe("P1-6 error contract — coded refusals + retryAfterSeconds", () => {
  it("ERROR rejects an unknown code (the enum is the contract)", () => {
    expect(() => makeEnvelope("ERROR", { code: "provider", message: "boom" }))
      .toThrow();
  });

  it("ERROR round-trips every contract code without retryAfterSeconds", () => {
    for (const code of ["bad-message", "internal", "busy", "session-cap",
      "daily-cap", "capacity", "signin-required", "token-expired", "rate-limited"]) {
      const env = makeEnvelope("ERROR", { code, message: "m" }, "s1");
      const p = parseEnvelope(JSON.stringify(env)).payload as any;
      expect(p.code).toBe(code);
      expect(p.retryAfterSeconds).toBeUndefined();
    }
  });

  it("retryAfterSeconds is an optional positive-int round-trip", () => {
    const env = makeEnvelope("ERROR",
      { code: "busy", message: "m", retryAfterSeconds: 60 }, "s1");
    expect((parseEnvelope(JSON.stringify(env)).payload as any).retryAfterSeconds)
      .toBe(60);
    expect(() => makeEnvelope("ERROR",
      { code: "busy", message: "m", retryAfterSeconds: 0 })).toThrow();
    expect(() => makeEnvelope("ERROR",
      { code: "busy", message: "m", retryAfterSeconds: 1.5 })).toThrow();
  });
});

describe("P1-6 schema maxima — ask text and hello token", () => {
  const digest = { app: "a.com", title: "T", locale: "en",
    landmarks: [], keyButtons: [] };

  it("ASK text of 2000 chars is accepted, 2001 rejected (audit B4)", () => {
    const ok = makeEnvelope("ASK", { text: "q".repeat(2000), digest,
      mouse: { x: 0, y: 0 } }, "s1");
    expect(((parseEnvelope(JSON.stringify(ok)).payload as any).text as string)
      .length).toBe(2000);
    expect(() => makeEnvelope("ASK", { text: "q".repeat(2001), digest,
      mouse: { x: 0, y: 0 } }, "s1")).toThrow();
  });

  it("HELLO token of 4096 chars is accepted, 4097 rejected", () => {
    const hello = (token: string): unknown => makeEnvelope("HELLO",
      { adapter: "chrome-extension", protocol: 1, capabilities: ["guide"], token });
    expect(() => hello("t".repeat(4096))).not.toThrow();
    expect(() => hello("t".repeat(4097))).toThrow();
  });
});

describe("PART O1 additive fields", () => {
  it("HELLO accepts an optional auth token (additive, protocol stays 1)", () => {
    const bare = makeEnvelope("HELLO",
      { adapter: "chrome-extension", protocol: 1, capabilities: ["guide"] });
    expect(() => parseEnvelope(JSON.stringify(bare))).not.toThrow();
    const withToken = makeEnvelope("HELLO", { adapter: "chrome-extension",
      protocol: 1, capabilities: ["guide"], token: "abc.def.ghi" });
    const parsed = parseEnvelope(JSON.stringify(withToken));
    expect((parsed.payload as { token?: string }).token).toBe("abc.def.ghi");
  });

  it("HELLO accepts an optional deviceId (O1b trial key)", () => {
    const env = makeEnvelope("HELLO", { adapter: "chrome-extension", protocol: 1,
      capabilities: ["guide"], deviceId: "d-123" });
    const parsed = parseEnvelope(JSON.stringify(env));
    expect((parsed.payload as { deviceId?: string }).deviceId).toBe("d-123");
  });
});
