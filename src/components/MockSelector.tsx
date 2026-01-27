import React from "react";
import { observer } from "mobx-react";
import { Combobox, Option } from "@fluentui/react-components";
import { ConfigColumn, MockType } from "../model/Config";

interface MockTypeSelectorProps {
  column: ConfigColumn;
  mockTypes: MockType[];
  onUpdate: (column: ConfigColumn) => void;
}

export const MockTypeSelector = observer((props: MockTypeSelectorProps): React.JSX.Element => {
  const { column, mockTypes, onUpdate } = props;

  return (
    <div style={{ verticalAlign: "top" }}>
      <Combobox
        disabled={!column.include}
        size="small"
        placeholder="Select mock type"
        value={column.selectedMock?.name || ""}
        onOptionSelect={(_e, data) => {
          const selected = mockTypes.find((mt) => mt.name === data.optionValue);
          if (selected) {
            column.selectedMock = selected;
            onUpdate(column);
          }
        }}
      >
        {mockTypes
          .filter((mt) => mt.type.includes(column.mockMatch))
          .map((mt) => (
            <Option key={mt.name} value={mt.name}>
              {mt.name}
            </Option>
          ))}
      </Combobox>
    </div>
  );
});
