import { FluentProvider, webLightTheme } from "@fluentui/react-components";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { DatasetCreationHeader, DatasetCreationWarning } from "../../src/components/MockarooMain";

class TestResizeObserver implements ResizeObserver {
  constructor(_callback: ResizeObserverCallback) {}

  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}

beforeEach(() => {
  window.ResizeObserver = TestResizeObserver;
});

afterEach(cleanup);

describe("dataset creation review header", () => {
  it("shows the combined record total at the right of the title with matching text size", () => {
    render(
      <FluentProvider theme={webLightTheme}>
        <DatasetCreationHeader
          items={[
            { configName: "Accounts", tableLabel: "Account", tableLogical: "account", recordCount: 10 },
            { configName: "Contacts", tableLabel: "Contact", tableLogical: "contact", recordCount: 25 },
          ]}
        />
      </FluentProvider>,
    );

    const title = screen.getByText("Review Dataset Creation");
    const total = screen.getByText("Total: 35 record(s)");
    expect(title.parentElement).toBe(total.parentElement);
    if (!title.parentElement) {
      throw new Error("The review title must be inside a header.");
    }
    expect(getComputedStyle(title.parentElement).display).toBe("flex");
    expect(getComputedStyle(total).marginLeft).toBe("auto");
    expect(getComputedStyle(total).textAlign).toBe("right");
    expect(getComputedStyle(total).fontSize).toBe(getComputedStyle(title).fontSize);
  });
});

describe("dataset creation review warning", () => {
  it("shows rollback and skipped-step warnings in a warning message bar", () => {
    render(
      <FluentProvider theme={webLightTheme}>
        <DatasetCreationWarning warnings={["A saved config is no longer available."]} />
      </FluentProvider>,
    );

    expect(screen.getByText(/cannot be automatically rolled back/i)).toBeTruthy();
    expect(screen.getByText("Some saved steps will be skipped:")).toBeTruthy();
    expect(screen.getByText("A saved config is no longer available.")).toBeTruthy();
    expect(screen.getByRole("group")).toBeTruthy();
  });

  it("omits the skipped-step notice when there are no warnings", () => {
    render(
      <FluentProvider theme={webLightTheme}>
        <DatasetCreationWarning warnings={[]} />
      </FluentProvider>,
    );

    expect(screen.getByText(/cannot be automatically rolled back/i)).toBeTruthy();
    expect(screen.queryByText("Some saved steps will be skipped:")).toBeNull();
  });
});
