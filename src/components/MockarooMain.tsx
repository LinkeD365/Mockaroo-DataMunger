import { observer } from "mobx-react";
import { ViewModel, Table } from "../model/viewModel";
import { dvService } from "../utils/dataverse";
import React from "react";
import {
  Button,
  Dialog,
  DialogActions,
  DialogBody,
  DialogContent,
  DialogSurface,
  DialogTitle,
  DialogTrigger,
  makeStyles,
  MessageBar,
  MessageBarBody,
  SelectTabData,
  SelectTabEvent,
  Spinner,
  Tab,
  TabList,
  TabValue,
  Tooltip,
  tokens,
} from "@fluentui/react-components";
import { DatabaseArrowUpFilled, DatabaseCheckmarkFilled } from "@fluentui/react-icons";
import { ConfigTab } from "./ConfigTab";
import { mockarooService } from "../utils/mockaroo";
import { DataTab } from "./DataTab";
import { UtilLib } from "../utils/utils";
import { Config } from "../model/Config";
import { assertDatasetPlanUnchanged, createDatasetPlan, DatasetPlan } from "../model/datasetPreview";
import { DatasetTab } from "./DatasetTab";
import {
  SavedConfigStore,
  SavedDatasetStore,
  SAVED_CONFIGS_KEY,
  SAVED_DATASETS_KEY,
} from "../model/savedConfig";
import { DataverseBatchError, validateRecordCount } from "../utils/bulkOperations";

interface MockarooMainProps {
  connection: ToolBoxAPI.DataverseConnection | null;
  dvSvc: dvService;
  mckSvc: mockarooService;
  utils: UtilLib;
  isLoading: boolean;
  viewModel: ViewModel;
  onLog: (message: string, type?: "info" | "success" | "warning" | "error") => void;
}

const useStyles = makeStyles({
  listbox: {
    height: "200px",
    // maxHeight will be applied only positioning autoSize set.
    maxHeight: "20px",
    overflowX: "hidden",
  },
  option: {
    height: "50px",
  },
  button: {
    marginRight: "8px",
  },
  datasetHeader: {
    display: "flex",
    alignItems: "baseline",
    justifyContent: "space-between",
    gap: tokens.spacingHorizontalM,
    flexWrap: "wrap",
  },
  datasetTotal: {
    marginLeft: "auto",
    textAlign: "right",
  },
  tabEnd: {
    display: "flex",
    width: "100%",
    alignItems: "center",
    marginLeft: "auto",
    justifyItems: "end",
    justifyContent: "flex-end",
  },
});

interface DatasetPreview extends DatasetPlan {
  connectionId: string;
  connectionName: string;
  connectionEnvironment: string;
  connectionUrl: string;
}

export function DatasetCreationHeader({ items }: Pick<DatasetPlan, "items">): React.JSX.Element {
  const styles = useStyles();
  return (
    <div className={styles.datasetHeader}>
      <span>Review Dataset Creation</span>
      <span className={styles.datasetTotal}>
        Total: {items.reduce((sum, item) => sum + item.recordCount, 0)} record(s)
      </span>
    </div>
  );
}

export function DatasetCreationWarning({ warnings }: { warnings: string[] }): React.JSX.Element {
  return (
    <MessageBar intent="warning">
      <MessageBarBody>
        <p>
          Records already created cannot be automatically rolled back. If a step fails, earlier successful steps may
          remain in Dataverse.
        </p>
        {warnings.length > 0 && (
          <>
            <p>Some saved steps will be skipped:</p>
            <ul>
              {warnings.map((warning, index) => (
                <li key={index}>{warning}</li>
              ))}
            </ul>
          </>
        )}
      </MessageBarBody>
    </MessageBar>
  );
}

export const MockarooMain = observer((props: MockarooMainProps): React.JSX.Element => {
  const { connection, dvSvc, mckSvc, utils, isLoading, viewModel, onLog } = props;

  //#region useState hooks
  // Track if tables have been loaded to avoid infinite loop
  const [tablesLoaded, setTablesLoaded] = React.useState(false);
  const [selectedTab, setSelectedTab] = React.useState<TabValue>("config");
  const [openSaveDialog, setOpenSaveDialog] = React.useState(false);
  const [datasetPreview, setDatasetPreview] = React.useState<DatasetPreview | null>(null);
  const [openDatasetConfirmation, setOpenDatasetConfirmation] = React.useState(false);
  const [creatingData, setCreatingData] = React.useState(false);
  const [runningDataset, setRunningDataset] = React.useState(false);
  //#endregion
  const styles = useStyles();

  React.useEffect(() => {
    if (connection && !tablesLoaded && viewModel.tables.length === 0) {
      dvSvc
        .loadTables()
        .then((tables) => {
          onLog("Tables loaded successfully", "success");
          viewModel.tables = tables;
          setTablesLoaded(true);
        })
        .catch((err) => {
          window.toolboxAPI.utils.showNotification({
            title: "Error Loading Tables",
            body: `There was an error loading tables from Dataverse: ${err}`,
            type: "error",
            duration: 10000,
          });
          onLog(`Error loading tables: ${err}`, "error");
        });
    }
  }, [connection, dvSvc, onLog, tablesLoaded]);

  React.useEffect(() => {
    if (viewModel.mockTypes.length === 0) {
      // Initialize MockTypes only once
      let types = "[]";
      (async () => {
        try {
          // Use dynamic import instead of require to avoid Node types dependency
          const mod = await import("../model/Mocks.json");
          // JSON modules may be exported as default or as the module itself depending on bundler
          types = JSON.stringify((mod && (mod.default ?? mod)) ?? []);
        } catch (err) {
          console.error("Failed to load mocks.json:", err);
          types = "[]";
        }
        viewModel.mockTypes = JSON.parse(types).types;
      })();
    }
  }, []);

  //#region Events
  const onMainTabSelect = (_event: SelectTabEvent, data: SelectTabData) => {
    setSelectedTab(data.value);
  };
  const MIN_API_KEY_LENGTH = 8;

  function parseSchemaFields(schemaJson: string): unknown[] {
    try {
      const parsed = JSON.parse(schemaJson);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  function getData(): void {
    try {
      validateRecordCount(viewModel.rowCount);
    } catch (error) {
      window.toolboxAPI.utils.showNotification({
        title: "Invalid Record Count",
        body: String(error),
        type: "warning",
      });
      return;
    }

    const schemaJson = viewModel.config?.jsonString ?? "[]";
    const schemaFields = parseSchemaFields(schemaJson);
    const hasMockarooFields = schemaFields.length > 0;

    if (hasMockarooFields) {
      const trimmedApiKey = viewModel.mockarooApiKey.trim();
      if (!trimmedApiKey) {
        onLog("Mockaroo API key is not configured. Please enter your API key.", "error");
        window.toolboxAPI.utils.showNotification({
          title: "Mockaroo API Key Missing",
          body: "Please enter your Mockaroo API key before generating data.",
          type: "error",
        });
        return;
      }
      if (trimmedApiKey.length < MIN_API_KEY_LENGTH) {
        onLog("Mockaroo API key appears to be invalid. Please check your API key.", "error");
        window.toolboxAPI.utils.showNotification({
          title: "Mockaroo API Key Invalid",
          body: "The API key looks too short. Please double-check and try again.",
          type: "error",
        });
        return;
      }
    }

    const fieldsNeedingSelection = viewModel.config?.fields?.filter(
      (f) =>
        f.include &&
        f.selectedMock?.fixed &&
        (f.selectedMock.type === "picklist" || f.selectedMock.type === "lookup") &&
        f.selectedValues.length === 0,
    );
    if (fieldsNeedingSelection && fieldsNeedingSelection.length > 0) {
      const firstMissing = fieldsNeedingSelection[0];
      window.toolboxAPI.utils.showNotification({
        title: "Selection Required",
        body: `Choose a value for ${firstMissing.displayName} before generating data.`,
        type: "warning",
      });
      onLog("Generate blocked: fixed picklist/lookup requires a selected value", "warning");
      return;
    }

    const dataPromise = hasMockarooFields
      ? mckSvc.getMockData(viewModel.rowCount, schemaJson, viewModel.mockarooApiKey)
      : Promise.resolve(Array.from({ length: viewModel.rowCount }, () => ({})));

    if (!hasMockarooFields) {
      onLog("No Mockaroo fields selected; generating rows from fixed values only", "info");
    }

    dataPromise
      .then((data) => {
        viewModel.data = data;

        viewModel.data = viewModel.data.map((item) => ({
          ...item,
          "@odata.type": `Microsoft.Dynamics.CRM.${viewModel.selectedTable?.logical}`,
          ...viewModel.config?.fields
            ?.filter(
              (f) => f.selectedMock?.fixed && (f.selectedMock.type === "picklist" || f.selectedMock.type === "lookup"),
            )
            .reduce(
              (acc, field) => ({
                ...acc,
                [field.logicalName]: field.selectedValues[0].label,
                [field.logicalName + "_value"]: field.selectedValues[0].value,
              }),
              {},
            ),
          ...viewModel.config?.fields
            ?.filter(
              (f) =>
                !f.selectedMock?.fixed && (f.selectedMock?.type === "picklist" || f.selectedMock?.type === "lookup"),
            )
            .reduce(
              (acc, field) => ({
                ...acc,
                [field.logicalName + "_value"]: item[field.logicalName],
                [field.logicalName]: field.selectedValues.find((sv) => sv.value === item[field.logicalName].toString())
                  ?.label,
              }),
              {},
            ),
          // Apply fixed values for fields that are not picklist/lookup (those are handled above)
          ...viewModel.config?.fields
            ?.filter(
              (f) => f.selectedMock?.fixed && f.selectedMock?.type !== "picklist" && f.selectedMock?.type !== "lookup",
            )
            .reduce(
              (acc, field) => ({
                ...acc,
                [field.logicalName]: field.fixedValue,
              }),
              {},
            ),
        }));

        window.toolboxAPI.utils.showNotification({
          title: "Mock Data Generated",
          body: `${viewModel.data.length} mock data generated successfully`,
          type: "success",
        });
        setSelectedTab("data");
        onLog(`Generated ${viewModel.data.length} mock data records`, "success");
      })
      .catch((err) => {
        window.toolboxAPI.utils.showNotification({
          title: "Mockaroo Error",
          body: `Could not generate data: ${err}`,
          type: "error",
          duration: 8000,
        });
        onLog(`Failed to generate mock data: ${err}`, "error");
      });
  }

  function createDataConfirmation(): void {
    setOpenSaveDialog(true);
  }

  async function reviewDataset(): Promise<void> {
    const datasetName = viewModel.selectedDatasetName?.trim();
    if (!datasetName) {
      window.toolboxAPI.utils.showNotification({
        title: "Dataset Not Selected",
        body: "Select a dataset in the Data Set tab before running.",
        type: "warning",
      });
      return;
    }

    if (!connection) {
      window.toolboxAPI.utils.showNotification({
        title: "Connection Required",
        body: "Select an active Dataverse connection before reviewing this dataset.",
        type: "warning",
      });
      return;
    }

    try {
      const activeConnection = await window.toolboxAPI.connections.getActiveConnection();
      if (
        !activeConnection ||
        activeConnection.id !== connection.id ||
        activeConnection.url !== connection.url
      ) {
        throw new Error("The active Dataverse connection changed. Review the dataset again.");
      }
      const datasets = ((await window.toolboxAPI.settings.get(SAVED_DATASETS_KEY)) || {}) as SavedDatasetStore;
      const configs = ((await window.toolboxAPI.settings.get(SAVED_CONFIGS_KEY)) || {}) as SavedConfigStore;
      const plan = createDatasetPlan(datasetName, datasets[datasetName], configs, viewModel.tables);
      setDatasetPreview({
        ...plan,
        connectionId: connection.id,
        connectionName: connection.name,
        connectionEnvironment: connection.environment,
        connectionUrl: connection.url,
      });
      setOpenDatasetConfirmation(true);
    } catch (error) {
      window.toolboxAPI.utils.showNotification({
        title: "Dataset Review Failed",
        body: String(error),
        type: "error",
      });
      onLog(`Dataset review failed: ${String(error)}`, "error");
    }
  }

  async function runDataset(preview: DatasetPreview): Promise<void> {
    setRunningDataset(true);
    const warnings = [...preview.warnings];
    let totalCreated = 0;

    try {
      const activeConnection = await window.toolboxAPI.connections.getActiveConnection();
      if (
        !activeConnection ||
        activeConnection.id !== preview.connectionId ||
        activeConnection.url !== preview.connectionUrl
      ) {
        throw new Error("The active Dataverse connection changed. No dataset records were created.");
      }
      const datasets = ((await window.toolboxAPI.settings.get(SAVED_DATASETS_KEY)) || {}) as SavedDatasetStore;
      const configs = ((await window.toolboxAPI.settings.get(SAVED_CONFIGS_KEY)) || {}) as SavedConfigStore;
      assertDatasetPlanUnchanged(preview, datasets[preview.datasetName], configs);

      for (const item of preview.items) {
        const { configName } = item;
        const savedConfig = configs[configName];
        if (!savedConfig) {
          throw new Error(`Config '${configName}' disappeared after review. Review the dataset again.`);
        }
        const targetTable = viewModel.tables.find((table) => table.logical === item.tableLogical);
        if (!targetTable) {
          throw new Error(`Table '${item.tableLogical}' is no longer available. No further records were created.`);
        }

        const loadedConfig: Config = await dvSvc.loadConfig(targetTable);
        const importedByLogical = new Map(savedConfig.fields.map((f) => [f.logicalName, f]));

        loadedConfig.fields?.forEach((field) => {
          const imported = importedByLogical.get(field.logicalName);
          if (!imported) {
            return;
          }

          field.include = Boolean(imported.include);
          field.percBlank = Number.isFinite(imported.percBlank) ? imported.percBlank : 0;
          field.fixedValue = imported.fixedValue;
          field.selectedValues =
            imported.selectedValues?.map((sv) => ({ label: String(sv.label), value: String(sv.value) })) ?? [];

          if (imported.selectedMockName) {
            const mockType = viewModel.mockTypes.find((mt) => mt.name === imported.selectedMockName);
            if (mockType) {
              field.selectedMock = {
                ...mockType,
                parameters: mockType.parameters?.map((param) => ({
                  ...param,
                  value:
                    imported.parameters && Object.prototype.hasOwnProperty.call(imported.parameters, param.name)
                      ? String(imported.parameters[param.name] ?? "")
                      : param.value,
                })),
              };
            }
          }

          if (field.type === "Lookup" && imported.parentTableLogical) {
            const parentTable = viewModel.tables.find((t) => t.logical === imported.parentTableLogical);
            if (parentTable) {
              field.parentTable = parentTable;
            } else if (imported.parentTableSetName) {
              field.parentTable = {
                logical: imported.parentTableLogical,
                setName: imported.parentTableSetName,
              } as Table;
            }
          }
        });

        viewModel.selectedTable = targetTable;
        viewModel.config = loadedConfig;
        viewModel.rowCount = item.recordCount;

        const schemaJson = viewModel.config?.jsonString ?? "[]";
        let schemaFields: unknown[] = [];
        try {
          schemaFields = JSON.parse(schemaJson);
        } catch {
          schemaFields = [];
        }

        const hasMockarooFields = Array.isArray(schemaFields) && schemaFields.length > 0;
        const trimmedApiKey = viewModel.mockarooApiKey.trim();
        if (hasMockarooFields && (!trimmedApiKey || trimmedApiKey.length < MIN_API_KEY_LENGTH)) {
          throw new Error("Mockaroo API key is required for dataset configs that use Mockaroo fields.");
        }

        const sourceData: Record<string, unknown>[] = hasMockarooFields
          ? await mckSvc.getMockData(viewModel.rowCount, schemaJson, viewModel.mockarooApiKey)
          : Array.from({ length: viewModel.rowCount }, (): Record<string, unknown> => ({}));

        const generatedData = sourceData.map((item) => ({
          ...item,
          "@odata.type": `Microsoft.Dynamics.CRM.${targetTable.logical}`,
          ...loadedConfig.fields
            ?.filter(
              (f) => f.selectedMock?.fixed && (f.selectedMock.type === "picklist" || f.selectedMock.type === "lookup"),
            )
            .reduce(
              (acc, field) => ({
                ...acc,
                [field.logicalName]: field.selectedValues[0]?.label,
                [field.logicalName + "_value"]: field.selectedValues[0]?.value,
              }),
              {},
            ),
          ...loadedConfig.fields
            ?.filter(
              (f) =>
                !f.selectedMock?.fixed && (f.selectedMock?.type === "picklist" || f.selectedMock?.type === "lookup"),
            )
            .reduce(
              (acc, field) => ({
                ...acc,
                [field.logicalName + "_value"]: item[field.logicalName],
                [field.logicalName]: field.selectedValues.find((sv) => sv.value === item[field.logicalName]?.toString())
                  ?.label,
              }),
              {},
            ),
          ...loadedConfig.fields
            ?.filter(
              (f) => f.selectedMock?.fixed && f.selectedMock?.type !== "picklist" && f.selectedMock?.type !== "lookup",
            )
            .reduce(
              (acc, field) => ({
                ...acc,
                [field.logicalName]: field.fixedValue,
              }),
              {},
            ),
        }));

        const currentDatasets = ((await window.toolboxAPI.settings.get(SAVED_DATASETS_KEY)) || {}) as SavedDatasetStore;
        const currentConfigs = ((await window.toolboxAPI.settings.get(SAVED_CONFIGS_KEY)) || {}) as SavedConfigStore;
        assertDatasetPlanUnchanged(preview, currentDatasets[preview.datasetName], currentConfigs);
        const createResult = await dvSvc.createData(targetTable, loadedConfig.fields || [], generatedData);
        totalCreated += createResult.createdIds.length;
        window.toolboxAPI.utils.showNotification({
          title: "Dataset Step Complete",
          body: `${configName} completed: ${createResult.createdIds.length} row(s) created in ${targetTable.label}.`,
          type: "success",
          duration: 4000,
        });
        onLog(`Dataset step '${configName}' completed (${createResult.createdIds.length} record(s))`, "success");
      }

      const summary =
        warnings.length > 0
          ? `Dataset '${preview.datasetName}' completed with warnings. Created ${totalCreated} record(s). ${warnings.join(" ")}`
          : `Dataset '${preview.datasetName}' completed. Created ${totalCreated} record(s).`;

      window.toolboxAPI.utils.showNotification({
        title: warnings.length > 0 ? "Dataset Completed With Warnings" : "Dataset Completed",
        body: summary,
        type: warnings.length > 0 ? "warning" : "success",
        duration: 12000,
      });
      onLog(summary, warnings.length > 0 ? "warning" : "success");
      setSelectedTab("dataset");
    } catch (err) {
      const partialCount = err instanceof DataverseBatchError ? err.createdCount : 0;
      const knownCreated = totalCreated + partialCount;
      const message =
        knownCreated > 0
          ? `Failed to run dataset: ${String(err)} ${knownCreated} record(s) were confirmed created; there is no automatic rollback.`
          : `Failed to run dataset: ${String(err)}`;
      window.toolboxAPI.utils.showNotification({
        title: "Dataset Run Failed",
        body: message,
        type: "error",
      });
      onLog(message, "error");
    } finally {
      setRunningDataset(false);
      setOpenDatasetConfirmation(false);
    }
  }

  async function createData(): Promise<void> {
    setCreatingData(true);
    try {
      const selectedTable = viewModel.selectedTable;
      if (!selectedTable) {
        throw new Error("Select a Dataverse table before creating records.");
      }
      const result = await dvSvc.createData(selectedTable, viewModel.config?.fields || [], viewModel.data || []);
      window.toolboxAPI.utils.showNotification({
        title: "Data Created",
        body: `${result.createdIds.length} records created successfully in ${selectedTable.label}.`,
        type: "success",
      });

      onLog(`Created ${result.createdIds.length} records in Dataverse`, "success");
    } catch (err) {
      const partialCount = err instanceof DataverseBatchError ? err.createdCount : 0;
      const partialText =
        partialCount > 0
          ? ` ${partialCount} record(s) were confirmed created before failure; there is no automatic rollback.`
          : "";
      window.toolboxAPI.utils.showNotification({
        title: "Data Creation Error",
        body: `Could not create all records: ${String(err)}${partialText}`,
        type: "error",
        duration: 10000,
      });
      onLog(`Data creation failed: ${String(err)}${partialText}`, "error");
    } finally {
      setCreatingData(false);
      setOpenSaveDialog(false);
    }
  }

  const saveDialog = (
    <Dialog open={openSaveDialog} onOpenChange={(_e, data) => setOpenSaveDialog(data.open)}>
      <DialogSurface>
        <DialogBody>
          <DialogTitle>Create Data</DialogTitle>
          <DialogContent>
            {!creatingData && (
              <div>
                <p>
                  Create {viewModel.data?.length} records in {viewModel.selectedTable?.label} (
                  {viewModel.selectedTable?.logical})?
                </p>
                <p>
                  Target: {connection?.name} ({connection?.environment}) — {connection?.url}
                </p>
                <p>Created records have no automatic rollback. A failed multi-batch operation may leave earlier batches created.</p>
              </div>
            )}
            {creatingData && <Spinner label={"Creating " + viewModel.selectedTable?.label + "(s)"} />}
          </DialogContent>
          <DialogActions>
            <Button appearance="primary" disabled={creatingData} onClick={createData}>
              Create Data
            </Button>
            <DialogTrigger disableButtonEnhancement>
              <Button appearance="secondary" disabled={creatingData} onClick={() => setOpenSaveDialog(false)}>
                Cancel
              </Button>
            </DialogTrigger>
          </DialogActions>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  );

  const datasetConfirmationDialog = (
    <Dialog
      open={openDatasetConfirmation}
      onOpenChange={(_event, data) => {
        if (!data.open && !runningDataset) {
          setOpenDatasetConfirmation(false);
        }
      }}
    >
      <DialogSurface>
        <DialogBody>
          <DialogTitle>
            <DatasetCreationHeader items={datasetPreview?.items ?? []} />
          </DialogTitle>
          <DialogContent>
            {datasetPreview && (
              <div>
                <p>
                  Dataset <strong>{datasetPreview.datasetName}</strong> will create records in the following target:
                </p>
                <p>
                  {datasetPreview.connectionName} ({datasetPreview.connectionEnvironment}) —{" "}
                  {datasetPreview.connectionUrl}
                </p>
                <ul>
                  {datasetPreview.items.map((item, index) => (
                    <li key={`${item.configName}-${index}`}>
                      {item.tableLabel} ({item.tableLogical}): {item.recordCount} record(s), config “{item.configName}”
                    </li>
                  ))}
                </ul>
                <DatasetCreationWarning warnings={datasetPreview.warnings} />
              </div>
            )}
            {runningDataset && <Spinner label="Creating dataset records..." />}
          </DialogContent>
          <DialogActions>
            <Button
              appearance="primary"
              disabled={runningDataset || !datasetPreview}
              onClick={() => {
                if (datasetPreview) {
                  void runDataset(datasetPreview);
                }
              }}
            >
              Confirm and Create
            </Button>
            <DialogTrigger disableButtonEnhancement>
              <Button
                appearance="secondary"
                disabled={runningDataset}
                onClick={() => setOpenDatasetConfirmation(false)}
              >
                Cancel
              </Button>
            </DialogTrigger>
          </DialogActions>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  );

  //#endregion

  const tabs = (
    <TabList selectedValue={selectedTab} onTabSelect={onMainTabSelect}>
      <Tab value="config">Configuration</Tab>
      <Tab value="dataset">Data Set</Tab>
      <Tab value="data" disabled={!(viewModel.data && viewModel.data.length > 0)}>
        Data
      </Tab>
      {selectedTab === "config" && (
        <div className={styles.tabEnd}>
          <Tooltip content="Generate mock data" relationship="label" {...props}>
            <Button
              className={styles.button}
              icon={<DatabaseArrowUpFilled />}
              disabled={
                (viewModel.config?.fields?.filter((f) => f.include).length ?? 0) === 0 ||
                (!viewModel.mockarooApiKey &&
                  parseSchemaFields(viewModel.config?.jsonString ?? "[]").length > 0)
              }
              onClick={getData}
            />
          </Tooltip>
        </div>
      )}
      {selectedTab === "data" && (
        <div className={styles.tabEnd}>
          <Tooltip content="Create data in Dataverse" relationship="label" {...props}>
            <Button
              className={styles.button}
              icon={<DatabaseCheckmarkFilled />}
              disabled={(viewModel.config?.fields?.filter((f) => f.include).length ?? 0) === 0}
              onClick={createDataConfirmation}
              aria-label="Create Data in Dataverse"
            />
          </Tooltip>
        </div>
      )}
    </TabList>
  );

  return (
    <div
      style={{
        overflow: "visible",
        height: "100vh",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {tabs}
      {saveDialog}
      {datasetConfirmationDialog}
      {selectedTab === "config" && (
        <ConfigTab
          connection={connection}
          dvSvc={dvSvc}
          utils={utils}
          isLoading={isLoading}
          viewModel={viewModel}
          onLog={onLog}
        />
      )}
      {selectedTab === "dataset" && (
        <DatasetTab
          viewModel={viewModel}
          onLog={onLog}
          onReviewDataset={reviewDataset}
          runningDataset={runningDataset}
        />
      )}
      {selectedTab === "data" && (
        <DataTab connection={connection} dvSvc={dvSvc} isLoading={isLoading} viewModel={viewModel} onLog={onLog} />
      )}
    </div>
  );
});
