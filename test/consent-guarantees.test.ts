import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { UISnapshotSchema } from "../src/snapshot.js";

/** The consent copy (Penpot page 00) claims "field values are never captured —
 *  a hard rule in the data schema". These tests are that claim's CI gate: if
 *  either fails, the consent screens are lying and must change FIRST. */
describe("consent guarantee: what you type is never captured", () => {
  it("snapshot.ts still declares the value INVARIANT in source", () => {
    const src = readFileSync(
      fileURLToPath(new URL("../src/snapshot.ts", import.meta.url)), "utf8");
    expect(src).toMatch(/value:\s*z\.null\(\)/);
  });

  it("a snapshot carrying a typed value is rejected at runtime", () => {
    const el = { id: "e1", role: "textbox", name: "Search", value: "typed secret",
      bounds: [0, 0, 10, 10], enabled: true, visible: true };
    const snap = { url: "https://x.org", title: "t", elements: [el] };
    expect(UISnapshotSchema.safeParse(snap).success).toBe(false);
  });
});
