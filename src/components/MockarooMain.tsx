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
  Tab,
  TabList,
  TabValue,
  Tooltip,
} from "@fluentui/react-components";
import { DatabaseArrowUpFilled, DatabaseCheckmarkFilled } from "@fluentui/react-icons";
import { ConfigTab } from "./ConfigTab";
import { mockarooService } from "../utils/mockaroo";
import { DataTab } from "./DataTab";

interface MockarooMainProps {
  connection: ToolBoxAPI.DataverseConnection | null;
  dvSvc: dvService;
  mckSvc: mockarooService;
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
  const { connection, dvSvc, mckSvc, isLoading, viewModel, onLog } = props;

  //#region useState hooks
  // Track if tables have been loaded to avoid infinite loop
  const [tablesLoaded, setTablesLoaded] = React.useState(false);
  const [selectedTab, setSelectedTab] = React.useState<TabValue>("config");
  const [openSaveDialog, setOpenSaveDialog] = React.useState(false);
  //#endregion
  const styles = useStyles();

  React.useEffect(() => {
    //console.log("Effect to load tables triggered", viewModel.tables.length, connection, isLoading, tablesLoaded);

    if (connection && !tablesLoaded && viewModel.tables.length === 0) {
      dvSvc.loadTables().then((tables) => {
        onLog("Tables loaded successfully", "success");
        viewModel.tables = tables;
        setTablesLoaded(true);
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

  function getData(): void {
    mckSvc.getMockData(10, viewModel.config?.jsonString ?? "").then((data) => {
      viewModel.data = data;
      window.toolboxAPI.utils.showNotification({
        title: "Mock Data Generated",
        body: `${viewModel.data.length} mock data generated successfully`,
        type: "success",
      });
      setSelectedTab("data");
      onLog(`Generated ${viewModel.data.length} mock data records`, "success");
    });
  }

  function createDataConfirmation(): void {
    setOpenSaveDialog(true);
  }

  async function createData(): Promise<void> {
    console.log("Creating data in Dataverse:", viewModel.data);
    await dvSvc.createData(viewModel.selectedTableName, viewModel.data || []).then(() => {
      window.toolboxAPI.utils.showNotification({
        title: "Data Created",
        body: `${viewModel.data?.length} records created successfully`,
        type: "success",
      });
      setOpenSaveDialog(false);
    });
  }

  const saveDialog = (
    <Dialog open={openSaveDialog} onOpenChange={(event, data) => setOpenSaveDialog(data.open)}>
      <DialogSurface>
        <DialogBody>
          <DialogTitle>Create Data</DialogTitle>
          <DialogContent>
            Do you want to create {viewModel.data?.length} records in the {viewModel.tables.find(t => t.logical === viewModel.selectedTableName)?.label} table?
          </DialogContent>
          <DialogActions>
            <Button appearance="primary" onClick={createData}>Create Data</Button>
            <DialogTrigger disableButtonEnhancement>
              <Button appearance="secondary">Cancel</Button>
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
      <Tab value="data" disabled={!(viewModel.data && viewModel.data.length > 0)}>
        Data
      </Tab>
      {selectedTab === "config" && (
        <div className={styles.tabEnd}>
          <Tooltip content="Generate mock data" relationship="label" {...props}>
            <Button
              className={styles.button}
              icon={<DatabaseArrowUpFilled />}
              disabled={(viewModel.config?.fields?.filter((f) => f.include).length ?? 0) === 0}
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
    <>
      {tabs}
      {saveDialog}
      {selectedTab === "config" && (
        <ConfigTab
          connection={connection}
          dvService={dvSvc}
          isLoading={isLoading}
          viewModel={viewModel}
          onLog={onLog}
        />
      )}
      {selectedTab === "data" && (
        <DataTab connection={connection} dvService={dvSvc} isLoading={isLoading} viewModel={viewModel} onLog={onLog} />
      )}
    </>
  );
});
