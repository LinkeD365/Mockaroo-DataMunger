export const MAX_RECORD_COUNT = 1000;
export const RECORD_BATCH_SIZE = 100;
export const MAX_CONCURRENT_BATCHES = 3;

export function validateRecordCount(recordCount: number): void {
  if (!Number.isInteger(recordCount) || recordCount < 1 || recordCount > MAX_RECORD_COUNT) {
    throw new Error(`Record count must be a whole number between 1 and ${MAX_RECORD_COUNT}.`);
  }
}

export class DataverseBatchError extends Error {
  readonly createdCount: number;
  readonly failedBatchCount: number;

  constructor(createdCount: number, failedBatchCount: number, cause: unknown) {
    const safeDetail =
      cause instanceof Error && cause.message === "The active Dataverse connection changed. Review the target and try again."
        ? ` ${cause.message}`
        : "";
    super(
      `Dataverse creation failed in ${failedBatchCount} batch(es). ${createdCount} record(s) were confirmed created before the failure.${safeDetail}`,
      { cause },
    );
    this.name = "DataverseBatchError";
    this.createdCount = createdCount;
    this.failedBatchCount = failedBatchCount;
  }
}

export async function createInBatches<T>(
  records: T[],
  createBatch: (batch: T[]) => Promise<string[]>,
): Promise<string[]> {
  const batches: T[][] = [];
  for (let offset = 0; offset < records.length; offset += RECORD_BATCH_SIZE) {
    batches.push(records.slice(offset, offset + RECORD_BATCH_SIZE));
  }

  const createdIds: string[] = [];
  let createdCount = 0;
  for (let offset = 0; offset < batches.length; offset += MAX_CONCURRENT_BATCHES) {
    const batchGroup = batches.slice(offset, offset + MAX_CONCURRENT_BATCHES);
    const results = await Promise.allSettled(batchGroup.map((batch) => createBatch(batch)));
    const failures: PromiseRejectedResult[] = [];

    for (const result of results) {
      if (result.status === "fulfilled") {
        createdIds.push(...result.value);
        createdCount += result.value.length;
      } else {
        failures.push(result);
      }
    }

    if (failures.length > 0) {
      throw new DataverseBatchError(createdCount, failures.length, failures[0].reason);
    }
  }

  return createdIds;
}
