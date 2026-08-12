import { describe, it, expect } from "vitest";
import { fingerprintFromDigest, fingerprintMatch } from "../src/index.js";

describe("fingerprintMatch", () => {
  it("same app + overlapping landmarks scores high", () => {
    const a = fingerprintFromDigest({ app: "mail.google.com", title: "Inbox", locale: "en",
      landmarks: ["Inbox", "Sent"], keyButtons: ["Compose", "Send"] });
    const b = fingerprintFromDigest({ app: "mail.google.com", title: "Inbox", locale: "en",
      landmarks: ["Inbox"], keyButtons: ["Compose"] });
    expect(fingerprintMatch(a, b)).toBeGreaterThan(0.5);
  });

  it("different app scores 0", () => {
    const a = fingerprintFromDigest({ app: "mail.google.com", title: "", locale: "en", landmarks: [], keyButtons: [] });
    const b = fingerprintFromDigest({ app: "youtube.com", title: "", locale: "en", landmarks: [], keyButtons: [] });
    expect(fingerprintMatch(a, b)).toBe(0);
  });

  it("identical fingerprints score 1", () => {
    const a = fingerprintFromDigest({ app: "mail.google.com", title: "Inbox", locale: "en",
      landmarks: ["Inbox"], keyButtons: ["Compose"] });
    expect(fingerprintMatch(a, a)).toBe(1);
  });

  it("empty landmarks/keyButtons on same app+locale still match (selectable)", () => {
    const a = fingerprintFromDigest({ app: "example.com", title: "", locale: "en", landmarks: [], keyButtons: [] });
    const b = fingerprintFromDigest({ app: "example.com", title: "", locale: "en", landmarks: [], keyButtons: [] });
    expect(fingerprintMatch(a, b)).toBeGreaterThan(0.5);
  });

  it("locale mismatch caps the score at 0.5", () => {
    const a = fingerprintFromDigest({ app: "mail.google.com", title: "", locale: "en",
      landmarks: ["Inbox", "Sent"], keyButtons: ["Compose", "Send"] });
    const b = fingerprintFromDigest({ app: "mail.google.com", title: "", locale: "de",
      landmarks: ["Inbox", "Sent"], keyButtons: ["Compose", "Send"] });
    expect(fingerprintMatch(a, b)).toBeLessThanOrEqual(0.5);
  });

  it("fingerprintFromDigest keeps app/locale/landmarks/keyButtons and drops title", () => {
    const fp = fingerprintFromDigest({ app: "a.com", title: "T", locale: "en",
      landmarks: ["L"], keyButtons: ["B"] });
    expect(fp).toEqual({ app: "a.com", locale: "en", landmarks: ["L"], keyButtons: ["B"] });
  });
});
