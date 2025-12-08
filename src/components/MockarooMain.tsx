import { observer } from "mobx-react";
import { ViewModel } from "../model/viewModel";
import { dvService } from "../utils/dataverse";
import React from "react";
import { Dropdown, Option, SelectTabData, SelectTabEvent, Tab, TabList, TabValue } from "@fluentui/react-components";

interface MockarooMainProps {
  connection: ToolBoxAPI.DataverseConnection | null;
  dvService: dvService;
  isLoading: boolean;
  viewModel: ViewModel;
  onLog: (message: string, type?: "info" | "success" | "warning" | "error") => void;
}

export const MockarooMain = observer((props: MockarooMainProps): React.JSX.Element => {
  const { connection, dvService, isLoading, viewModel, onLog } = props;

  React.useEffect(() => {
    console.log("Effect to load tables triggered", viewModel.tables.length, connection, isLoading);
    if (viewModel.tables.length === 0 && connection) {
      dvService.loadTables().then((tables) => {
        onLog("Tables loaded successfully", "success");
        viewModel.tables = tables;
      });
    }
  }, [connection, dvService]);
  //#region UseStates
  const [selectedTab, setSelectedTab] = React.useState<TabValue>("config");
  //#endregion

  //#region Events
  const onMainTabSelect = (_event: SelectTabEvent, data: SelectTabData) => {
    setSelectedTab(data.value);
  };
  //#endregion

  const tablesList = (
    <>
      {viewModel.tables.map((table) => (
        <Option key={table.id} value={table.name}>
          {table.label}
        </Option>
      ))}
    </>
  );
  const tabs = (
    <TabList selectedValue={selectedTab} onTabSelect={onMainTabSelect}>
      <Tab value="config">Configuration</Tab>
      <Tab value="data">Data</Tab>
      <div style={{ display: "flex", width: "100%", alignItems: "center" }}>
        {selectedTab === "config" && (
          <div style={{ marginLeft: "auto", marginRight: "10px" }}>
            <Dropdown placeholder="Select a table test">{tablesList}</Dropdown>
          </div>
        )}
      </div>
    </TabList>
  );

  const configTab = <div>Configuration Tab Content {viewModel.tables.length}</div>;
  return (
    <>
      {tabs}
      {selectedTab === "config" && configTab}
    </>
  );
});
