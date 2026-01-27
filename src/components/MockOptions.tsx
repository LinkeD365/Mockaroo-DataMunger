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
  onLog: (message: string, type?: "info" | "success" | "warning" | "error") => void;
}

export const MockOptionsSelector = observer((props: MockOptionsSelectorProps): React.JSX.Element => {
  const { dvSvc, column, vm, utils, onUpdate, onLog } = props;
  const [openConfig, setOpenConfig] = React.useState(false);

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
        onLog={onLog}
      />
      <Button
        onClick={() => setOpenConfig(true)}
        icon={<SettingsFilled />}
        disabled={
          !column.selectedMock ||
          // Disable if: not picklist/lookup AND (no parameters OR (boolean without fixed value))
          (column.selectedMock.type !== "picklist" &&
            column.selectedMock.type !== "lookup" &&
            (!column.selectedMock.parameters || column.selectedMock.parameters.length === 0) &&
            !(column.selectedMock.type === "boolean" && column.selectedMock.fixed))
        }
        size="small"
        style={{ marginLeft: "8px" }}
      />
      <span>{column.selectedValues.map((item) => item.label).join(", ")}</span>
    </div>
  );
});
