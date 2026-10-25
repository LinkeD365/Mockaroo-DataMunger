import { describe, expect, it, vi } from "vitest";
import {
  createInBatches,
  DataverseBatchError,
  MAX_CONCURRENT_BATCHES,
  MAX_RECORD_COUNT,
  RECORD_BATCH_SIZE,
  validateRecordCount,
} from "../../src/utils/bulkOperations";

describe("record limits", () => {
  it("accepts whole-number counts up to the configured cap", () => {
    expect(() => validateRecordCount(1)).not.toThrow();
    expect(() => validateRecordCount(MAX_RECORD_COUNT)).not.toThrow();
  });

  it.each([0, -1, 1.5, Number.NaN, MAX_RECORD_COUNT + 1])("rejects invalid count %s", (count) => {
    expect(() => validateRecordCount(count)).toThrow(
      `Record count must be a whole number between 1 and ${MAX_RECORD_COUNT}.`,
    );
  });
});

describe("createInBatches", () => {
  it("uses batches of at most 100 and limits concurrent requests", async () => {
    let active = 0;
    let maximumActive = 0;
    const createBatch = vi.fn(async (batch: number[]) => {
      active += 1;
      maximumActive = Math.max(maximumActive, active);
      await new Promise((resolve) => setTimeout(resolve, 1));
      active -= 1;
      return batch.map(String);
    });

    const ids = await createInBatches(Array.from({ length: 1000 }, (_, index) => index), createBatch);

    expect(ids).toHaveLength(1000);
    expect(createBatch).toHaveBeenCalledTimes(10);
    expect(createBatch.mock.calls.every(([batch]) => batch.length <= RECORD_BATCH_SIZE)).toBe(true);
    expect(maximumActive).toBeLessThanOrEqual(MAX_CONCURRENT_BATCHES);
    expect(maximumActive).toBe(MAX_CONCURRENT_BATCHES);
  });

  it("surfaces confirmed partial success and stops after a failed group", async () => {
    const createBatch = vi
      .fn<(batch: number[]) => Promise<string[]>>()
      .mockImplementationOnce(async (batch) => batch.map(String))
      .mockImplementationOnce(async (batch) => batch.map(String))
      .mockRejectedValueOnce(new Error("request failed"))
      .mockResolvedValue(["must not run"]);

    await expect(createInBatches(Array.from({ length: 401 }, (_, index) => index), createBatch)).rejects.toMatchObject({
      name: "DataverseBatchError",
      createdCount: 200,
      failedBatchCount: 1,
    } satisfies Partial<DataverseBatchError>);
    expect(createBatch).toHaveBeenCalledTimes(3);
  });
});
