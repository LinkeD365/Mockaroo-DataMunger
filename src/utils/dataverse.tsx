import { Config, ConfigField } from "../model/Config";
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
      throw new Error("No connection available");
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
      return tables.sort((a, b) => a.label.localeCompare(b.label));
    } catch (error) {
      this.onLog(`Error loading tables: ${error}`, "error");
      console.error("Error loading tables:", error);
      throw error;
    }
  }
  async loadConfig(selectedTable: Table): Promise<Config> {
    if (!this.connection || !this.connection.isActive) {
      this.onLog("No connection available", "error");
      throw new Error("No connection available");
    }

    try {
      this.onLog(`Loading configuration for table: ${selectedTable.logical}`, "info");
      const entityMeta: any = await this.dvApi.getEntityRelatedMetadata(selectedTable.logical, "Attributes", [
        "MetadataId",
        "LogicalName",
        "DisplayName",
        "AttributeType",
      ]);

      this.onLog(`Attributes loaded for table: ${selectedTable.label}`, "success");
      console.log("Attributes retrieved:", entityMeta);
      const configFields: ConfigField[] = entityMeta.value.map((attr: any) => {
        return new ConfigField(
          attr.LogicalName,
          attr.MetadataId,
          attr.AttributeType,
          attr.DisplayName?.UserLocalizedLabel?.Label || attr.LogicalName
        );
      });
      const configObj = new Config(
        new Table(selectedTable.logical, selectedTable.id, selectedTable.label),
        configFields.sort((a, b) => a.displayName.localeCompare(b.displayName))
      );
      console.log("Configuration object created:", configObj);
      return configObj;
    } catch (error) {
      this.onLog(`Error loading configuration: ${error}`, "error");
      console.error("Error loading configuration:", error);
      throw error;
    }
  }

  async loadFieldDetails(table: Table, field: ConfigField): Promise<{ name: string; value: string }[]> {
    if (!this.connection || !this.connection.isActive) {
      this.onLog("No connection available", "error");
      throw new Error("No connection available");
    }
    let url = `EntityDefinitions(LogicalName='${table.logical}')/Attributes(LogicalName='${field.logicalName}')`;
    switch (field.type) {
      case "String":
      case "Memo":
        url += "/Microsoft.Dynamics.CRM.StringAttributeMetadata?$select=MaxLength";
        console.log("Fetching string field metadata from URL:", url);
        const stringMeta = await this.dvApi.queryData(url);
        console.log("String field metadata retrieved:", stringMeta);
        return [{ name: "Max Length", value: "test" }];
        break;
    }
    return [];
  }
}
