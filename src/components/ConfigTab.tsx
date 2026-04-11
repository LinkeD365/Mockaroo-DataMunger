import React from "react";
import { ViewModel } from "../model/viewModel";
import { dvService } from "../utils/dataverse";
import { observer } from "mobx-react";
import { Config, ConfigColumn } from "../model/Config";
import {
  Button,
  Combobox,
  ComboboxProps,
  Field,
  Input,
  makeStyles,
  Option,
  Spinner,
  Toolbar,
  ToolbarGroup,
} from "@fluentui/react-components";

import {
  ModuleRegistry,
  TextFilterModule,
  ClientSideRowModelModule,
  CheckboxEditorModule,
  NumberEditorModule,
  themeQuartz,
  ColDef,
  INumberCellEditorParams,
} from "ag-grid-community";
import { AgGridReact, CustomCellRendererProps } from "ag-grid-react";
import { SaveRegular } from "@fluentui/react-icons";
import { MockTypeSelector } from "./MockSelector";
import { MockOptionsSelector } from "./MockOptions";
import { UtilLib } from "../utils/utils";
import {
  SavedConfigFile,
  SavedConfigStore,
  SAVED_CONFIGS_KEY,
} from "../model/savedConfig";

ModuleRegistry.registerModules([TextFilterModule, ClientSideRowModelModule, CheckboxEditorModule, NumberEditorModule]);

const useStyles = makeStyles({
  listbox: {
    maxHeight: "300px",
    overflowY: "auto",
    overflowX: "hidden",
  },
  option: {
    height: "32px",
  },
  toolbar: {
    justifyContent: "space-between",
  },
  leftToolbarGroup: {
    alignItems: "center",
  },
});

interface ConfigTabProps {
  connection: ToolBoxAPI.DataverseConnection | null;
  dvSvc: dvService;
  utils: UtilLib;
  isLoading: boolean;
  viewModel: ViewModel;
  onLog: (message: string, type?: "info" | "success" | "warning" | "error") => void;
}

const myTheme = themeQuartz.withParams({
  headerHeight: "30px",
});

const MockOptSelectorMemo = React.memo(MockOptionsSelector);

export const ConfigTab = observer((props: ConfigTabProps): React.JSX.Element => {
  const { connection, dvSvc, utils, viewModel, onLog } = props;
  const styles = useStyles();
  const [loadingConfig, setLoadingConfig] = React.useState<boolean>(false);
  const [mockarooKeyInput, setMockarooKeyInput] = React.useState<string>(viewModel.mockarooApiKey);
  const [tableFilter, setTableFilter] = React.useState<string>(viewModel.selectedTable?.label || "");
  const [configName, setConfigName] = React.useState<string>("");
  const [savedConfigNames, setSavedConfigNames] = React.useState<string[]>([]);
  const isImportingConfigRef = React.useRef(false);

  const [colDefs, setColDefs] = React.useState<ColDef<ConfigColumn>[]>([]);

  React.useEffect(() => {
    if (!connection) return;
    setColDefs([
      {
        headerName: "Column Name",
        field: "displayName",
        sortable: true,
        sort: "asc",
        filter: true,
        resizable: true,
        width: 200,
      },
      {
        headerName: "Logical",
        field: "logicalName",
        sortable: true,
        filter: true,
        resizable: true,
        width: 200,
      },
      {
        headerName: "Type",
        field: "type",
        sortable: true,
        filter: true,
        resizable: true,
        width: 200,
      },
      {
        headerName: "Include",
        field: "include",
        sortable: true,
        filter: true,
        resizable: false,
        width: 100,
        cellEditor: "agCheckboxCellEditor",
        cellRenderer: "agCheckboxCellRenderer",
        editable: true,
      },
      {
        headerName: "Mock Type",
        field: "selectedMock.name",
        sortable: true,
        filter: true,
        minWidth: 200,
        resizable: true,
        flex: 1,
        cellRenderer: (params: CustomCellRendererProps<ConfigColumn>) =>
          params.data ? (
            <MockTypeSelector column={params.data} mockTypes={viewModel.mockTypes} onUpdate={updateItem} />
          ) : null,
      },
      {
        headerName: "Config",
        headerTooltip: "Additional configuration for the selected mock type",
        field: "selectedMock.parameters",
        sortable: false,
        filter: true,
        resizable: true,
        cellRenderer: (params: CustomCellRendererProps<ConfigColumn>) =>
          params.data ? (
            <MockOptSelectorMemo
              key={params.data.logicalName}
              dvSvc={dvSvc}
              vm={viewModel}
              utils={utils}
              column={params.data}
              onUpdate={updateItem}
              onLog={onLog}
            />
          ) : null,
      },
      {
        headerName: "Perc % Blank",
        field: "percBlank",
        headerTooltip: "Percentage of blank values to generate for this field",
        sortable: true,
        width: 100,
        cellEditor: "agNumberCellEditor",
        cellEditorParams: {
          min: 0,
          max: 100,
        } as INumberCellEditorParams,
        editable: (params) => params.data?.selectedMock !== undefined,
      },
    ]);
  }, [connection, dvSvc, viewModel.mockTypes]);

  React.useEffect(() => {
    const loadConfig = async () => {
      if (isImportingConfigRef.current) {
        return;
      }
      setLoadingConfig(true);
      if (!connection) {
        setLoadingConfig(false);
        return;
      }
      if (viewModel.selectedTable) {
        if (viewModel.config && viewModel.config.table.logical === viewModel.selectedTable.logical) {
          // Configuration already loaded for the selected table
          setLoadingConfig(false);
          return;
        }
        //  const selectedTable = viewModel.tables.find((table) => table.logical === viewModel.selectedTable.logical);
        if (viewModel.selectedTable) {
          try {
            const retrievedConfig: Config = await dvSvc.loadConfig(viewModel.selectedTable);
            viewModel.config = retrievedConfig;
          } catch (err) {
            onLog("Failed to load configuration", "error");
            console.error(err);
          } finally {
            setLoadingConfig(false);
          }
        }
      } else setLoadingConfig(false);
    };

    loadConfig();
  }, [connection, viewModel.selectedTable, dvSvc, onLog]);

  React.useEffect(() => {
    setMockarooKeyInput(viewModel.mockarooApiKey);
  }, [viewModel.mockarooApiKey]);

  React.useEffect(() => {
    setTableFilter(viewModel.selectedTable?.label || "");
  }, [viewModel.selectedTable]);

  React.useEffect(() => {
    const loadSavedConfigNames = async () => {
      const store = ((await window.toolboxAPI.settings.get(SAVED_CONFIGS_KEY)) || {}) as SavedConfigStore;
      const names = Object.keys(store).sort((a, b) => a.localeCompare(b));
      setSavedConfigNames(names);
    };
    loadSavedConfigNames();
  }, []);

  function updateItem(_item: ConfigColumn) {
    // No-op: Grid updates are handled reactively via MobX
  }

  const onOptionSelect: ComboboxProps["onOptionSelect"] = (_event, data) => {
    if (!data.optionValue) {
      viewModel.selectedTable = undefined;
      viewModel.config = undefined;
      setTableFilter("");
      return;
    }

    const selectedTable = viewModel.tables.find((table) => table.logical === data.optionValue);
    viewModel.selectedTable = selectedTable;
    setTableFilter(selectedTable?.label || "");
  };

  const filteredTables = viewModel.tables.filter(
    (table) =>
      table.label.toLowerCase().includes(tableFilter.toLowerCase()) ||
      table.logical.toLowerCase().includes(tableFilter.toLowerCase()),
  );

  async function saveConfigAsJson(): Promise<void> {
    if (!viewModel.selectedTable || !viewModel.config?.fields) {
      window.toolboxAPI.utils.showNotification({
        title: "No Configuration To Save",
        body: "Please select a table and configure fields before exporting.",
        type: "warning",
      });
      return;
    }

    const trimmedConfigName = configName.trim();
    if (!trimmedConfigName) {
      window.toolboxAPI.utils.showNotification({
        title: "Config Name Required",
        body: "Enter a config name before saving.",
        type: "warning",
      });
      return;
    }

    try {
      const payload: SavedConfigFile = {
        version: 1,
        tableLogical: viewModel.selectedTable.logical,
        tableLabel: viewModel.selectedTable.label,
        rowCount: viewModel.rowCount,
        fields: viewModel.config.fields
          .filter((field) => field.include)
          .map((field) => ({
            logicalName: field.logicalName,
            include: field.include,
            percBlank: field.percBlank,
            selectedMockName: field.selectedMock?.name,
            selectedValues: field.selectedValues?.map((sv) => ({ label: sv.label, value: sv.value })) ?? [],
            fixedValue: field.fixedValue,
            parentTableLogical: field.parentTable?.logical,
            parentTableSetName: field.parentTable?.setName,
            parameters:
              field.selectedMock?.parameters?.reduce(
                (acc, p) => {
                  acc[p.name] = p.value;
                  return acc;
                },
                {} as Record<string, unknown>,
              ) ?? {},
          })),
      };

      const store = ((await window.toolboxAPI.settings.get(SAVED_CONFIGS_KEY)) || {}) as SavedConfigStore;
      store[trimmedConfigName] = payload;
      await window.toolboxAPI.settings.set(SAVED_CONFIGS_KEY, store);
      const names = Object.keys(store).sort((a, b) => a.localeCompare(b));
      setSavedConfigNames(names);
      setConfigName(trimmedConfigName);

      window.toolboxAPI.utils.showNotification({
        title: "Configuration Saved",
        body: `Configuration '${trimmedConfigName}' saved to tool settings.`,
        type: "success",
      });
      onLog(`Configuration '${trimmedConfigName}' saved`, "success");
    } catch (err) {
      console.error(err);
      onLog("Failed to save configuration", "error");
      window.toolboxAPI.utils.showNotification({
        title: "Save Failed",
        body: `Unable to save configuration: ${String(err)}`,
        type: "error",
      });
    }
  }

  async function loadConfigFromJson(selectedConfigName?: string): Promise<void> {
    try {
      const importWarnings: string[] = [];
      const trimmedConfigName = (selectedConfigName ?? configName).trim();
      if (!trimmedConfigName) {
        window.toolboxAPI.utils.showNotification({
          title: "Config Name Required",
          body: "Enter or select a config name before loading.",
          type: "warning",
        });
        return;
      }

      const store = ((await window.toolboxAPI.settings.get(SAVED_CONFIGS_KEY)) || {}) as SavedConfigStore;
      const parsed = store[trimmedConfigName];

      if (!parsed) {
        window.toolboxAPI.utils.showNotification({
          title: "Configuration Not Found",
          body: `No saved configuration named '${trimmedConfigName}'.`,
          type: "warning",
        });
        return;
      }

      if (!parsed || !Array.isArray(parsed.fields) || !parsed.tableLogical) {
        throw new Error("Invalid configuration format");
      }

      const targetTable = viewModel.tables.find((t) => t.logical === parsed.tableLogical);
      if (!targetTable) {
        importWarnings.push(`Table '${parsed.tableLogical}' was not found in this environment.`);
        const warningBody = importWarnings.join(" ");
        onLog(warningBody, "warning");
        window.toolboxAPI.utils.showNotification({
          title: "Configuration Loaded With Warnings",
          body: warningBody,
          type: "warning",
          duration: 10000,
        });
        return;
      }

      isImportingConfigRef.current = true;
      setLoadingConfig(true);
      viewModel.selectedTable = targetTable;
      const loadedConfig = await dvSvc.loadConfig(targetTable);

      const importedByLogical = new Map(parsed.fields.map((f) => [f.logicalName, f]));
      const availableFieldNames = new Set((loadedConfig.fields ?? []).map((field) => field.logicalName));
      const missingFieldNames = parsed.fields
        .map((field) => field.logicalName)
        .filter((logicalName) => !availableFieldNames.has(logicalName));

      if (missingFieldNames.length > 0) {
        importWarnings.push(`Fields not found: ${missingFieldNames.join(", ")}.`);
      }

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

      viewModel.config = loadedConfig;
      if (Number.isFinite(parsed.rowCount) && parsed.rowCount > 0) {
        viewModel.rowCount = parsed.rowCount;
      }

      if (importWarnings.length > 0) {
        const warningBody = `Configuration loaded with warnings: ${importWarnings.join(" ")}`;
        onLog(warningBody, "warning");
        window.toolboxAPI.utils.showNotification({
          title: "Configuration Loaded With Warnings",
          body: warningBody,
          type: "warning",
          duration: 12000,
        });
      } else {
        window.toolboxAPI.utils.showNotification({
          title: "Configuration Loaded",
          body: `Loaded saved config '${trimmedConfigName}'.`,
          type: "success",
        });
        onLog(`Configuration '${trimmedConfigName}' loaded`, "success");
      }
    } catch (err) {
      console.error(err);
      onLog("Failed to import configuration", "error");
      window.toolboxAPI.utils.showNotification({
        title: "Import Failed",
        body: `Unable to load configuration: ${String(err)}`,
        type: "error",
      });
    } finally {
      isImportingConfigRef.current = false;
      setLoadingConfig(false);
    }
  }

  function saveMockarooKey(value: string) {
    viewModel.mockarooApiKey = value;
    window.toolboxAPI.settings.set("mockarooApiKey", value);
    window.toolboxAPI.utils.showNotification({
      title: "Mockaroo API Key Saved",
      body: `Your Mockaroo API key has been saved successfully.`,
      type: "success",
    });
  }

  const configGrid = (
    <>
      <div style={{ width: "98vw", height: "85vh", position: "relative" }}>
        <AgGridReact<ConfigColumn>
          theme={myTheme}
          rowData={viewModel.config?.fields || []}
          columnDefs={colDefs}
          domLayout="normal"
        />
      </div>
    </>
  );
  const tablesList = (
    <>
      {filteredTables.map((table) => (
        <Option key={table.id} value={table.logical} text={`${table.label} [${table.logical}]`} checkIcon={null}>
          <span>{table.label}</span>
          <span style={{ fontSize: "11px", opacity: 0.75, marginLeft: "6px" }}>[{table.logical}]</span>
        </Option>
      ))}
    </>
  );
  const toolbar = (
    <div style={{ overflow: "visible", position: "relative", zIndex: 1000, paddingBottom: "10px" }}>
      <Toolbar className={styles.toolbar}>
        <ToolbarGroup className={styles.leftToolbarGroup}>
          <Combobox
            disabled={!viewModel.tables || viewModel.tables.length === 0}
            placeholder="Select a table"
            listbox={{ className: styles.listbox, style: { maxHeight: "300px" } }}
            positioning={{ position: "below", align: "start", offset: { crossAxis: 0, mainAxis: 4 } }}
            onOptionSelect={onOptionSelect}
            selectedOptions={viewModel.selectedTable ? [viewModel.selectedTable.logical] : []}
            value={tableFilter}
            onChange={(e) => setTableFilter(e.target.value)}
            style={{ width: "200px" }}
            size="small"
            clearable
          >
            {tablesList}
          </Combobox>
          <Button
            size="small"
            appearance="secondary"
            icon={<SaveRegular />}
            aria-label="Save Mock Config"
            title="Save Mock Config"
            onClick={saveConfigAsJson}
            style={{ marginLeft: "8px" }}
          />
          <Combobox
            size="small"
            placeholder="Saved config"
            value={configName}
            onChange={(e) => setConfigName(e.target.value)}
            onOptionSelect={(_e, data) => {
              const selectedName = data.optionValue || "";
              setConfigName(selectedName);
              if (selectedName) {
                void loadConfigFromJson(selectedName);
              }
            }}
            style={{ width: "160px", marginLeft: "8px" }}
            listbox={{ className: styles.listbox, style: { maxHeight: "240px" } }}
          >
            {savedConfigNames.map((name) => (
              <Option key={name} value={name} text={name}>
                {name}
              </Option>
            ))}
          </Combobox>
        </ToolbarGroup>
        <ToolbarGroup>
          <Field size="small" label="Mockaroo Key">
            <Input
              size="small"
              placeholder="Enter API key"
              value={mockarooKeyInput}
              style={{ width: "100px", marginRight: "5px" }}
              onChange={(e) => setMockarooKeyInput(e.target.value)}
              onBlur={() => saveMockarooKey(mockarooKeyInput.trim())}
            />
          </Field>
          <Field size="small" label="No. of Rows ">
            <Input
              size="small"
              type="number"
              width={100}
              placeholder="Number of records"
              value={viewModel.rowCount.toString()}
              style={{ width: "80px" }}
              onChange={(e) => {
                viewModel.rowCount = parseInt(e.target.value);
              }}
            />
          </Field>
        </ToolbarGroup>
      </Toolbar>
    </div>
  );
  return (
    <div style={{ overflow: "visible", position: "relative", height: "100%" }}>
      {toolbar}
      {loadingConfig && (
        <div style={{ padding: "20px" }}>
          <Spinner label="Loading configuration..." />
        </div>
      )}
      {!loadingConfig && viewModel.config && configGrid}
    </div>
  );
});
