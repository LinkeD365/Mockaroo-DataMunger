import { afterEach, describe, expect, it, vi } from "vitest";
import { ConfigColumn, MockType } from "../../src/model/Config";
import { Table } from "../../src/model/viewModel";
import { clearToolboxApi, setToolboxApi } from "../testHelpers";
import { DataverseBatchError } from "../../src/utils/bulkOperations";
import { dvService } from "../../src/utils/dataverse";

const connection: ToolBoxAPI.DataverseConnection = {
  id: "connection-1",
  name: "Development",
  url: "https://example.crm.dynamics.com",
  environment: "Dev",
  createdAt: "2026-01-01",
};

function createService(overrides: Record<string, unknown> = {}) {
  const getAllEntitiesMetadata = vi.fn().mockResolvedValue({
    value: [
      {
        LogicalName: "zebra",
        MetadataId: "z",
        DisplayName: { UserLocalizedLabel: { Label: "Zebra" } },
        EntitySetName: "zebras",
        PrimaryNameAttribute: "name",
        PrimaryIdAttribute: "zebraid",
      },
      {
        LogicalName: "account",
        MetadataId: "a",
        DisplayName: { UserLocalizedLabel: { Label: "Account" } },
        EntitySetName: "accounts",
        PrimaryNameAttribute: "name",
        PrimaryIdAttribute: "accountid",
      },
    ],
  });
  const getEntityRelatedMetadata = vi.fn().mockResolvedValue({
    value: [
      {
        LogicalName: "name",
        MetadataId: "name-id",
        AttributeType: "String",
        DisplayName: { UserLocalizedLabel: { Label: "Name" } },
      },
      {
        LogicalName: "legacy",
        MetadataId: "legacy-id",
        AttributeType: "String",
        DisplayName: { UserLocalizedLabel: { Label: "Deprecated field" } },
      },
      {
        LogicalName: "ownerid",
        MetadataId: "owner-id",
        AttributeType: "Owner",
        DisplayName: { UserLocalizedLabel: { Label: "Owner" } },
      },
    ],
  });
  const createMultiple = vi.fn(
    async (_logicalName: string, records: Record<string, unknown>[]) => records.map((_, index) => `id-${index}`),
  );
  const queryData = vi.fn();
  const api = {
    getAllEntitiesMetadata,
    getEntityRelatedMetadata,
    createMultiple,
    queryData,
    ...overrides,
  } as unknown as DataverseAPI.API;
  const onLog = vi.fn();
  const service = new dvService({ connection, dvApi: api, onLog });

  return { service, api, onLog, getAllEntitiesMetadata, getEntityRelatedMetadata, createMultiple, queryData };
}

afterEach(clearToolboxApi);

describe("Dataverse metadata service", () => {
  it("loads and sorts tables using localized labels", async () => {
    const { service, getAllEntitiesMetadata } = createService();

    const tables = await service.loadTables();

    expect(tables.map((table) => table.label)).toEqual(["Account", "Zebra"]);
    expect(getAllEntitiesMetadata).toHaveBeenCalledWith([
      "MetadataId",
      "LogicalName",
      "DisplayName",
      "EntitySetName",
      "PrimaryNameAttribute",
      "PrimaryIdAttribute",
    ]);
  });

  it("filters unsupported and deprecated columns when loading a table config", async () => {
    const { service } = createService();
    const target = new Table("account", "a", "Account", "accounts", "name", "accountid");

    const config = await service.loadConfig(target);

    expect(config.fields?.map((field) => field.logicalName)).toEqual(["name"]);
    expect(config.table.logical).toBe("account");
  });

  it("requires a connection before metadata access", async () => {
    const { api, onLog } = createService();
    const service = new dvService({ connection: null, dvApi: api, onLog });

    await expect(service.loadTables()).rejects.toThrow("No connection available");
    expect(onLog).toHaveBeenCalledWith("No connection available", "error");
  });

  it("maps picklist and lookup values into Dataverse create payloads without mutating preview rows", async () => {
    const activeConnection = vi.fn().mockResolvedValue(connection);
    setToolboxApi({ connections: { getActiveConnection: activeConnection } });
    const { service, createMultiple } = createService();
    const picklist = new ConfigColumn("industrycode", "industry-id", "Picklist", "Industry");
    picklist.selectedMock = new MockType("Industry", "picklist");
    const lookup = new ConfigColumn("primarycontactid", "contact-id", "Lookup", "Primary Contact");
    lookup.selectedMock = new MockType("Contact", "lookup");
    lookup.parentTable = new Table("contact", "contact-id", "Contact", "contacts", "fullname", "contactid");
    const row: Record<string, unknown> = {
      "@odata.type": "Microsoft.Dynamics.CRM.account",
      industrycode_value: 7,
      primarycontactid_value: "contact-guid",
      primarycontactid: "John Doe",
    };

    const result = await service.createData(
      new Table("account", "a", "Account", "accounts", "name", "accountid"),
      [picklist, lookup],
      [row],
    );

    expect(result.createdIds).toEqual(["id-0"]);
    expect(createMultiple).toHaveBeenCalledWith("account", [
      {
        "@odata.type": "Microsoft.Dynamics.CRM.account",
        industrycode: 7,
        "primarycontactid@odata.bind": "/contacts(contact-guid)",
      },
    ]);
    expect(row).toHaveProperty("industrycode_value", 7);
    expect(row).toHaveProperty("primarycontactid", "John Doe");
  });

  it("refuses to write if the active connection changed after review", async () => {
    setToolboxApi({
      connections: {
        getActiveConnection: vi.fn().mockResolvedValue({ ...connection, id: "other-connection" }),
      },
    });
    const { service, createMultiple } = createService();
    const field = new ConfigColumn("name", "name-id", "String", "Name");
    field.include = true;

    await expect(
      service.createData(
        new Table("account", "a", "Account", "accounts", "name", "accountid"),
        [field],
        [{ name: "generated" }],
      ),
    ).rejects.toThrow("active Dataverse connection changed");
    expect(createMultiple).not.toHaveBeenCalled();
  });

  it("enforces the write cap and reports partial batch success", async () => {
    setToolboxApi({ connections: { getActiveConnection: vi.fn().mockResolvedValue(connection) } });
    const { service, createMultiple } = createService();
    const field = new ConfigColumn("name", "name-id", "String", "Name");
    field.include = true;
    const table = new Table("account", "a", "Account", "accounts", "name", "accountid");
    const tooMany = Array.from({ length: 1001 }, () => ({ name: "generated" }));

    await expect(service.createData(table, [field], tooMany)).rejects.toThrow("between 1 and 1000");
    expect(createMultiple).not.toHaveBeenCalled();

    createMultiple
      .mockImplementationOnce(async (_logicalName, batch) => batch.map((_, index) => `first-${index}`))
      .mockImplementationOnce(async (_logicalName, batch) => batch.map((_, index) => `second-${index}`))
      .mockRejectedValueOnce(new Error("batch failed"));
    const records = Array.from({ length: 250 }, (_, index) => ({ name: `generated-${index}` }));

    await expect(service.createData(table, [field], records)).rejects.toMatchObject({
      name: "DataverseBatchError",
      createdCount: 200,
      failedBatchCount: 1,
    } satisfies Partial<DataverseBatchError>);
  });

  it("maps picklist, boolean, lookup, and lookup-target metadata", async () => {
    const { service, queryData } = createService();
    queryData
      .mockResolvedValueOnce({
        OptionSet: {
          Options: [{ Label: { UserLocalizedLabel: { Label: "Services" } }, Value: 7 }],
        },
      })
      .mockResolvedValueOnce({
        OptionSet: {
          FalseOption: { Label: { UserLocalizedLabel: { Label: "No" } }, Value: 0 },
          TrueOption: { Label: { UserLocalizedLabel: { Label: "Yes" } }, Value: 1 },
        },
      })
      .mockResolvedValueOnce({ value: [{ name: "Jane", contactid: "contact-id" }] })
      .mockResolvedValueOnce({ Targets: ["contact"] });

    await expect(service.getChoiceValues("account", "industrycode")).resolves.toEqual([
      { label: "Services", value: "7" },
    ]);
    await expect(service.getBooleanValues("account", "donotemail")).resolves.toEqual([
      { label: "No", value: "0" },
      { label: "Yes", value: "1" },
    ]);
    await expect(service.getLookupValues("contacts", "name", "contactid", "O'Neil")).resolves.toEqual([
      { label: "Jane", value: "contact-id" },
    ]);
    await expect(service.getTableInfo("account", "primarycontactid")).resolves.toBe("contact");
    expect(queryData).toHaveBeenNthCalledWith(
      3,
      "contacts?$filter=contains(name,'O''Neil')&$select=name,contactid&$top=20",
    );
  });
});
