import { describe, it, expect } from "vitest";
import { matchDescriptor, checkExpectedAfter } from "../src/index.js";
import type { UISnapshot, ElementNode } from "../src/index.js";

function el(id: string, role: string, name: string, x = 0, y = 0): ElementNode {
  return { id, role, name, text: name, bounds: [x, y, 100, 30],
    state: ["visible", "enabled"], parent: null, value: null };
}
function snap(elements: ElementNode[]): UISnapshot {
  return { v: 1, platform: "chrome", app: "t.com", locale: "en",
    viewport: { w: 1000, h: 800, scrollY: 0 }, mouse: { x: 0, y: 0 }, elements };
}

describe("matchDescriptor", () => {
  it("finds an exact role+name match with high confidence", () => {
    const r = matchDescriptor({ role: "button", name: "Send" },
      snap([el("e1", "button", "Send"), el("e2", "link", "Help")]));
    expect(r.elementId).toBe("e1");
    expect(r.confidence).toBeGreaterThan(0.8);
    expect(r.ambiguous).toBe(false);
  });
  it("matches case-insensitively and on partial names", () => {
    const r = matchDescriptor({ role: "button", name: "compose" },
      snap([el("e1", "button", "Compose email")]));
    expect(r.elementId).toBe("e1");
  });
  it("flags ambiguity when two equal candidates exist", () => {
    const r = matchDescriptor({ role: "button", name: "Send" },
      snap([el("e1", "button", "Send", 0, 0), el("e2", "button", "Send", 0, 400)]));
    expect(r.ambiguous).toBe(true);
  });
  it("returns null below the confidence floor", () => {
    const r = matchDescriptor({ role: "button", name: "Compose" },
      snap([el("e1", "link", "Pricing")]));
    expect(r.elementId).toBeNull();
  });
});

describe("checkExpectedAfter", () => {
  it("element-visible passes when descriptor matches a visible element", () => {
    expect(checkExpectedAfter({ kind: "element-visible",
      descriptor: { role: "dialog", name: "Compose" } },
      snap([el("e9", "dialog", "Compose")]), { urlChanged: false })).toBe(true);
  });
  it("url-changed uses ctx flag", () => {
    expect(checkExpectedAfter({ kind: "url-changed" }, snap([]), { urlChanged: true })).toBe(true);
    expect(checkExpectedAfter({ kind: "url-changed" }, snap([]), { urlChanged: false })).toBe(false);
  });
  it("element-focused requires focused state", () => {
    const focused = { ...el("e1", "textbox", "Search"),
      state: ["visible","enabled","focused"] as ElementNode["state"] };
    expect(checkExpectedAfter({ kind: "element-focused",
      descriptor: { role: "textbox", name: "Search" } },
      snap([focused as ElementNode]), { urlChanged: false })).toBe(true);
  });
});
