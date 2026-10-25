import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { clearToolboxApi, setToolboxApi } from "../testHelpers";
import { useConnection, useEventLog, useToolboxEvents } from "../../src/hooks/useToolboxAPI";

afterEach(() => {
  cleanup();
  clearToolboxApi();
});

describe("useConnection", () => {
  it("loads the active connection and clears its loading state", async () => {
    const connection = {
      id: "connection-1",
      name: "Development",
      url: "https://example.crm.dynamics.com",
      environment: "Dev",
      createdAt: "2026-01-01",
    };
    const getActiveConnection = vi.fn().mockResolvedValue(connection);
    setToolboxApi({ connections: { getActiveConnection } });

    const { result } = renderHook(() => useConnection());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.connection).toEqual(connection);
    expect(getActiveConnection).toHaveBeenCalledOnce();
  });

  it("finishes loading when the host connection lookup fails", async () => {
    const getActiveConnection = vi.fn().mockRejectedValue(new Error("host unavailable"));
    setToolboxApi({ connections: { getActiveConnection } });
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);

    const { result } = renderHook(() => useConnection());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.connection).toBeNull();
    expect(consoleError).toHaveBeenCalledOnce();
  });
});

describe("useToolboxEvents", () => {
  it("forwards host event names and payload data", () => {
    const handlers: Array<(event: unknown, payload: ToolBoxAPI.ToolBoxEventPayload) => void> = [];
    setToolboxApi({ events: { on: (handler: (event: unknown, payload: ToolBoxAPI.ToolBoxEventPayload) => void) => handlers.push(handler) } });
    const onEvent = vi.fn();

    renderHook(() => useToolboxEvents(onEvent));
    act(() => {
      handlers[0]({}, { event: "connection:updated", data: { id: "connection-1" }, timestamp: "now" });
    });

    expect(onEvent).toHaveBeenCalledWith("connection:updated", { id: "connection-1" });
  });
});

describe("useEventLog", () => {
  it("keeps only the latest 50 log entries and can clear them", () => {
    const { result } = renderHook(() => useEventLog());

    act(() => {
      for (let index = 0; index < 51; index += 1) {
        result.current.addLog(`message-${index}`);
      }
    });
    expect(result.current.logs).toHaveLength(50);
    expect(result.current.logs[0].message).toBe("message-50");
    expect(result.current.logs[49].message).toBe("message-1");

    act(() => result.current.clearLogs());
    expect(result.current.logs).toEqual([]);
  });
});
