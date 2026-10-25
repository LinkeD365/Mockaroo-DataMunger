import { toJS } from "mobx";
import { SelectionValue, Config, ConfigColumn } from "../model/Config";
import { Table } from "../model/viewModel";
import { createInBatches, DataverseBatchError, validateRecordCount } from "./bulkOperations";

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
        "PrimaryNameAttribute",
        "PrimaryIdAttribute",
      ]);

      const tables: Table[] = tablesMetadata.value.map((tableMeta: any) => {
        const table = {
          logical: tableMeta.LogicalName,
          id: tableMeta.MetadataId,
          label: tableMeta.DisplayName?.UserLocalizedLabel?.Label || tableMeta.LogicalName,
          setName: tableMeta.EntitySetName,
          primaryNameColumn: tableMeta.PrimaryNameAttribute,
          primaryIdColumn: tableMeta.PrimaryIdAttribute,
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

      const configFields: ConfigColumn[] = entityMeta.value
        .map((attr: any) => {
          return new ConfigColumn(
            attr.LogicalName,
            attr.MetadataId,
            attr.AttributeType,
            attr.DisplayName?.UserLocalizedLabel?.Label || attr.LogicalName,
          );
        })
        .filter(
          (field: ConfigColumn) =>
            field.type !== "Virtual" &&
            field.type !== "Customer" &&
            field.type !== "Owner" &&
            field.type !== "Uniqueidentifier" &&
            field.displayName &&
            !field.displayName.toLowerCase().includes("deprecated"),
        );
      const configObj = new Config(
        new Table(
          selectedTable.logical,
          selectedTable.id,
          selectedTable.label,
          selectedTable.setName,
          selectedTable.primaryNameColumn,
          selectedTable.primaryIdColumn,
        ),
        configFields.sort((a, b) => a.displayName.localeCompare(b.displayName)),
      );

      return configObj;
    } catch (error) {
      this.onLog(`Error loading configuration: ${error}`, "error");
      console.error("Error loading configuration:", error);
      throw error;
    }
  }

  // async loadFieldDetails(table: Table, field: ConfigColumn): Promise<{ name: string; value: string }[]> {
  //   if (!this.connection) {
  //     this.onLog("No connection available", "error");
  //     throw new Error("No connection available");
  //   }
  //   let url = `EntityDefinitions(LogicalName='${table.logical}')/Attributes(LogicalName='${field.logicalName}')`;
  //   switch (field.type) {
  //     case "String":
  //     case "Memo":
  //       url += "/Microsoft.Dynamics.CRM.StringAttributeMetadata?$select=MaxLength";

  //       const stringMeta = await this.dvApi.queryData(url);
  //   }
  //   return [];
  // }

  async createData(
    table: Table,
    fields: ConfigColumn[],
    data: Record<string, unknown>[],
  ): Promise<{ createdIds: string[] }> {
    if (!this.connection) {
      const error = new Error("No connection available");
      this.onLog(error.message, "error");
      throw error;
    }
    if (!table || !data || data.length === 0) {
      const error = new Error("No table selected or data passed for data creation");
      this.onLog(error.message, "error");
      throw error;
    }
    if (!fields || fields.length === 0) {
      const error = new Error("No fields selected for data creation");
      this.onLog(error.message, "error");
      throw error;
    }

    try {
      validateRecordCount(data.length);
    } catch (error) {
      this.onLog(String(error), "error");
      throw error;
    }
    const records = toJS(data).map((record) => ({ ...record }));
    fields
      .filter((f) => f.selectedMock?.type === "picklist")
      .forEach((fld) => {
        records.forEach((record) => {
          record[fld.logicalName] = record[fld.logicalName + "_value"];
          delete record[fld.logicalName + "_value"];
        });
      });
    fields
      .filter((f) => f.selectedMock?.type === "lookup")
      .forEach((fld) => {
        records.forEach((record) => {
          record[fld.dbField] = "/" + fld.parentTable?.setName + "(" + record[fld.logicalName + "_value"] + ")";
          delete record[fld.logicalName + "_value"];
          delete record[fld.logicalName];
        });
      });

    try {
      const createdIds = await createInBatches(records, async (batch) => {
        const activeConnection = await window.toolboxAPI.connections.getActiveConnection();
        if (
          !activeConnection ||
          activeConnection.id !== this.connection?.id ||
          activeConnection.url !== this.connection?.url
        ) {
          throw new Error("The active Dataverse connection changed. Review the target and try again.");
        }
        return this.dvApi.createMultiple(table.logical, batch);
      });
      this.onLog(`Created ${createdIds.length} records in ${table.label}.`, "success");
      return { createdIds };
    } catch (error) {
      const message =
        error instanceof DataverseBatchError
          ? error.message
          : `Error creating data: ${String(error)}`;
      this.onLog(message, "error");
      throw error;
    }
  }

  async getChoiceValues(tableLogicalName: string, fieldLogicalName: string): Promise<SelectionValue[]> {
    if (!this.connection) {
      this.onLog("No connection available", "error");
      throw new Error("No connection available");
    }
    try {
      this.onLog(`Loading picklist values for field: ${fieldLogicalName}`, "info");
      const url = `EntityDefinitions(LogicalName='${tableLogicalName}')/Attributes(LogicalName='${fieldLogicalName}')/Microsoft.Dynamics.CRM.PicklistAttributeMetadata?$select=LogicalName&$expand=OptionSet`;
      const picklistMeta: any = await this.dvApi.queryData(url);

      const options = picklistMeta.OptionSet?.Options || [];
      const values: SelectionValue[] = options.map(
        (opt: any) => new SelectionValue(opt.Label?.UserLocalizedLabel?.Label || "", opt.Value.toString()),
      );
      this.onLog(`Picklist values loaded for field: ${fieldLogicalName}`, "success");
      return values;
    } catch (error) {
      this.onLog(`Error loading picklist values: ${error}`, "error");
      console.error("Error loading picklist values:", error);
      throw error;
    }
  }

  async getBooleanValues(tableLogicalName: string, fieldLogicalName: string): Promise<SelectionValue[]> {
    if (!this.connection) {
      this.onLog("No connection available", "error");
      throw new Error("No connection available");
    }

    try {
      this.onLog(`Loading boolean values for field: ${fieldLogicalName}`, "info");
      const url = `EntityDefinitions(LogicalName='${tableLogicalName}')/Attributes(LogicalName='${fieldLogicalName}')/Microsoft.Dynamics.CRM.BooleanAttributeMetadata?$select=LogicalName&$expand=OptionSet`;
      const booleanMeta: any = await this.dvApi.queryData(url);

      const falseOption = booleanMeta.OptionSet?.FalseOption;
      const trueOption = booleanMeta.OptionSet?.TrueOption;

      const values: SelectionValue[] = [
        new SelectionValue(
          falseOption?.Label?.UserLocalizedLabel?.Label || "False",
          String(falseOption?.Value ?? "false"),
        ),
        new SelectionValue(trueOption?.Label?.UserLocalizedLabel?.Label || "True", String(trueOption?.Value ?? "true")),
      ];

      this.onLog(`Boolean values loaded for field: ${fieldLogicalName}`, "success");
      return values;
    } catch (error) {
      this.onLog(`Error loading boolean values: ${error}`, "error");
      console.error("Error loading boolean values:", error);
      throw error;
    }
  }

  async getLookupValues(
    table: string,
    nameColumn: string,
    idColumn: string,
    searchQuery: string,
  ): Promise<SelectionValue[]> {
    return new Promise<SelectionValue[]>(async (resolve, reject) => {
      if (!this.connection) {
        throw new Error("No connection available");
      }
      try {
        this.onLog(`Loading lookup values for field: ${nameColumn}`, "info");
        const escapedSearch = searchQuery.replace(/'/g, "''");
        // Implementation to retrieve lookup values goes here
        const lookupMeta = await this.dvApi.queryData(
          `${table}?$filter=contains(${nameColumn},'${escapedSearch}')&$select=${nameColumn},${idColumn}&$top=20`,
        );
        this.onLog(`Lookup values loaded for field: ${nameColumn}`, "success");
        resolve(lookupMeta.value.map((item: any) => new SelectionValue(item[nameColumn], item[idColumn])));
      } catch (error) {
        this.onLog("Error loading lookup values", "error");
        reject(error);
      }
    });
  }

  async getTableInfo(table: string, column: string): Promise<string> {
    return new Promise<string>(async (resolve, reject) => {
      if (!this.connection) {
        this.onLog("No connection available", "error");
        reject(new Error("No connection available"));
        return;
      }
      try {
        let url = `EntityDefinitions(LogicalName='${table}')/Attributes(LogicalName='${column}')/Microsoft.Dynamics.CRM.LookupAttributeMetadata?$select=Targets`;
        const lookupMeta: any = await this.dvApi.queryData(url);
        const targets: string[] = lookupMeta.Targets || [];

        resolve(targets[0]);
      } catch (error) {
        this.onLog(`Error loading table info: ${error}`, "error");
        console.error("Error loading table info:", error);
        reject(error);
      }
    });
  }
}
