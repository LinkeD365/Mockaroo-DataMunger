import React from "react";
import { observer } from "mobx-react";
import {
  Button,
  Dialog,
  DialogActions,
  DialogBody,
  DialogContent,
  DialogSurface,
  DialogTitle,
  Field,
  Input,
  Checkbox,
  List,
  ListItem,
  SelectionItemId,
} from "@fluentui/react-components";
import { ConfigField } from "../model/Config";
import { SettingsFilled } from "@fluentui/react-icons";
import { dvService } from "../utils/dataverse";
import { ViewModel } from "../model/viewModel";

// Only Once in your app you can set whether to enable hooks tracking or not.
// In CRA(create-react-app) e.g. this can be done in src/index.js

interface MockOptionsSelectorProps {
  dvSvc: dvService;
  field: ConfigField;
  vm: ViewModel;
  onUpdate: (field: ConfigField) => void;
}

export const MockOptionsSelector = observer((props: MockOptionsSelectorProps): React.JSX.Element => {
  const { dvSvc, field, vm, onUpdate } = props;
  const [openConfig, setOpenConfig] = React.useState(false);
  const [paramValues, setParamValues] = React.useState<Record<string, any>>({});
  const [picklistValues, setPicklistValues] = React.useState<string[]>([]);
  const [selectedItems, setSelectedItems] = React.useState<SelectionItemId[]>([]);

  React.useEffect(() => {
    const loadPicklistValues = async () => {
      if (field.selectedMock?.type === "picklist") {
        const values = await dvSvc.getChoiceValues(vm.selectedTable?.logical || "", field.logicalName);
        field.choiceValues = values;
        setPicklistValues(values.map((cv) => cv.label));
        // Initialize selected items from field.selectedValues if available
        if (field.selectedValues && field.selectedValues.length > 0) {
          setSelectedItems(field.selectedValues);
        }
      }
    };
    loadPicklistValues();
  }, [field.selectedMock, dvSvc, vm.selectedTable?.logical, field.logicalName]);

  function saveParameters() {
    if (field.selectedMock && field.selectedMock.parameters) {
      field.selectedMock.parameters = field.selectedMock.parameters.map((param: any) => ({
        ...param,
        value: paramValues[param.name] ?? param.default,
      }));
    }
    // Save selected picklist values
    if (field.selectedMock?.type === "picklist") {
      field.selectedValues = selectedItems as string[];
    }
    onUpdate(field);

    setOpenConfig(false);
  }

  const pickList = (
    <List
      aria-label="Picklist Values"
      selectionMode={field.selectedMock?.fixed ? "single" : "multiselect"}
      style={{ maxHeight: "200px", overflowY: "auto" }}
      selectedItems={selectedItems}
      onSelectionChange={(_e, data) => setSelectedItems(data.selectedItems)}
    >
      {picklistValues.map((value, index) => (
        <ListItem key={index} value={value}>
          {value}
        </ListItem>
      ))}
    </List>
  );

  const configDialog = (
    <Dialog open={openConfig} onOpenChange={(_e, data) => setOpenConfig(data.open)}>
      <DialogSurface>
        <DialogBody>
          <DialogTitle>Configure Mock Options - {field.displayName}</DialogTitle>
          <DialogContent>
            <div>
              {Array.isArray(field.selectedMock?.parameters) &&
                field.selectedMock.parameters.map((param: any, index: number) => {
                  const paramName = param?.name ?? `param_${index}`;
                  const paramLabel = param?.description || param?.name || paramName;
                  const paramType = param?.type;
                  const paramDefault = param?.default;

                  // Determine input type based on parameter type
                  const isBoolean = paramType === "boolean";
                  const isNumber = paramType === "number" || paramType === "integer" || paramType === "decimal";

                  return (
                    <div key={paramName} style={{ marginBottom: "12px" }}>
                      {isBoolean && (
                        <Checkbox
                          label={paramLabel}
                          checked={paramValues[paramName] ?? paramDefault ?? false}
                          onChange={(_, data) => {
                            setParamValues({ ...paramValues, [paramName]: data.checked });
                          }}
                        />
                      )}
                      {isNumber && (
                        <Field label={paramLabel} size="small">
                          <Input
                            size="small"
                            type={isNumber ? "number" : "text"}
                            value={paramValues[paramName] ?? paramDefault ?? ""}
                            onChange={(e) => {
                              let value: any = e.target.value;
                              if (isNumber) {
                                const numValue = parseFloat(e.target.value);
                                value = isNaN(numValue) ? 0 : numValue;
                              }
                              setParamValues({ ...paramValues, [paramName]: value });
                            }}
                          />
                        </Field>
                      )}
                    </div>
                  );
                })}
              {field.selectedMock?.type === "picklist" && (
                <div>
                  {pickList}
                  {field.selectedValues.join(", ")}{" "}
                </div>
              )}
            </div>
          </DialogContent>
          <DialogActions>
            <Button appearance="primary" onClick={saveParameters}>
              Save
            </Button>
            <Button appearance="secondary" onClick={() => setOpenConfig(false)}>
              Cancel
            </Button>
          </DialogActions>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  );
  return (
    <div style={{ verticalAlign: "top" }}>
      {configDialog}
      <Button
        onClick={() => setOpenConfig(true)}
        icon={<SettingsFilled />}
        disabled={
          !field.selectedMock ||
          (field.selectedMock.type !== "picklist" &&
            (!field.selectedMock.parameters || field.selectedMock.parameters.length === 0))
        }
        size="small"
        style={{ marginLeft: "8px" }}
      />
    </div>
  );
});

