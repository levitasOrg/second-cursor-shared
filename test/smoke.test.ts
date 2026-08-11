import { describe, it, expect } from "vitest";
import { PROTOCOL_VERSION } from "../src/index.js";

describe("workspace", () => {
  it("exports protocol version 1", () => {
    expect(PROTOCOL_VERSION).toBe(1);
  });
});
