import { describe, expect, it } from "vitest";
import { createDatasetPlan, assertDatasetPlanUnchanged } from "../../src/model/datasetPreview";
import { SavedConfigStore } from "../../src/model/savedConfig";
import { Table } from "../../src/model/viewModel";

const accountTable = new Table("account", "account-id", "Account", "accounts", "name", "accountid");
const config = {
  version: 1,
  tableLogical: "account",
  tableLabel: "Account",
  rowCount: 25,
  fields: [],
};

describe("dataset review plans", () => {
  it("lists table scopes and counts and preserves missing-step warnings", () => {
    const configs: SavedConfigStore = { Accounts: config };
    const plan = createDatasetPlan(
      "Seed",
      { version: 1, configNames: ["Accounts", "Missing"] },
      configs,
      [accountTable],
    );

    expect(plan.items).toEqual([
      {
        configName: "Accounts",
        configSignature: JSON.stringify(config),
        tableLogical: "account",
        tableLabel: "Account",
        recordCount: 25,
      },
    ]);
    expect(plan.warnings).toEqual(["Config 'Missing' not found; it will be skipped."]);
  });

  it("rejects plans with no runnable configurations or an invalid count", () => {
    expect(() => createDatasetPlan("Empty", { version: 1, configNames: [] }, {}, [accountTable])).toThrow(
      "was not found or is empty",
    );
    expect(() =>
      createDatasetPlan(
        "Invalid",
        { version: 1, configNames: ["Accounts"] },
        { Accounts: { ...config, rowCount: 1001 } },
        [accountTable],
      ),
    ).toThrow("Record count must be a whole number");
  });

  it("rejects a changed dataset or configuration after review", () => {
    const configs: SavedConfigStore = { Accounts: config };
    const plan = createDatasetPlan("Seed", { version: 1, configNames: ["Accounts"] }, configs, [accountTable]);

    expect(() =>
      assertDatasetPlanUnchanged(plan, { version: 1, configNames: ["Accounts", "Contacts"] }, configs),
    ).toThrow("dataset changed");
    expect(() =>
      assertDatasetPlanUnchanged(plan, { version: 1, configNames: ["Accounts"] }, { Accounts: { ...config, rowCount: 5 } }),
    ).toThrow("changed after review");
    expect(() => assertDatasetPlanUnchanged(plan, { version: 1, configNames: ["Accounts"] }, configs)).not.toThrow();
  });
});
