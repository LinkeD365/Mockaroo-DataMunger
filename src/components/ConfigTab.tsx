import React from "react";
import { ViewModel } from "../model/viewModel";
import { dvService } from "../utils/dataverse";
import { observer } from "mobx-react";
import { Config, ConfigField } from "../model/Config";
import {
  Combobox,
  createTableColumn,
  DataGrid,
  DataGridBody,
  DataGridCell,
  DataGridHeader,
  DataGridHeaderCell,
  DataGridRow,
  Dropdown,
  Option,
  Switch,
  TableColumnDefinition,
  tokens,
} from "@fluentui/react-components";

interface ConfigTabProps {
  connection: ToolBoxAPI.DataverseConnection | null;
  dvService: dvService;
  isLoading: boolean;
  viewModel: ViewModel;
  onLog: (message: string, type?: "info" | "success" | "warning" | "error") => void;
}

export const ConfigTab = observer((props: ConfigTabProps): React.JSX.Element => {
  const { connection, dvService, isLoading, viewModel, onLog } = props;

  const [config, setConfig] = React.useState<Config | null>(null);
  const [loadingConfig, setLoadingConfig] = React.useState<boolean>(false);

  React.useEffect(() => {
    const loadConfig = async () => {
      if (connection && viewModel.selectedTableName) {
        const selectedTable = viewModel.tables.find((table) => table.logical === viewModel.selectedTableName);
        if (selectedTable) {
          try {
            setLoadingConfig(true);
            const retrievedConfig: Config = await dvService.loadConfig(selectedTable);
            onLog("Configuration loaded successfully", "success");
            console.log("Retrieved Config:", retrievedConfig);
            setConfig(retrievedConfig);
            console.log("Config set in state:", retrievedConfig);
          } catch (err) {
            onLog("Failed to load configuration", "error");
            console.error(err);
          } finally {
            setLoadingConfig(false);
          }
        }
      }
    };

    loadConfig();
  }, [connection, isLoading, viewModel.selectedTableName, dvService, onLog]);

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
        async function updateItemSelect(item: ConfigField) {
          if (!config) return;
          try {
            if (item.detailsRetrieved === false) {
              // Load additional details if not already retrieved
              console.log("Loading details for field:", item.logicalName);
              const detailedField = await dvService.loadFieldDetails(config.table, item);
              item.fieldDetails = detailedField;
              item.detailsRetrieved = true;
            }
            setConfig((prev) => {
              if (!prev) return prev;
              return {
                ...prev,
                fields: prev.fields
                  ? prev.fields.map((f: ConfigField) => {
                      if (f.logicalName === item.logicalName) {
                        // mutate the existing object to preserve properties like mockMatch/prototype
                        Object.assign(f, { include: !f.include });
                      }
                      return f;
                    })
                  : prev.fields,
              } as Config;
            });

          } catch (err) {
            onLog("Failed to update field include", "error");
          }
        }

        return (
          <div style={{ verticalAlign: "top" }}>
            <Switch
              key={item.logicalName}
              checked={item.include}
              size="small"
              onChange={() => {
                updateItemSelect(item);
              }}
            />{item.detailsRetrieved } {item.fieldDetails.length}
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
            <Combobox disabled={!item.include} size="small">
              {viewModel.MockTypes.filter((mt) => mt.type === item.mockMatch).map((mt) => (
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
      <DataGrid columns={configColumns} items={config?.fields || []} sortable resizableColumns>
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
  return (
    <div>
      {loadingConfig && <div>Loading configuration...</div>}
      {!loadingConfig && config && configGrid}
    </div>
  );
});
