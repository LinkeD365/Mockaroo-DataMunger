import { observer } from "mobx-react";
import { ViewModel } from "../model/viewModel";
import { dvService } from "../utils/dataverse";
import React from "react";
import {
  Combobox,
  ComboboxProps,
  Field,
  Input,
  Label,
  makeStyles,
  Option,
  SelectTabData,
  SelectTabEvent,
  Tab,
  TabList,
  TabValue,
} from "@fluentui/react-components";
import { ConfigTab } from "./ConfigTab";

interface MockarooMainProps {
  connection: ToolBoxAPI.DataverseConnection | null;
  dvService: dvService;
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
});

export const MockarooMain = observer((props: MockarooMainProps): React.JSX.Element => {
  const { connection, dvService, isLoading, viewModel, onLog } = props;

  //#region useState hooks
  // Track if tables have been loaded to avoid infinite loop
  const [tablesLoaded, setTablesLoaded] = React.useState(false);
  const [selectedTab, setSelectedTab] = React.useState<TabValue>("config");
  //#endregion
  const styles = useStyles();

  React.useEffect(() => {
    console.log("Effect to load tables triggered", viewModel.tables.length, connection, isLoading, tablesLoaded);

    if (connection && !tablesLoaded && viewModel.tables.length === 0) {
      dvService.loadTables().then((tables) => {
        onLog("Tables loaded successfully", "success");
        viewModel.tables = tables;
        setTablesLoaded(true);
      });
    }
  }, [connection, dvService, onLog, tablesLoaded]);

  React.useEffect(() => {
    if (viewModel.MockTypes.length === 0) {
      // Initialize MockTypes only once
      let types = "[]";
      (async () => {
        try {
          // Use dynamic import instead of require to avoid Node types dependency
          const mod = await import("../model/Mocks.json");
          // JSON modules may be exported as default or as the module itself depending on bundler
          types = JSON.stringify((mod && (mod.default ?? mod)) ?? []);

          console.log(types);
        } catch (err) {
          console.error("Failed to load mocks.json:", err);
          types = "[]";
        }
        viewModel.MockTypes = JSON.parse(types).types;
        console.log("MockTypes initialized:", viewModel.MockTypes);
      })();
    }
  }, []);

  //#region Events
  const onMainTabSelect = (_event: SelectTabEvent, data: SelectTabData) => {
    setSelectedTab(data.value);
  };

  const onOptionSelect: ComboboxProps["onOptionSelect"] = (_event, data) => {
    viewModel.selectedTableName = data.optionValue as string;
  };

  //#endregion

  const tablesList = (
    <>
      {viewModel.tables.map((table) => (
        <Option key={table.id} value={table.logical}>
          {table.label}
        </Option>
      ))}
    </>
  );
  const tabs = (
    <TabList selectedValue={selectedTab} onTabSelect={onMainTabSelect}>
      <Tab value="config">Configuration</Tab>
      <Tab value="data">Data</Tab>
      {selectedTab === "config" && (
        <div
          style={{
            display: "flex",
            width: "100%",
            alignItems: "center",
            marginLeft: "auto",
            justifyItems: "end",
            justifyContent: "flex-end",
          }}
        >
          <div style={{ marginRight: "5px" }}>
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
          </div>
          <div style={{ width: "100px" }}>
            <Combobox
              disabled={!tablesLoaded}
              placeholder="Select a table"
              listbox={{ className: styles.listbox }}
              positioning={{ autoSize: true }}
              onOptionSelect={onOptionSelect}
              style={{width:"100%"}}
              size="small"
            >
              {tablesList}
            </Combobox>
          </div>
        </div>
      )}
    </TabList>
  );

  return (
    <>
      {tabs}
      {selectedTab === "config" && (
        <ConfigTab
          connection={connection}
          dvService={dvService}
          isLoading={isLoading}
          viewModel={viewModel}
          onLog={onLog}
        />
      )}
    </>
  );
});
