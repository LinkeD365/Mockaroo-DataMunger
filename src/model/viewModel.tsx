import { makeAutoObservable } from "mobx";
import { Config, MockType } from "./Config";
import { DataRow } from "./Data";

export class ViewModel {
  tables: Table[] = [];
  selectedTable?: Table;
  mockTypes: MockType[] = [];
  config?: Config;
  data?: any[];
  dataRows?: DataRow[];
  rowCount: number = 10;
  mockarooApiKey: string = "";
  // Define your observable properties here
  constructor() {
    makeAutoObservable(this);
  }
}

export class Table {
  logical: string;
  id: string;
  label: string;
  setName: string;
  primaryNameColumn: string;
  primaryIdColumn: string;

  constructor(
    logical: string,
    id: string,
    label: string,
    setName: string,
    primaryNameColumn: string,
    primaryIdColumn: string,
  ) {
    this.logical = logical;
    this.id = id;
    this.label = label;
    this.setName = setName;
    this.primaryNameColumn = primaryNameColumn;
    this.primaryIdColumn = primaryIdColumn;
    makeAutoObservable(this);
  }
}
