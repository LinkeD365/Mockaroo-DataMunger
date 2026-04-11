export interface SavedConfigField {
  logicalName: string;
  include: boolean;
  percBlank: number;
  selectedMockName?: string;
  selectedValues?: Array<{ label: string; value: string }>;
  fixedValue?: unknown;
  parentTableLogical?: string;
  parentTableSetName?: string;
  parameters?: Record<string, unknown>;
}

export interface SavedConfigFile {
  version: number;
  tableLogical: string;
  tableLabel: string;
  rowCount: number;
  fields: SavedConfigField[];
}

export interface SavedDataset {
  version: number;
  configNames: string[];
}

export type SavedConfigStore = Record<string, SavedConfigFile>;
export type SavedDatasetStore = Record<string, SavedDataset>;

export const SAVED_CONFIGS_KEY = "mockarooSavedConfigs";
export const SAVED_DATASETS_KEY = "mockarooSavedDatasets";
