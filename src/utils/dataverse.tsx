import { Table } from "../model/viewModel";

interface dvServiceProps {
  connection: ToolBoxAPI.DataverseConnection | null;
  dvApi: DataverseAPI.API;
  onLog: (message: string, type?: "info" | "success" | "warning" | "error") => void;
}
export class dvService {
  connection: ToolBoxAPI.DataverseConnection | null;
  dvApi: DataverseAPI.API;
  onLog: (message: string, type?: "info" | "success" | "warning" | "error") => void;

  constructor(props: dvServiceProps) {
    this.connection = props.connection;
    this.dvApi = props.dvApi;
    this.onLog = props.onLog;
  }

  async loadTables(): Promise<Table[]> {
    if (!this.connection) {
      this.onLog("No connection available", "error");
      return [];
    }
    console.log("Loading tables from Dataverse...");
    try {
      this.onLog("Loading tables from Dataverse...", "info");
      const tablesMetadata = await this.dvApi.getAllEntitiesMetadata();
      console.log("Tables metadata retrieved:", tablesMetadata);
      const tables: Table[] = tablesMetadata.value.map((tableMeta: any) => {
        const table = new Table(
          tableMeta.LogicalName,
          tableMeta.MetadataId,
          tableMeta.DisplayName?.UserLocalizedLabel?.Label || tableMeta.LogicalName
        );
        return table;
      });
      return tables;
    } catch (error) {
      this.onLog(`Error loading tables: ${error}`, "error");
      console.error("Error loading tables:", error);
      return [];
    }
  }
}
