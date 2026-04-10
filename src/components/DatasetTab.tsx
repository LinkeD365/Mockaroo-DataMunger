import React from "react";
import { observer } from "mobx-react";
import { ViewModel } from "../model/viewModel";
import { Button, Combobox, Option, makeStyles } from "@fluentui/react-components";

interface SavedConfigField {
  logicalName: string;
  include: boolean;
  percBlank: number;
  selectedMockName?: string;
  selectedValues?: Array<{ label: string; value: string }>;
  fixedValue?: unknown;
  parameters?: Record<string, unknown>;
}

interface SavedConfigFile {
  version: number;
  tableLogical: string;
  tableLabel: string;
  rowCount: number;
  fields: SavedConfigField[];
}

interface SavedDataset {
  version: number;
  configNames: string[];
}

type SavedConfigStore = Record<string, SavedConfigFile>;
type SavedDatasetStore = Record<string, SavedDataset>;

const SAVED_CONFIGS_KEY = "mockarooSavedConfigs";
const SAVED_DATASETS_KEY = "mockarooSavedDatasets";

const useStyles = makeStyles({
  container: {
    padding: "12px",
    display: "flex",
    flexDirection: "column",
    gap: "10px",
    height: "100%",
    minHeight: 0,
  },
  controls: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    flexWrap: "wrap",
  },
  lists: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "12px",
    flex: 1,
    minHeight: 0,
  },
  pane: {
    border: "1px solid #444",
    borderRadius: "4px",
    padding: "8px",
    minHeight: 0,
    height: "100%",
    overflowY: "auto",
  },
  heading: {
    fontWeight: "600",
    marginBottom: "8px",
  },
  item: {
    border: "1px solid #555",
    borderRadius: "4px",
    padding: "6px 8px",
    marginBottom: "6px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "8px",
    cursor: "grab",
    backgroundColor: "#1f1f1f",
  },
  dropZone: {
    border: "1px dashed #666",
    borderRadius: "4px",
    padding: "10px",
    textAlign: "center",
    color: "#aaa",
    marginTop: "8px",
  },
  orderText: {
    opacity: 0.8,
    marginRight: "6px",
    minWidth: "20px",
  },
  itemTextWrap: {
    display: "flex",
    flexDirection: "column",
    minWidth: 0,
  },
  itemTitle: {
    display: "flex",
    alignItems: "center",
    minWidth: 0,
  },
  itemInlineMeta: {
    opacity: 0.75,
    fontSize: "11px",
    marginLeft: "8px",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  itemSubText: {
    opacity: 0.75,
    fontSize: "11px",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
});

interface DatasetTabProps {
  viewModel: ViewModel;
  onLog: (message: string, type?: "info" | "success" | "warning" | "error") => void;
  onRunDataset: () => Promise<void>;
  runningDataset: boolean;
}

type DragState = { source: "available" | "ordered"; name: string; index?: number } | null;

export const DatasetTab = observer((props: DatasetTabProps): React.JSX.Element => {
  const { viewModel, onLog, onRunDataset, runningDataset } = props;
  const styles = useStyles();
  const [savedConfigNames, setSavedConfigNames] = React.useState<string[]>([]);
  const [savedDatasetNames, setSavedDatasetNames] = React.useState<string[]>([]);
  const [datasetName, setDatasetName] = React.useState<string>(viewModel.selectedDatasetName || "");
  const [orderedConfigNames, setOrderedConfigNames] = React.useState<string[]>([]);
  const [configTableDisplayByName, setConfigTableDisplayByName] = React.useState<Record<string, string>>({});
  const [dragState, setDragState] = React.useState<DragState>(null);

  const refresh = React.useCallback(async () => {
    const configStore = ((await window.toolboxAPI.settings.get(SAVED_CONFIGS_KEY)) || {}) as SavedConfigStore;
    const datasetStore = ((await window.toolboxAPI.settings.get(SAVED_DATASETS_KEY)) || {}) as SavedDatasetStore;

    setSavedConfigNames(Object.keys(configStore).sort((a, b) => a.localeCompare(b)));
    const tableDisplayByName: Record<string, string> = {};
    Object.entries(configStore).forEach(([name, cfg]) => {
      const label = cfg.tableLabel || cfg.tableLogical;
      tableDisplayByName[name] = `${label} [${cfg.tableLogical}] - ${cfg.rowCount} rows`;
    });
    setConfigTableDisplayByName(tableDisplayByName);
    setSavedDatasetNames(Object.keys(datasetStore).sort((a, b) => a.localeCompare(b)));
  }, [viewModel]);

  React.useEffect(() => {
    void refresh();
  }, [refresh]);

  const onDropAtIndex = (targetIndex?: number) => {
    if (!dragState) {
      return;
    }

    setOrderedConfigNames((prev) => {
      let next = [...prev];

      if (dragState.source === "available") {
        if (!next.includes(dragState.name)) {
          if (targetIndex === undefined || targetIndex < 0 || targetIndex > next.length) {
            next.push(dragState.name);
          } else {
            next.splice(targetIndex, 0, dragState.name);
          }
        }
      } else {
        const sourceIndex = dragState.index ?? next.indexOf(dragState.name);
        if (sourceIndex >= 0) {
          const [moved] = next.splice(sourceIndex, 1);
          if (targetIndex === undefined || targetIndex < 0 || targetIndex > next.length) {
            next.push(moved);
          } else {
            const adjusted = sourceIndex < targetIndex ? targetIndex - 1 : targetIndex;
            next.splice(adjusted, 0, moved);
          }
        }
      }

      return next;
    });

    setDragState(null);
  };

  const saveDataset = async (): Promise<void> => {
    const trimmedDatasetName = datasetName.trim();
    if (!trimmedDatasetName) {
      window.toolboxAPI.utils.showNotification({
        title: "Dataset Name Required",
        body: "Enter a dataset name before saving.",
        type: "warning",
      });
      return;
    }

    if (orderedConfigNames.length === 0) {
      window.toolboxAPI.utils.showNotification({
        title: "No Configs In Dataset",
        body: "Drag one or more saved configs into the ordered list.",
        type: "warning",
      });
      return;
    }

    const missing = orderedConfigNames.filter((name) => !savedConfigNames.includes(name));
    if (missing.length > 0) {
      window.toolboxAPI.utils.showNotification({
        title: "Invalid Config Names",
        body: `These configs were not found: ${missing.join(", ")}`,
        type: "warning",
      });
      return;
    }

    const datasetStore = ((await window.toolboxAPI.settings.get(SAVED_DATASETS_KEY)) || {}) as SavedDatasetStore;
    datasetStore[trimmedDatasetName] = {
      version: 1,
      configNames: [...orderedConfigNames],
    };

    await window.toolboxAPI.settings.set(SAVED_DATASETS_KEY, datasetStore);
    setSavedDatasetNames(Object.keys(datasetStore).sort((a, b) => a.localeCompare(b)));
    setDatasetName(trimmedDatasetName);
    viewModel.selectedDatasetName = trimmedDatasetName;

    window.toolboxAPI.utils.showNotification({
      title: "Dataset Saved",
      body: `Dataset '${trimmedDatasetName}' saved with ${orderedConfigNames.length} config(s).`,
      type: "success",
    });
    onLog(`Dataset '${trimmedDatasetName}' saved`, "success");
  };

  const loadSelectedDataset = async (name: string): Promise<void> => {
    const datasetStore = ((await window.toolboxAPI.settings.get(SAVED_DATASETS_KEY)) || {}) as SavedDatasetStore;
    const dataset = datasetStore[name];

    setDatasetName(name);
    setOrderedConfigNames(dataset?.configNames || []);
    viewModel.selectedDatasetName = name;
  };

  const removeOrderedItem = (name: string) => {
    setOrderedConfigNames((prev) => prev.filter((item) => item !== name));
  };

  return (
    <div className={styles.container}>
      <div className={styles.controls}>
        <Combobox
          size="small"
          placeholder="Dataset"
          value={datasetName}
          onChange={(e) => {
            const value = e.target.value;
            setDatasetName(value);
            if (!value) {
              setOrderedConfigNames([]);
              viewModel.selectedDatasetName = "";
            }
          }}
          onOptionSelect={(_e, data) => {
            const selected = data.optionValue || "";
            if (selected) {
              void loadSelectedDataset(selected);
            } else {
              setDatasetName("");
              setOrderedConfigNames([]);
              viewModel.selectedDatasetName = "";
            }
          }}
          style={{ width: "220px" }}
          clearable
        >
          {savedDatasetNames.map((name) => (
            <Option key={name} value={name} text={name}>
              {name}
            </Option>
          ))}
        </Combobox>
        <Button size="small" appearance="secondary" onClick={() => void saveDataset()}>
          Save Dataset
        </Button>
        <Button
          size="small"
          appearance="primary"
          disabled={runningDataset || !viewModel.selectedDatasetName}
          onClick={() => void onRunDataset()}
        >
          Run Dataset
        </Button>
      </div>

      <div className={styles.lists}>
        <div className={styles.pane}>
          <div className={styles.heading}>Saved Configs</div>
          {savedConfigNames.map((name) => (
            <div
              key={name}
              className={styles.item}
              draggable
              onDragStart={() => setDragState({ source: "available", name })}
              title="Drag into ordered list"
            >
              <div className={styles.itemTextWrap}>
                <div className={styles.itemTitle}>
                  <span>{name}</span>
                  <span className={styles.itemInlineMeta}>{configTableDisplayByName[name] || "Unknown table"}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div
          className={styles.pane}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            onDropAtIndex();
          }}
        >
          <div className={styles.heading}>Dataset Order</div>
          {orderedConfigNames.map((name, index) => (
            <div
              key={`${name}-${index}`}
              className={styles.item}
              draggable
              onDragStart={() => setDragState({ source: "ordered", name, index })}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                onDropAtIndex(index);
              }}
              title="Drag to reorder"
            >
              <div className={styles.itemTextWrap}>
                <div className={styles.itemTitle}>
                  <span className={styles.orderText}>{index + 1}.</span>
                  <span>{name}</span>
                  <span className={styles.itemInlineMeta}>{configTableDisplayByName[name] || "Unknown table"}</span>
                </div>
              </div>
              <Button size="small" appearance="subtle" onClick={() => removeOrderedItem(name)}>
                Remove
              </Button>
            </div>
          ))}

          {orderedConfigNames.length === 0 && (
            <div className={styles.dropZone}>Drop saved configs here to define order</div>
          )}
        </div>
      </div>
    </div>
  );
});
