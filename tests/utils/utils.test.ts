import { afterEach, describe, expect, it, vi } from "vitest";
import { setToolboxApi, clearToolboxApi } from "../testHelpers";
import { UtilLib } from "../../src/utils/utils";

describe("UtilLib", () => {
  afterEach(clearToolboxApi);

  it("notifies the user and logs a surfaced error", async () => {
    const showNotification = vi.fn().mockResolvedValue(undefined);
    setToolboxApi({ utils: { showNotification } });
    const onLog = vi.fn();

    await new UtilLib({ onLog }).alert("Lookup failed", "The search could not be completed.");

    expect(showNotification).toHaveBeenCalledWith({
      title: "Lookup failed",
      body: "The search could not be completed.",
      type: "error",
    });
    expect(onLog).toHaveBeenCalledWith("Alert shown: The search could not be completed.", "error");
  });
});
