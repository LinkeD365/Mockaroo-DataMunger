import React from "react";
import { ViewModel } from "../model/viewModel";
import { dvService } from "../utils/dataverse";
import { observer } from "mobx-react";
import { Config, ConfigColumn } from "../model/Config";
import {
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
import { MockTypeSelector } from "./MockSelector";
import { MockOptionsSelector } from "./MockOptions";
import { UtilLib } from "../utils/utils";

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

  function updateItem(_item: ConfigColumn) {
    // No-op: Grid updates are handled reactively via MobX
  }

  const onOptionSelect: ComboboxProps["onOptionSelect"] = (_event, data) => {
    viewModel.selectedTable = viewModel.tables.find((table) => table.logical === (data.optionValue as string));
  };

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
      {viewModel.tables.map((table) => (
        <Option key={table.id} value={table.logical}>
          {table.label}
        </Option>
      ))}
    </>
  );
  const toolbar = (
    <div style={{ overflow: "visible", position: "relative", zIndex: 1000, paddingBottom: "10px" }}>
      <Toolbar className={styles.toolbar}>
        <ToolbarGroup>
          <Combobox
            disabled={!viewModel.tables || viewModel.tables.length === 0}
            placeholder="Select a table"
            listbox={{ className: styles.listbox, style: { maxHeight: "300px" } }}
            positioning={{ position: "below", align: "start", offset: { crossAxis: 0, mainAxis: 4 } }}
            onOptionSelect={onOptionSelect}
            value={viewModel.selectedTable?.label || ""}
            style={{ width: "200px" }}
            size="small"
          >
            {tablesList}
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
