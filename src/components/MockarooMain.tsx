import { observer } from "mobx-react";
import { ViewModel } from "../model/viewModel";
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
  SelectTabData,
  SelectTabEvent,
  Spinner,
  Tab,
  TabList,
  TabValue,
  Tooltip,
} from "@fluentui/react-components";
import { DatabaseArrowUpFilled, DatabaseCheckmarkFilled } from "@fluentui/react-icons";
import { ConfigTab } from "./ConfigTab";
import { mockarooService } from "../utils/mockaroo";
import { DataTab } from "./DataTab";
import { UtilLib } from "../utils/utils";
import { Config } from "../model/Config";
import { DatasetTab } from "./DatasetTab";
import {
  SavedConfigStore,
  SavedDatasetStore,
  SAVED_CONFIGS_KEY,
  SAVED_DATASETS_KEY,
} from "../model/savedConfig";

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
  tabEnd: {
    display: "flex",
    width: "100%",
    alignItems: "center",
    marginLeft: "auto",
    justifyItems: "end",
    justifyContent: "flex-end",
  },
});

export const MockarooMain = observer((props: MockarooMainProps): React.JSX.Element => {
  const { connection, dvSvc, mckSvc, utils, isLoading, viewModel, onLog } = props;

  //#region useState hooks
  // Track if tables have been loaded to avoid infinite loop
  const [tablesLoaded, setTablesLoaded] = React.useState(false);
  const [selectedTab, setSelectedTab] = React.useState<TabValue>("config");
  const [openSaveDialog, setOpenSaveDialog] = React.useState(false);
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
  function getData(): void {
    const schemaJson = viewModel.config?.jsonString ?? "[]";
    let schemaFields: unknown[] = [];
    try {
      schemaFields = JSON.parse(schemaJson);
    } catch {
      schemaFields = [];
    }
    const hasMockarooFields = Array.isArray(schemaFields) && schemaFields.length > 0;

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

  async function runDataset(): Promise<void> {
    const datasetName = viewModel.selectedDatasetName?.trim();
    if (!datasetName) {
      window.toolboxAPI.utils.showNotification({
        title: "Dataset Not Selected",
        body: "Select a dataset in the Data Set tab before running.",
        type: "warning",
      });
      return;
    }

    setRunningDataset(true);
    const warnings: string[] = [];
    let totalCreated = 0;

    try {
      const datasets = ((await window.toolboxAPI.settings.get(SAVED_DATASETS_KEY)) || {}) as SavedDatasetStore;
      const configs = ((await window.toolboxAPI.settings.get(SAVED_CONFIGS_KEY)) || {}) as SavedConfigStore;
      const dataset = datasets[datasetName];

      if (!dataset || !Array.isArray(dataset.configNames) || dataset.configNames.length === 0) {
        throw new Error(`Dataset '${datasetName}' was not found or is empty.`);
      }

      for (const configName of dataset.configNames) {
        const savedConfig = configs[configName];
        if (!savedConfig) {
          warnings.push(`Config '${configName}' not found.`);
          continue;
        }

        const targetTable = viewModel.tables.find((t) => t.logical === savedConfig.tableLogical);
        if (!targetTable) {
          warnings.push(`Table '${savedConfig.tableLogical}' for config '${configName}' was not found.`);
          continue;
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
              } as import("../model/viewModel").Table;
            }
          }
        });

        viewModel.selectedTable = targetTable;
        viewModel.config = loadedConfig;
        viewModel.rowCount =
          Number.isFinite(savedConfig.rowCount) && savedConfig.rowCount > 0 ? savedConfig.rowCount : 10;

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

        const sourceData = hasMockarooFields
          ? await mckSvc.getMockData(viewModel.rowCount, schemaJson, viewModel.mockarooApiKey)
          : Array.from({ length: viewModel.rowCount }, () => ({}));

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

        await dvSvc.createData(targetTable, loadedConfig.fields || [], generatedData);
        totalCreated += generatedData.length;
        window.toolboxAPI.utils.showNotification({
          title: "Dataset Step Complete",
          body: `${configName} completed: ${generatedData.length} row(s) created in ${targetTable.label}.`,
          type: "success",
          duration: 4000,
        });
        onLog(`Dataset step '${configName}' completed (${generatedData.length} record(s))`, "success");
      }

      const summary =
        warnings.length > 0
          ? `Dataset '${datasetName}' completed with warnings. Created ${totalCreated} record(s). ${warnings.join(" ")}`
          : `Dataset '${datasetName}' completed. Created ${totalCreated} record(s).`;

      window.toolboxAPI.utils.showNotification({
        title: warnings.length > 0 ? "Dataset Completed With Warnings" : "Dataset Completed",
        body: summary,
        type: warnings.length > 0 ? "warning" : "success",
        duration: 12000,
      });
      onLog(summary, warnings.length > 0 ? "warning" : "success");
      setSelectedTab("dataset");
    } catch (err) {
      const message = `Failed to run dataset: ${String(err)}`;
      window.toolboxAPI.utils.showNotification({
        title: "Dataset Run Failed",
        body: message,
        type: "error",
      });
      onLog(message, "error");
    } finally {
      setRunningDataset(false);
    }
  }

  async function createData(): Promise<void> {
    setCreatingData(true);
    await dvSvc
      .createData(viewModel.selectedTable!, viewModel.config?.fields || [], viewModel.data || [])
      .then(() => {
        window.toolboxAPI.utils.showNotification({
          title: "Data Created",
          body: `${viewModel.data?.length} records created successfully`,
          type: "success",
        });

        onLog(`Created ${viewModel.data?.length} records in Dataverse`, "success");
      })
      .catch((err) => {
        console.error("Error creating data:", err);

        window.toolboxAPI.utils.showNotification({
          title: "Data Creation Error",
          body: `Not all records could be created. Please check your configuration and the error message: ${err}`,
          type: "error",
          duration: 10000,
        });
      })
      .finally(() => {
        setCreatingData(false);
        setOpenSaveDialog(false);
      });
  }

  const saveDialog = (
    <Dialog open={openSaveDialog} onOpenChange={(_e, data) => setOpenSaveDialog(data.open)}>
      <DialogSurface>
        <DialogBody>
          <DialogTitle>Create Data</DialogTitle>
          <DialogContent>
            {!creatingData && (
              <div>
                Do you want to create {viewModel.data?.length} records in the {viewModel.selectedTable?.label} table?
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
                  (() => {
                    try {
                      return (JSON.parse(viewModel.config?.jsonString ?? "[]") as unknown[]).length > 0;
                    } catch {
                      return false;
                    }
                  })())
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
        <DatasetTab viewModel={viewModel} onLog={onLog} onRunDataset={runDataset} runningDataset={runningDataset} />
      )}
      {selectedTab === "data" && (
        <DataTab connection={connection} dvSvc={dvSvc} isLoading={isLoading} viewModel={viewModel} onLog={onLog} />
      )}
    </div>
  );
});
