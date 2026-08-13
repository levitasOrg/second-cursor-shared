import { describe, it, expect } from "vitest";
import { UISnapshotSchema, parseEnvelope, makeEnvelope, StepSchema } from "../src/index.js";

const el = { id: "e1", role: "button", name: "Send", text: "Send",
  bounds: [10, 10, 80, 32], state: ["visible", "enabled"], parent: null, value: null };
const snap = { v: 1, platform: "chrome", app: "example.com", locale: "en-IN",
  viewport: { w: 1280, h: 800, scrollY: 0 }, mouse: { x: 5, y: 5 }, elements: [el] };

describe("protocol schemas", () => {
  it("accepts a valid snapshot", () => {
    expect(UISnapshotSchema.parse(snap).elements[0]!.id).toBe("e1");
  });
  it("rejects a snapshot whose element has a non-null value", () => {
    const bad = { ...snap, elements: [{ ...el, value: "secret" }] };
    expect(() => UISnapshotSchema.parse(bad)).toThrow();
  });
  it("rejects unknown step actions", () => {
    expect(() => StepSchema.parse({ index: 0, action: "drag", targetId: "e1",
      instruction: "x", why: "y", render: "full" })).toThrow();
  });
  it("round-trips an envelope", () => {
    const env = makeEnvelope("ASK", { text: "how do I send", digest: { app: "example.com",
      title: "Example", locale: "en", landmarks: [], keyButtons: ["Send"] },
      mouse: { x: 1, y: 2 } }, "s1");
    const parsed = parseEnvelope(JSON.stringify(env));
    expect(parsed.type).toBe("ASK");
    expect(parsed.v).toBe(1);
    expect(parsed.sessionId).toBe("s1");
  });
  it("rejects wrong protocol version", () => {
    expect(() => parseEnvelope(JSON.stringify({ v: 2, type: "ASK", payload: {} }))).toThrow();
  });
  it("digest keeps optional pageHeight through an ASK round-trip (Task S5)", () => {
    // pageHeight must be IN the schema: zod strips unknown keys on parse, so a
    // long page's height would silently vanish from the ASK digest otherwise.
    const env = makeEnvelope("ASK", { text: "delete my account", digest: { app: "example.com",
      title: "Example", locale: "en", landmarks: [], keyButtons: [], pageHeight: 5400 },
      mouse: { x: 1, y: 2 } }, "s1");
    expect((env.payload as any).digest.pageHeight).toBe(5400);
    // and it stays optional — a digest without it still parses
    const bare = makeEnvelope("ASK", { text: "hi there", digest: { app: "a.com",
      title: "", locale: "en", landmarks: [], keyButtons: [] }, mouse: { x: 0, y: 0 } }, "s1");
    expect((bare.payload as any).digest.pageHeight).toBeUndefined();
  });
});
