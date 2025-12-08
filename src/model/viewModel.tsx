import { makeAutoObservable } from "mobx";

export class ViewModel {
  tables: Table[] = [];
  // Define your observable properties here
  constructor() {
    makeAutoObservable(this);
  }
}

export class Table {
  name: string;
  id: string;
  label: string;

  constructor(name: string, id: string, label: string) {
    this.name = name;
    this.id = id;
    this.label = label;
    makeAutoObservable(this);
  }
}
