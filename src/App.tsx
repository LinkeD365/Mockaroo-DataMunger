import { useCallback, useEffect, useMemo, useState } from "react";
import { MockarooMain } from "./components/MockarooMain";
import { useConnection, useEventLog, useToolboxEvents } from "./hooks/useToolboxAPI";
import { FluentProvider, webDarkTheme, webLightTheme } from "@fluentui/react-components";
import { ViewModel } from "./model/viewModel";

import { dvService } from "./utils/dataverse";
import { mockarooService } from "./utils/mockaroo";

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
          console.log("Theme or settings updated, refreshing theme");
          const theme = await window.toolboxAPI.utils.getCurrentTheme();
          document.body.dataset.agThemeMode = theme;
          setTheme(theme);
          break;
      }
    },
    [refreshConnection]
  );

  useToolboxEvents(handleEvent);

  // Add initial log (run only once on mount)
  const [theme, setTheme] = useState<string>("light");

  const [viewModel] = useState(() => new ViewModel());
  const dvSvc = useMemo(() => {
    console.log("Creating dvService with connection:", connection);
    return new dvService({
      connection: connection,
      dvApi: window.dataverseAPI,
      onLog: addLog,
    });
  }, [connection, addLog]);

  const mockarooSvc = useMemo(() => {
    console.log("Creating mockarooService with connection:", connection);
    return new mockarooService({
      connection: connection,
      dataverse: dvSvc,
      onLog: addLog,
    });
  }, [connection, dvSvc, addLog]);

  useEffect(() => {
    (async () => {
      const currentTheme = await window.toolboxAPI.utils.getCurrentTheme();
      setTheme(currentTheme);
      document.body.dataset.agThemeMode = currentTheme;
    })();
  }, []);
  return (
    <FluentProvider theme={theme === "dark" ? webDarkTheme : webLightTheme}>
      <MockarooMain
        connection={connection}
        viewModel={viewModel}
        dvSvc={dvSvc}
        onLog={addLog}
        isLoading={isLoading}
        mckSvc={mockarooSvc}
      />
    </FluentProvider>
  );
}

export default App;
