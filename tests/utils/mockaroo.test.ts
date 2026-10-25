import { afterEach, describe, expect, it, vi } from "vitest";
import { mockarooService } from "../../src/utils/mockaroo";
import { clearToolboxApi } from "../testHelpers";

describe("Mockaroo service", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    clearToolboxApi();
  });

  it("sends the key and schema to the declared endpoint and returns generated rows", async () => {
    const rows = [{ name: "Example" }];
    const fetchMock = vi.fn(async (_request: Request) => ({
      ok: true,
      statusText: "OK",
      json: async () => rows,
    }));
    vi.stubGlobal("fetch", fetchMock);
    const onLog = vi.fn();
    const service = new mockarooService({ onLog });

    await expect(service.getMockData(1, '[{"name":"name"}]', "key value")).resolves.toEqual(rows);

    const request = fetchMock.mock.calls[0][0];
    expect(request.url).toBe("https://api.mockaroo.com/api/generate.json?key=key%20value&count=1");
    expect(request.method).toBe("POST");
    expect(await request.text()).toBe('[{"name":"name"}]');
    expect(onLog.mock.calls.some(([message]) => message.includes("key value"))).toBe(false);
    expect(onLog.mock.calls.some(([message]) => message.includes('"name":"name"'))).toBe(false);
  });

  it("rejects an out-of-range count without making a network request", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const service = new mockarooService({ onLog: vi.fn() });

    await expect(service.getMockData(1001, "[]", "key")).rejects.toThrow("between 1 and 1000");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("surfaces HTTP failures and rejects malformed successful responses", async () => {
    const onLog = vi.fn();
    const service = new mockarooService({ onLog });
    vi.stubGlobal(
      "fetch",
      vi.fn()
        .mockResolvedValueOnce({ ok: false, statusText: "Unauthorized" })
        .mockResolvedValueOnce({ ok: true, statusText: "OK", json: async () => ({ error: "not an array" }) }),
    );

    await expect(service.getMockData(1, "[]", "key")).rejects.toThrow("Unauthorized");
    expect(onLog).toHaveBeenCalledWith("Error fetching mock data: Unauthorized", "error");
    await expect(service.getMockData(1, "[]", "key")).rejects.toThrow("invalid data response");
  });
});
