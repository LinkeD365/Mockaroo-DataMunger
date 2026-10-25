import React from "react";
import { observer } from "mobx-react";
import { Button } from "@fluentui/react-components";
import { ConfigColumn } from "../model/Config";
import { SettingsFilled } from "@fluentui/react-icons";
import { dvService } from "../utils/dataverse";
import { ViewModel } from "../model/viewModel";
import { ConfigDialog } from "./ConfigDialog";
import { UtilLib } from "../utils/utils";

// Only Once in your app you can set whether to enable hooks tracking or not.
// In CRA(create-react-app) e.g. this can be done in src/index.js

interface MockOptionsSelectorProps {
  dvSvc: dvService;
  column: ConfigColumn;
  vm: ViewModel;
  utils: UtilLib;
  onUpdate: (column: ConfigColumn) => void;
}

export const MockOptionsSelector = observer((props: MockOptionsSelectorProps): React.JSX.Element => {
  const { dvSvc, column, vm, utils, onUpdate } = props;
  const [openConfig, setOpenConfig] = React.useState(false);

  const isFixedStringMock =
    Boolean(column.selectedMock?.fixed) &&
    column.mockMatch === "string" &&
    Boolean(column.selectedMock?.type?.includes("string"));

  React.useEffect(() => {
    if (
      (!column.include || !column.selectedMock) &&
      (column.selectedValues.length > 0 || column.fixedValue !== undefined)
    ) {
      column.selectedValues = [];
      column.fixedValue = undefined;
      onUpdate(column);
    }
  }, [column, column.include, column.selectedMock, column.selectedValues.length, column.fixedValue, onUpdate]);

  const selectedValueText =
    column.include && column.selectedMock && column.selectedValues.length > 0
      ? column.selectedValues.map((item) => item.label).join(", ")
      : column.include && column.selectedMock?.type === "boolean" && column.fixedValue !== undefined
        ? String(column.fixedValue)
        : column.include && isFixedStringMock && column.fixedValue !== undefined
          ? String(column.fixedValue)
          : "";

  return (
    <div style={{ verticalAlign: "top" }}>
      <ConfigDialog
        dvSvc={dvSvc}
        vm={vm}
        utils={utils}
        openConfig={openConfig}
        closeConfig={() => setOpenConfig(false)}
        column={column}
        onUpdate={onUpdate}
      />
      <Button
        onClick={() => setOpenConfig(true)}
        icon={<SettingsFilled />}
        disabled={
          !column.include ||
          !column.selectedMock ||
          // Disable if: not picklist/lookup AND (no parameters OR (boolean without fixed value))
          (column.selectedMock.type !== "picklist" &&
            column.selectedMock.type !== "lookup" &&
            (!column.selectedMock.parameters || column.selectedMock.parameters.length === 0) &&
            !(column.selectedMock.type === "boolean" && column.selectedMock.fixed) &&
            !isFixedStringMock)
        }
        size="small"
        style={{ marginLeft: "8px" }}
      />
      <span>{selectedValueText}</span>
    </div>
  );
});
