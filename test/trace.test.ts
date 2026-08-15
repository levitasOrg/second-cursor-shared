import { describe, it, expect } from "vitest";
import { ClientDeltaSchema } from "../src/trace.js";
import { makeEnvelope } from "../src/messages.js";

const validDelta = {
  kind: "crash" as const,
  fingerprint: "abc123",
  ext: { version: "1.0.0", browser: "chrome" },
  settings: { clickEmphasis: "drop-arrow", explainPointer: "spotlight",
    tooltipMode: "ghost", elderly: false, skin: "matrix" },
  errorName: "TypeError",
  render: { targetResolved: false, targetVisible: false,
    surfaceMounted: "none", placement: "below" },
  freeText: { errorMessage: "x is not a function", logs: [
    { ts: 1, level: "warn", src: "renderer", msg: "target e104 resolved to null" }] },
};

describe("ClientDeltaSchema", () => {
  it("accepts a well-formed delta", () => {
    expect(ClientDeltaSchema.safeParse(validDelta).success).toBe(true);
  });

  it("rejects a full URL in an open field — hostname only", () => {
    const bad = { ...validDelta, app: "https://github.com/org/repo?token=abc" };
    expect(ClientDeltaSchema.safeParse(bad).success).toBe(false);
  });

  it("rejects an unknown open field so the allowlist cannot drift", () => {
    const bad = { ...validDelta, pageTitle: "Inbox (3) — priya@example.com" };
    expect(ClientDeltaSchema.safeParse(bad).success).toBe(false);
  });

  it("carries REPORT through makeEnvelope", () => {
    const env = makeEnvelope("REPORT", validDelta, "s1");
    expect(env.type).toBe("REPORT");
    expect((env.payload as typeof validDelta).kind).toBe("crash");
  });
});
