import { describe, expect, it } from "vitest";
import { Config, ConfigColumn, MockParameter, MockType, SelectionValue } from "../../src/model/Config";
import { Table } from "../../src/model/viewModel";

function table(): Table {
  return new Table("account", "id", "Account", "accounts", "name", "accountid");
}

describe("configuration models", () => {
  it("serializes included Mockaroo fields but omits fixed fields and disabled fields", () => {
    const generated = new ConfigColumn("name", "meta-name", "String", "Name");
    generated.include = true;
    generated.percBlank = 10;
    generated.selectedMock = new MockType("Full Name", "string");
    generated.selectedMock.mockName = "Full Name";
    const parameter = new MockParameter("min", "number");
    parameter.value = "2";
    generated.selectedMock.parameters = [parameter];

    const fixed = new ConfigColumn("active", "meta-active", "Boolean", "Active");
    fixed.include = true;
    fixed.selectedMock = new MockType("Always true", "boolean");
    fixed.selectedMock.fixed = true;

    const disabled = new ConfigColumn("description", "meta-description", "Memo", "Description");
    disabled.selectedMock = new MockType("Paragraph", "string");

    const config = new Config(table(), [generated, fixed, disabled]);
    expect(JSON.parse(config.jsonString)).toEqual([
      { name: "name", type: "Full Name", percentBlank: 10, min: "2" },
    ]);
  });

  it("maps Dataverse types and lookup binding names", () => {
    const lookup = new ConfigColumn("primarycontactid", "meta", "Lookup", "Primary Contact");
    const picklist = new ConfigColumn("industrycode", "meta", "Picklist", "Industry");

    expect(lookup.dbField).toBe("primarycontactid@odata.bind");
    expect(lookup.mockMatch).toBe("lookup");
    expect(picklist.dbField).toBe("industrycode");
    expect(picklist.mockMatch).toBe("picklist");
  });

  it("serializes selected picklist values for generated fields", () => {
    const field = new ConfigColumn("industrycode", "meta", "Picklist", "Industry");
    field.include = true;
    field.selectedMock = new MockType("Industry", "picklist");
    field.selectedValues = [new SelectionValue("Services", "7")];

    expect(JSON.parse(new Config(table(), [field]).jsonString)).toEqual([
      { name: "industrycode", type: "Industry", percentBlank: 0, values: ["7"], selectionStyle: "random" },
    ]);
  });
});
