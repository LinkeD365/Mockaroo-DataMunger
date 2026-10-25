import { SavedConfigStore, SavedDataset } from "./savedConfig";
import { Table } from "./viewModel";
import { validateRecordCount } from "../utils/bulkOperations";

export interface DatasetPreviewItem {
  configName: string;
  configSignature: string;
  tableLogical: string;
  tableLabel: string;
  recordCount: number;
}

export interface DatasetPlan {
  datasetName: string;
  datasetConfigNames: string[];
  items: DatasetPreviewItem[];
  warnings: string[];
}

export function createDatasetPlan(
  datasetName: string,
  dataset: SavedDataset | undefined,
  configs: SavedConfigStore,
  tables: Table[],
): DatasetPlan {
  if (!dataset || !Array.isArray(dataset.configNames) || dataset.configNames.length === 0) {
    throw new Error(`Dataset '${datasetName}' was not found or is empty.`);
  }

  const items: DatasetPreviewItem[] = [];
  const warnings: string[] = [];
  for (const configName of dataset.configNames) {
    const savedConfig = configs[configName];
    if (!savedConfig) {
      warnings.push(`Config '${configName}' not found; it will be skipped.`);
      continue;
    }
    const targetTable = tables.find((table) => table.logical === savedConfig.tableLogical);
    if (!targetTable) {
      warnings.push(`Table '${savedConfig.tableLogical}' for config '${configName}' was not found; it will be skipped.`);
      continue;
    }
    validateRecordCount(savedConfig.rowCount);
    items.push({
      configName,
      configSignature: JSON.stringify(savedConfig),
      tableLogical: targetTable.logical,
      tableLabel: targetTable.label,
      recordCount: savedConfig.rowCount,
    });
  }

  if (items.length === 0) {
    throw new Error("No runnable configurations were found in this dataset.");
  }

  return {
    datasetName,
    datasetConfigNames: [...dataset.configNames],
    items,
    warnings,
  };
}

export function assertDatasetPlanUnchanged(
  plan: DatasetPlan,
  dataset: SavedDataset | undefined,
  configs: SavedConfigStore,
): void {
  if (
    !dataset ||
    !Array.isArray(dataset.configNames) ||
    JSON.stringify(dataset.configNames) !== JSON.stringify(plan.datasetConfigNames)
  ) {
    throw new Error("The dataset changed after review. Review it again before creating records.");
  }

  for (const item of plan.items) {
    const savedConfig = configs[item.configName];
    if (!savedConfig || JSON.stringify(savedConfig) !== item.configSignature) {
      throw new Error(`Config '${item.configName}' changed after review. Review the dataset again.`);
    }
  }
}
