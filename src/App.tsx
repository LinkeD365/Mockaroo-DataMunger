import { useCallback, useEffect, useMemo, useState } from "react";
import { MockarooMain } from "./components/MockarooMain";
import { useConnection, useEventLog, useToolboxEvents } from "./hooks/useToolboxAPI";
import { FluentProvider, webDarkTheme, webLightTheme } from "@fluentui/react-components";
import { ViewModel } from "./model/viewModel";

import { dvService } from "./utils/dataverse";
import { mockarooService } from "./utils/mockaroo";
import { UtilLib } from "./utils/utils";

function App() {
  const { connection, isLoading, refreshConnection } = useConnection();
  const { addLog } = useEventLog();

  // Handle platform events
  const handleEvent = useCallback(
    async (event: string, _data: any) => {
      switch (event) {
        case "connection:updated":
        case "connection:created":
          refreshConnection();
          break;

        case "connection:deleted":
          refreshConnection();
          break;

        case "terminal:output":
        case "terminal:command:completed":
        case "terminal:error":
          // Terminal events handled by dedicated components
          break;
        case "settings:updated":
          const theme = await window.toolboxAPI.utils.getCurrentTheme();
          document.body.dataset.agThemeMode = theme;
          setTheme(theme);
          break;
      }
    },
    [refreshConnection],
    [refreshConnection],
  );

  useToolboxEvents(handleEvent);

  const [theme, setTheme] = useState<string>("light");
  const [viewModel] = useState(() => new ViewModel());

  // Add initial log (run only once on mount)
  useEffect(() => {
    addLog("Mockaroo Data Munger mounted");
  }, [addLog]);
  const dvSvc = useMemo(() => {
    if (!connection) return null;
    return new dvService({
      connection: connection,
      dvApi: window.dataverseAPI,
      onLog: addLog,
    });
  }, [connection, addLog]);

  const mockarooSvc = useMemo(() => {
    if (!dvSvc) return null;
    return new mockarooService({
      connection: connection,
      dvSvc: dvSvc,
      onLog: addLog,
    });
  }, [connection, dvSvc, addLog]);

  const utils = useMemo(() => {
    return new UtilLib({
      onLog: addLog,
    });
  }, [connection, dvSvc, addLog]);

  useEffect(() => {
    (async () => {
      const currentTheme = await window.toolboxAPI.utils.getCurrentTheme();
      setTheme(currentTheme);
      document.body.dataset.agThemeMode = currentTheme;
      const mockarooApiKey = await window.toolboxAPI.settings.get("mockarooApiKey");
      if (mockarooApiKey) {
        viewModel.mockarooApiKey = mockarooApiKey;
      }
    })();
  }, []);
  return (
    <FluentProvider theme={theme === "dark" ? webDarkTheme : webLightTheme}>
      {dvSvc && mockarooSvc ? (
        <MockarooMain
          connection={connection}
          viewModel={viewModel}
          dvSvc={dvSvc}
          onLog={addLog}
          isLoading={isLoading}
          mckSvc={mockarooSvc}
          utils={utils}
        />
      ) : (
        <div>Loading...</div>
      )}
    </FluentProvider>
  );
}

export default App;
