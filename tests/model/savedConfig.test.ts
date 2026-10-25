import { describe, expect, it } from "vitest";
import { SAVED_CONFIGS_KEY, SAVED_DATASETS_KEY } from "../../src/model/savedConfig";

describe("saved setting keys", () => {
  it("uses stable, distinct ToolBox setting keys", () => {
    expect(SAVED_CONFIGS_KEY).toBe("mockarooSavedConfigs");
    expect(SAVED_DATASETS_KEY).toBe("mockarooSavedDatasets");
    expect(SAVED_CONFIGS_KEY).not.toBe(SAVED_DATASETS_KEY);
  });
});
