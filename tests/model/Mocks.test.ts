import { describe, expect, it } from "vitest";
import mocks from "../../src/model/Mocks.json";

describe("mock type catalog", () => {
  it("provides a named array of mock types with parameter arrays", () => {
    expect(Array.isArray(mocks.types)).toBe(true);
    expect(mocks.types.length).toBeGreaterThan(0);
    expect(
      mocks.types.every(
        (mock) =>
          typeof mock.name === "string" &&
          typeof mock.type === "string" &&
          (mock.parameters === undefined || Array.isArray(mock.parameters)),
      ),
    ).toBe(true);
  });
});
