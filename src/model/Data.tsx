import { makeAutoObservable } from "mobx";
import { ConfigField } from "./Config";

export class DataRow {
  field: ConfigField;
  value: any;

  constructor(field: ConfigField, value: any) {
    this.field = field;
    this.value = value;
    makeAutoObservable;
  }
}
