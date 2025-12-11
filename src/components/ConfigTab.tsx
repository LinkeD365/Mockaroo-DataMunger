import React from "react";
import { ViewModel } from "../model/viewModel";
import { dvService } from "../utils/dataverse";
import { observer } from "mobx-react";
import { Config, ConfigField } from "../model/Config";
import {
  Combobox,
  ComboboxProps,
  createTableColumn,
  DataGrid,
  DataGridBody,
  DataGridCell,
  DataGridHeader,
  DataGridHeaderCell,
  DataGridRow,
  Field,
  Input,
  makeStyles,
  Option,
  Switch,
  TableColumnDefinition,
  tokens,
  Toolbar,
  ToolbarGroup,
} from "@fluentui/react-components";

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
  dvService: dvService;
  isLoading: boolean;
  viewModel: ViewModel;
  onLog: (message: string, type?: "info" | "success" | "warning" | "error") => void;
}

export const ConfigTab = observer((props: ConfigTabProps): React.JSX.Element => {
  const { connection, dvService, isLoading, viewModel, onLog } = props;
  const styles = useStyles();
  const [loadingConfig, setLoadingConfig] = React.useState<boolean>(false);

  React.useEffect(() => {
    const loadConfig = async () => {
      if (connection && viewModel.selectedTableName) {
        if (viewModel.config && viewModel.config.table.logical === viewModel.selectedTableName) {
          // Configuration already loaded for the selected table
          return;
        }
        const selectedTable = viewModel.tables.find((table) => table.logical === viewModel.selectedTableName);
        if (selectedTable) {
          try {
            setLoadingConfig(true);
            const retrievedConfig: Config = await dvService.loadConfig(selectedTable);
            viewModel.config = retrievedConfig;
          } catch (err) {
            onLog("Failed to load configuration", "error");
            console.error(err);
          } finally {
            setLoadingConfig(false);
          }
        }
      }
    };
    console.log("useEffect", viewModel.selectedTableName, dvService, connection);
    loadConfig();
  }, [connection, viewModel.selectedTableName, dvService, onLog]);
  async function updateItem(item: ConfigField) {
    if (!viewModel.config || !viewModel.config.fields) return;
    try {
      if (item.detailsRetrieved === false) {
        // Load additional details if not already retrieved
        console.log("Loading details for field:", item.logicalName);
        const detailedField = await dvService.loadFieldDetails(viewModel.config.table, item);
        item.fieldDetails = detailedField;
        item.detailsRetrieved = true;
      }
      viewModel.config.fields = viewModel.config.fields.map((f: ConfigField) => {
        if (f.logicalName === item.logicalName) {
          // mutate the existing object to preserve properties like mockMatch/prototype
          Object.assign(f, item);
        }
        return f;
      });
    } catch (err) {
      onLog("Failed to update field include", "error");
    }
  }
  const onOptionSelect: ComboboxProps["onOptionSelect"] = (_event, data) => {
    viewModel.selectedTableName = data.optionValue as string;
  };
  const configColumns: TableColumnDefinition<ConfigField>[] = [
    createTableColumn<ConfigField>({
      columnId: "fieldName",
      compare: (a, b) => a.displayName.localeCompare(b.displayName),
      renderHeaderCell: () => {
        return "Field Name";
      },
      renderCell: (item) => {
        return <div style={{ verticalAlign: "top" }}>{item.displayName}</div>;
      },
    }),
    createTableColumn<ConfigField>({
      columnId: "logicalName",
      compare: (a, b) => a.logicalName.localeCompare(b.logicalName),
      renderHeaderCell: () => {
        return "Logical Name";
      },
      renderCell: (item) => {
        return <div style={{ verticalAlign: "top" }}>{item.logicalName}</div>;
      },
    }),
    createTableColumn<ConfigField>({
      columnId: "fieldType",
      compare: (a, b) => a.type.localeCompare(b.type),
      renderHeaderCell: () => {
        return "Field Type";
      },
      renderCell: (item) => {
        return <div style={{ verticalAlign: "top" }}>{item.type}</div>;
      },
    }),
    createTableColumn<ConfigField>({
      columnId: "include",
      compare: (a, b) => (a.include === b.include ? 0 : a.include ? -1 : 1),
      renderHeaderCell: () => {
        return "Include";
      },
      renderCell: (item) => {
        return (
          <div style={{ verticalAlign: "top" }}>
            <Switch
              key={item.logicalName}
              checked={item.include}
              size="small"
              onChange={() => {
                item.include = !item.include;
                updateItem(item);
              }}
            />
            {item.detailsRetrieved} {item.fieldDetails.length}
          </div>
        );
      },
    }),
    createTableColumn<ConfigField>({
      columnId: "mockType",
      renderHeaderCell: () => {
        return "Mock Type";
      },
      renderCell: (item) => {
        return (
          <div style={{ verticalAlign: "top" }}>
            <Combobox
              disabled={!item.include}
              size="small"
              placeholder="Select mock type"
              value={item.selectedMock?.name || ""}
              onOptionSelect={(_e, data) => {
                const selected = viewModel.mockTypes.find((mt) => mt.name === data.optionValue);
                if (selected) {
                  item.selectedMock = selected;
                  updateItem(item);
                }
              }}
            >
              {viewModel.mockTypes
                .filter((mt) => mt.type === item.mockMatch)
                .map((mt) => (
                  <Option key={mt.name} value={mt.name}>
                    {mt.name}
                  </Option>
                ))}{" "}
            </Combobox>
          </div>
        );
      },
    }),
  ];

  const configGrid = (
    <>
      <DataGrid columns={configColumns} items={viewModel.config?.fields || []} sortable resizableColumns>
        <DataGridHeader
          style={{
            position: "sticky",
            top: 0,
            zIndex: 10,
            backgroundColor: tokens.colorNeutralBackground2,
            boxShadow: "0 1px 0 rgba(0,0,0,0.06)",
          }}
        >
          {" "}
          <DataGridRow>
            {({ renderHeaderCell }) => <DataGridHeaderCell>{renderHeaderCell()}</DataGridHeaderCell>}
          </DataGridRow>
        </DataGridHeader>
        <DataGridBody<ConfigField>>
          {({ item, rowId }) => (
            <DataGridRow<ConfigField> key={rowId}>
              {({ renderCell }) => <DataGridCell>{renderCell(item)}</DataGridCell>}
            </DataGridRow>
          )}
        </DataGridBody>
      </DataGrid>
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
            value={viewModel.tables.find((table) => table.logical === viewModel.selectedTableName)?.label || ""}
            style={{ width: "200px" }}
            size="small"
          >
            {tablesList}
          </Combobox>
        </ToolbarGroup>
        <ToolbarGroup>
          <Field size="small" label="No. of Rows ">
            <Input
              size="small"
              type="number"
              width={100}
              placeholder="Number of records"
              defaultValue="100"
              style={{ width: "80px" }}
            />
          </Field>
        </ToolbarGroup>
      </Toolbar>
    </div>
  );
  return (
    <div>
      {toolbar}
      {loadingConfig && <div>Loading configuration...</div>}
      {!loadingConfig && viewModel.config && configGrid}
    </div>
  );
});
