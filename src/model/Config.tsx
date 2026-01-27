import { makeAutoObservable } from "mobx";
import { Table } from "./viewModel";

export class Config {
  table: Table;
  fields?: ConfigColumn[];

  constructor(table: Table, fields?: ConfigColumn[]) {
    this.table = table;
    this.fields = fields;

    makeAutoObservable(this);
  }
  get jsonString(): string {
    return JSON.stringify(
      this.fields
        ?.filter((field) => field.include && field.selectedMock && !field.selectedMock.fixed)
        .map((field) => ({
          name: field.logicalName,
          type: field.selectedMock?.mockName || field.selectedMock?.name || "",
          percentBlank: field.percBlank,
          ...(field.selectedMock?.parameters?.reduce(
            (acc, param) => {
              if (param.value !== undefined) {
                acc[param.name] = param.value;
              }
              return acc;
            },
            {} as Record<string, string>,
          ) ?? {}),
          ...(( field.type === "Picklist" || field.type === "Lookup") && field.selectedValues.length > 0
            ? { values: field.selectedValues.map((v) => v.value), selectionStyle: "random" }
            : {}),
        })) ?? [],
    );
  }
}

export class ConfigColumn {
  logicalName: string;
  metadataId: string;
  type: string;
  displayName: string;
  include: boolean = false;
  maxLength?: number;
  detailsRetrieved: boolean = false;
  fieldDetails: { name: string; value: string }[] = [];
  selectedMock?: MockType;
  percBlank: number = 0;
  selectedValues: SelectionValue[] = [];
  choiceValues: SelectionValue[] = [];
  parentTable?: Table;
  fixedValue?: any;

   get dbField(): string {
    switch (this.type) {
      case "Lookup":
      case "Owner":
        return this.logicalName + "@odata.bind";
      default:
        return this.logicalName;
    }
  }

  constructor(logicalName: string, metadataId: string, type: string, displayName: string) {
    this.logicalName = logicalName;
    this.metadataId = metadataId;
    this.type = type;
    this.displayName = displayName;

    makeAutoObservable(this);
  }

  get mockMatch(): string {
    switch (this.type) {
      case "String":
      case "Memo":
        return "string";
      case "BigInt":
      case "Integer":
      case "Double":
      case "Decimal":
      case "Money":
        return "integer";
      case "DateTime":
        return "datetime";
      case "Boolean":
        return "boolean";
      case "Picklist":
        return "picklist";
      case "Lookup":
        return "lookup";
      default:
        return "Unknown";
    }
  }
}

export class MockType {
  name: string;
  mockName?: string;
  type: string;
  useMockaroo: boolean = true;
  fixed: boolean = false;
  parameters?: MockParameter[];

  constructor(name: string, type: string) {
    this.name = name;
    this.type = type;
    makeAutoObservable(this);
  }
}

export class MockParameter {
  name: string;
  type: string;
  value?: string;
  description?: string;
  default?: string;

  constructor(name: string, type: string) {
    this.name = name;
    this.type = type;
    makeAutoObservable(this);
  }
}

export class SelectionValue {
  label: string;
  value: string;
  constructor(label: string, value: string) {
    this.label = label;
    this.value = value;
  }
}
