// @vitest-environment node

import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("release workflow", () => {
  it("uses the Node release strategy without requiring manifest configuration", () => {
    const workflow = readFileSync(new URL("../.github/workflows/main.yml", import.meta.url), "utf8");

    expect(workflow).toMatch(
      /uses: googleapis\/release-please-action@[^\n]+\n\s+with:\n\s+release-type: node(?:\r?\n|$)/,
    );
  });
});
