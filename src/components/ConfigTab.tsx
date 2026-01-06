import React from "react";
import { ViewModel } from "../model/viewModel";
import { dvService } from "../utils/dataverse";
import { observer } from "mobx-react";
import { Config, ConfigField } from "../model/Config";
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

ModuleRegistry.registerModules([TextFilterModule, ClientSideRowModelModule, CheckboxEditorModule, NumberEditorModule]);

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
  toolbar: {
    justifyContent: "space-between",
  },
});

interface ConfigTabProps {
  connection: ToolBoxAPI.DataverseConnection | null;
  dvSvc: dvService;
  isLoading: boolean;
  viewModel: ViewModel;
  onLog: (message: string, type?: "info" | "success" | "warning" | "error") => void;
}
const myTheme = themeQuartz.withParams({
  headerHeight: "30px",
});

const MockOptSelectorMemo = React.memo(MockOptionsSelector);

export const ConfigTab = observer((props: ConfigTabProps): React.JSX.Element => {
  const { connection, dvSvc, viewModel, onLog } = props;
  const styles = useStyles();
  const [loadingConfig, setLoadingConfig] = React.useState<boolean>(false);

  const [colDefs, setColDefs] = React.useState<ColDef<ConfigField>[]>([]);

  React.useEffect(() => {
    console.log("Setting up column definitions for config grid");
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
        cellRenderer: (params: CustomCellRendererProps<ConfigField>) =>
          params.data ? (
            <MockTypeSelector field={params.data} mockTypes={viewModel.mockTypes} onUpdate={updateItem} />
          ) : null,
      },
      {
        headerName: "Config",
        headerTooltip: "Additional configuration for the selected mock type",
        field: "selectedMock.parameters",
        sortable: false,
        cellRenderer: (params: CustomCellRendererProps<ConfigField>) =>
          params.data ? (
            <MockOptSelectorMemo
              key={params.data.logicalName}
              dvSvc={dvSvc}
              vm={viewModel}
              field={params.data}
              onUpdate={updateItem}
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

  async function updateItem(item: ConfigField) {
    console.log(
      "updating config",
      viewModel.config?.fields?.filter((f) => f.logicalName === item.logicalName)
    );
    // if (!viewModel.config || !viewModel.config.fields) return;
    // try {
    //   if (item.detailsRetrieved === false) {
    //     // Load additional details if not already retrieved

    //     const detailedField = await dvSvc.loadFieldDetails(viewModel.config.table, item);
    //     item.fieldDetails = detailedField;
    //     item.detailsRetrieved = true;
    //   }
    //   viewModel.config.fields = viewModel.config.fields.map((f: ConfigField) => {
    //     if (f.logicalName === item.logicalName) {
    //       // mutate the existing object to preserve properties like mockMatch/prototype
    //       Object.assign(f, item);
    //     }
    //     return f;
    //   });
    // } catch (err) {
    //   onLog("Failed to update field include", "error");
    // }
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
      <div style={{ width: "98vw", height: "85vh" }}>
        <AgGridReact<ConfigField>
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
    <div>
      <Toolbar className={styles.toolbar}>
        <ToolbarGroup>
          <Combobox
            disabled={!viewModel.tables || viewModel.tables.length === 0}
            placeholder="Select a table"
            listbox={{ className: styles.listbox }}
            positioning={{ autoSize: true }}
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
              value={viewModel.mockarooApiKey}
              style={{ width: "100px", marginRight: "5px" }}
              onChange={(e) => {
                saveMockarooKey(e.target.value);
              }}
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
    <div>
      {toolbar}
      {loadingConfig && (
        <div>
          <Spinner label="Loading configuration..." />
        </div>
      )}
      {!loadingConfig && viewModel.config && configGrid}
    </div>
  );
});
