import { makeAutoObservable } from "mobx";
import { MockType } from "./Config";

export class ViewModel {
  tables: Table[] = [];
  selectedTableName?: string;
  MockTypes: MockType[] = [];
  // Define your observable properties here
  constructor() {
    makeAutoObservable(this);
  }
}

export class Table {
  logical: string;
  id: string;
  label: string;

  constructor(logical: string, id: string, label: string) {
    this.logical = logical;
    this.id = id;
    this.label = label;
    makeAutoObservable(this);
  }
}
