import { describe, expect, it } from "vitest";
import { isObservableProp } from "mobx";
import { ConfigColumn } from "../../src/model/Config";
import { DataRow } from "../../src/model/Data";

describe("DataRow", () => {
  it("keeps field and generated value observable", () => {
    const field = new ConfigColumn("name", "name-id", "String", "Name");
    const row = new DataRow(field, "Example");

    expect(row.field).toBe(field);
    expect(row.value).toBe("Example");
    expect(isObservableProp(row, "value")).toBe(true);
  });
});
