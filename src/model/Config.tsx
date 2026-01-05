import { makeAutoObservable } from "mobx";
import { Table } from "./viewModel";

export class Config {
  table: Table;
  fields?: ConfigField[];

  constructor(table: Table, fields?: ConfigField[]) {
    this.table = table;
    this.fields = fields;

    makeAutoObservable(this);
  }
  get jsonString(): string {
    return JSON.stringify(
      this.fields
        ?.filter((field) => field.include && field.selectedMock)
        .map((field) => ({
          name: field.logicalName,
          type: field.selectedMock?.name || "",
          percBlank: field.percBlank,
        })) ?? []
    );
  }
}

export class ConfigField {
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
        return "integer";
      case "DateTime":
        return "datetime";
      case "Boolean":
        return "Boolean";
      default:
        return "Unknown";
    }
  }
}

export class MockType {
  name: string;
  type: string;
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
  default?: string;

  constructor(name: string, type: string) {
    this.name = name;
    this.type = type;
    makeAutoObservable(this);
  }
}
