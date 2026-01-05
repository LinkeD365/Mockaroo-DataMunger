import React from "react";
import { observer } from "mobx-react";
import { Combobox, Option } from "@fluentui/react-components";
import { ConfigField, MockType } from "../model/Config";

interface MockTypeSelectorProps {
  field: ConfigField;
  mockTypes: MockType[];
  onUpdate: (field: ConfigField) => void;
}

export const MockTypeSelector = observer((props: MockTypeSelectorProps): React.JSX.Element => {
  const { field, mockTypes, onUpdate } = props;

  return (
    <div style={{ verticalAlign: "top" }}>
      <Combobox
        disabled={!field.include}
        size="small"
        placeholder="Select mock type"
        value={field.selectedMock?.name || ""}
        onOptionSelect={(_e, data) => {
          const selected = mockTypes.find((mt) => mt.name === data.optionValue);
          if (selected) {
            field.selectedMock = selected;
            onUpdate(field);
          }
        }}
      >
        {mockTypes
          .filter((mt) => mt.type.includes(field.mockMatch))
          .map((mt) => (
            <Option key={mt.name} value={mt.name}>
              {mt.name}
            </Option>
          ))}
      </Combobox>
    </div>
  );
});
