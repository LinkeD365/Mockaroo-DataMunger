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
  const [mockFilter, setMockFilter] = React.useState<string>(column.selectedMock?.name || "");

  React.useEffect(() => {
    setMockFilter(column.selectedMock?.name || "");
  }, [column.selectedMock?.name]);

  const filteredMockTypes = mockTypes
    .filter((mt) => mt.type.includes(column.mockMatch) && mt.name.toLowerCase().includes(mockFilter.toLowerCase()))
    .sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div style={{ verticalAlign: "top" }}>
      <Combobox
        disabled={!column.include}
        clearable
        size="small"
        placeholder="Select mock type"
        selectedOptions={column.selectedMock ? [column.selectedMock.name] : []}
        value={mockFilter}
        onChange={(e) => setMockFilter(e.target.value)}
        onOptionSelect={(_e, data) => {
          if (!data.optionValue) {
            column.selectedMock = undefined;
            column.selectedValues = [];
            column.fixedValue = undefined;
            setMockFilter("");
            onUpdate(column);
            return;
          }

          const selected = mockTypes.find((mt) => mt.name === data.optionValue);
          if (selected) {
            const previousMockName = column.selectedMock?.name;
            column.selectedMock = selected;
            if (previousMockName !== selected.name) {
              column.selectedValues = [];
              column.fixedValue = undefined;
            }
            setMockFilter(selected.name);
            onUpdate(column);
          }
        }}
      >
        {filteredMockTypes.map((mt) => (
          <Option key={mt.name} value={mt.name} text={mt.name}>
            {mt.name}
          </Option>
        ))}
      </Combobox>
    </div>
  );
});
