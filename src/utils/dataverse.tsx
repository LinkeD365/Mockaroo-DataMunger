import { toJS } from "mobx";
import { ChoiceValue, Config, ConfigField } from "../model/Config";
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

    try {
      this.onLog("Loading tables from Dataverse...", "info");
      const tablesMetadata = await this.dvApi.getAllEntitiesMetadata([
        "MetadataId",
        "LogicalName",
        "DisplayName",
        "EntitySetName",
      ]);

      const tables: Table[] = tablesMetadata.value.map((tableMeta: any) => {
        const table = {
          logical: tableMeta.LogicalName,
          id: tableMeta.MetadataId,
          label: tableMeta.DisplayName?.UserLocalizedLabel?.Label || tableMeta.LogicalName,
          setName: tableMeta.EntitySetName,
        } as Table;

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
    if (!this.connection) {
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

      // Filter out unsupported field types and deprecated fields:
      // - Virtual: calculated/rollup fields not suitable for data creation
      // - Customer/Owner: require special handling in Dataverse
      // - Uniqueidentifier: system-managed GUIDs
      // - Deprecated: legacy fields marked as deprecated
      const configFields: ConfigField[] = entityMeta.value
        .map((attr: any) => {
          return new ConfigField(
            attr.LogicalName,
            attr.MetadataId,
            attr.AttributeType,
            attr.DisplayName?.UserLocalizedLabel?.Label || attr.LogicalName
          );
        })
        .filter(
          (field: ConfigField) =>
            field.type !== "Virtual" &&
            field.type !== "Customer" &&
            field.type !== "Owner" &&
            field.type !== "Uniqueidentifier" &&
            field.displayName &&
            !field.displayName.toLowerCase().includes("deprecated")
        );
      const configObj = new Config(
        new Table(selectedTable.logical, selectedTable.id, selectedTable.label),
        configFields.sort((a, b) => a.displayName.localeCompare(b.displayName))
      );

      return configObj;
    } catch (error) {
      this.onLog(`Error loading configuration: ${error}`, "error");
      console.error("Error loading configuration:", error);
      throw error;
    }
  }

  async loadFieldDetails(table: Table, field: ConfigField): Promise<{ name: string; value: string }[]> {
    if (!this.connection) {
      this.onLog("No connection available", "error");
      throw new Error("No connection available");
    }
    let url = `EntityDefinitions(LogicalName='${table.logical}')/Attributes(LogicalName='${field.logicalName}')`;
    switch (field.type) {
      case "String":
      case "Memo":
        url += "/Microsoft.Dynamics.CRM.StringAttributeMetadata?$select=MaxLength";

        const stringMeta = await this.dvApi.queryData(url);
    }
    return [];
  }

  async createData(table: Table, fields: ConfigField[], data: any[]): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      if (!this.connection) {
        this.onLog("No connection available", "error");
        reject(new Error("No connection available"));
        return;
      }
      if (!table || !data || data.length === 0) {
        this.onLog("No table selected or data passed for data creation", "error");
        reject(new Error("No table selected or data passed for data creation"));
        return;
      }

      if (!fields || fields.length === 0) {
        this.onLog("No fields selected for data creation", "error");
        reject(new Error("No fields selected for data creation"));
        return;
      }

      fields.filter(f => f.selectedMock?.type === "picklist").forEach(fld => {
        data.forEach(record => {
          record[fld.logicalName] = fld.choiceValues.find(cv => cv.label === record[fld.logicalName])?.value;
        });
      });

      this.onLog(`Data to be created: ${JSON.stringify(toJS(data))}`, "info");
      const batchSize = 100;
      const batches: any[] = [];
      for (let i = 0; i < data.length; i += batchSize) {
        batches.push(toJS(data).slice(i, i + batchSize));
      }

      window.toolboxAPI.utils
        .executeParallel(() => Promise.all(batches.map((batch) => this.dvApi.createMultiple(table.logical, batch))))
        .then(() => {
          resolve();
        })
        .catch((error) => {
          this.onLog(`Error creating data: ${error}`, "error");
          console.error("Error creating data:", error);

          reject(error);
        });
    });
  }

  async getChoiceValues(tableLogicalName: string, fieldLogicalName: string): Promise<ChoiceValue[]> {
    if (!this.connection) {
      this.onLog("No connection available", "error");
      throw new Error("No connection available");
    }
    try {
      this.onLog(`Loading picklist values for field: ${fieldLogicalName}`, "info");
      const url = `EntityDefinitions(LogicalName='${tableLogicalName}')/Attributes(LogicalName='${fieldLogicalName}')/Microsoft.Dynamics.CRM.PicklistAttributeMetadata?$select=LogicalName&$expand=OptionSet`;
      console.log("Picklist URL:", url);
      const picklistMeta: any = await this.dvApi.queryData(url);

      const options = picklistMeta.OptionSet?.Options || [];
      const values: ChoiceValue[] = options.map((opt: any) => new ChoiceValue(opt.Label?.UserLocalizedLabel?.Label || "", opt.Value.toString()));
      this.onLog(`Picklist values loaded for field: ${fieldLogicalName}`, "success");
      return values;
    } catch (error) {
      this.onLog(`Error loading picklist values: ${error}`, "error");
      console.error("Error loading picklist values:", error);
      throw error;
    }
  }
}
