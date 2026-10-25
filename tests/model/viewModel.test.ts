import { describe, expect, it } from "vitest";
import { isObservableProp } from "mobx";
import { Table, ViewModel } from "../../src/model/viewModel";

describe("ViewModel", () => {
  it("starts with safe generation defaults and observable state", () => {
    const viewModel = new ViewModel();

    expect(viewModel.rowCount).toBe(10);
    expect(viewModel.mockarooApiKey).toBe("");
    expect(viewModel.tables).toEqual([]);
    expect(isObservableProp(viewModel, "rowCount")).toBe(true);
  });

  it("keeps table metadata used by table selection and requests", () => {
    const table = new Table("contact", "metadata-id", "Contact", "contacts", "fullname", "contactid");

    expect(table).toMatchObject({
      logical: "contact",
      id: "metadata-id",
      label: "Contact",
      setName: "contacts",
      primaryNameColumn: "fullname",
      primaryIdColumn: "contactid",
    });
  });
});
