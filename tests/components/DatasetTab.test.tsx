import { FluentProvider, webDarkTheme, webLightTheme } from "@fluentui/react-components";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DatasetTab } from "../../src/components/DatasetTab";
import { SAVED_CONFIGS_KEY, SAVED_DATASETS_KEY } from "../../src/model/savedConfig";
import { ViewModel } from "../../src/model/viewModel";
import { clearToolboxApi, setToolboxApi } from "../testHelpers";

afterEach(() => {
  cleanup();
  clearToolboxApi();
});

describe("DatasetTab theme styles", () => {
  it.each([
    ["light", webLightTheme],
    ["dark", webDarkTheme],
  ] as const)("renders saved configs with readable Fluent %s theme colors", async (_name, theme) => {
    setToolboxApi({
      settings: {
        get: vi.fn(async (key: string) => {
          if (key === SAVED_CONFIGS_KEY) {
            return {
              "Test Config": {
                version: 1,
                tableLogical: "account",
                tableLabel: "Account",
                rowCount: 10,
                fields: [],
              },
            };
          }
          if (key === SAVED_DATASETS_KEY) return {};
          return undefined;
        }),
      },
    });

    render(
      <FluentProvider theme={theme}>
        <DatasetTab
          viewModel={new ViewModel()}
          onLog={vi.fn()}
          onReviewDataset={vi.fn().mockResolvedValue(undefined)}
          runningDataset={false}
        />
      </FluentProvider>,
    );

    const saveButton = screen.getByRole("button", { name: "Save Dataset" });
    expect(saveButton.querySelector("svg")).not.toBeNull();

    const configLabel = await screen.findByText("Test Config");
    await waitFor(() => expect(screen.getByText("Account [account] - 10 rows")).toBeTruthy());
    const configItem = configLabel.closest("[draggable='true']");
    if (!configItem) {
      throw new Error("Saved configuration was not rendered as a draggable list item.");
    }

    const backgroundColor = getComputedStyle(configItem).backgroundColor;
    const foregroundColor = getComputedStyle(configItem).color;
    expect(backgroundColor).not.toBe("rgb(31, 31, 31)");
    expect(backgroundColor).not.toBe("rgba(0, 0, 0, 0)");
    expect(foregroundColor).not.toBe("rgb(0, 0, 0)");
  });
});
