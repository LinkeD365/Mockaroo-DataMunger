import { makeAutoObservable } from "mobx";
import { ConfigColumn } from "./Config";

export class DataRow {
  field: ConfigColumn;
  value: any;

  constructor(field: ConfigColumn, value: any) {
    this.field = field;
    this.value = value;
    makeAutoObservable(this);
  }
}
