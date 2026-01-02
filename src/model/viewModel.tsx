import { makeAutoObservable } from "mobx";
import { Config, MockType } from "./Config";
import { DataRow } from "./Data";

export class ViewModel {
  tables: Table[] = [];
  selectedTableName?: string;
  mockTypes: MockType[] = [];
  config?: Config;
  data?: any[];
  dataRows?: DataRow[];
  rowCount: number = 100;
  // Define your observable properties here
  constructor() {
    makeAutoObservable(this);
  }
}

export class Table {
  logical: string;
  id: string;
  label: string;
  setName?: string;

  constructor(logical: string, id: string, label: string) {
    this.logical = logical;
    this.id = id;
    this.label = label;
    makeAutoObservable(this);
  }
}
