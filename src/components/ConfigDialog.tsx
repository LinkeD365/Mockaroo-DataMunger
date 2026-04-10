import React from "react";

import { observer } from "mobx-react";
import { ViewModel } from "../model/viewModel";
import { dvService } from "../utils/dataverse";
import {
  Dialog,
  DialogSurface,
  DialogBody,
  DialogTitle,
  DialogContent,
  Checkbox,
  Field,
  Input,
  DialogActions,
  Button,
  SelectionItemId,
  List,
  ListItem,
} from "@fluentui/react-components";
import { ConfigColumn, SelectionValue } from "../model/Config";
import { LookupDialog } from "./LookupDialog";
import { UtilLib } from "../utils/utils";

interface ConfigDialogProps {
  dvSvc: dvService;
  vm: ViewModel;
  utils: UtilLib;
  openConfig: boolean;
  column: ConfigColumn;
  closeConfig: () => void;
  onUpdate: (field: ConfigColumn) => void;
  onLog: (message: string, type?: "info" | "success" | "warning" | "error") => void;
}
export const ConfigDialog = observer((props: ConfigDialogProps): React.JSX.Element => {
  const { dvSvc, vm, utils, onLog, openConfig, closeConfig, column, onUpdate } = props;
  const [openPrimaryDialog, setOpenPrimaryDialog] = React.useState(openConfig);
  const [paramValues, setParamValues] = React.useState<Record<string, any>>({});
  const [selectedItems, setSelectedItems] = React.useState<SelectionItemId[]>([]);
  const [selectValues, setSelectValues] = React.useState<SelectionValue[]>([]);
  const [openLookupDialog, setOpenLookupDialog] = React.useState(false);
  const [fixedValue, setFixedValue] = React.useState<any>();
  const isFixedStringMock =
    Boolean(column.selectedMock?.fixed) &&
    column.mockMatch === "string" &&
    Boolean(column.selectedMock?.type?.includes("string"));

  React.useEffect(() => {
    if (openConfig) {
      if (column.selectedMock?.type !== "lookup") setOpenPrimaryDialog(true);
      if (column.selectedMock?.type === "lookup") setOpenLookupDialog(true);
    } else {
      setOpenPrimaryDialog(false);
      setOpenLookupDialog(false);
      if (column.selectedMock?.type === "boolean" || isFixedStringMock) {
        setFixedValue(column.fixedValue);
      }
    }
  }, [openConfig, column.selectedMock?.type, column.fixedValue, isFixedStringMock]);

  React.useEffect(() => {
    const loadSelectionValues = async () => {
      if (column.selectedMock?.type === "picklist") {
        const values = await dvSvc.getChoiceValues(vm.selectedTable?.logical || "", column.logicalName);
        column.choiceValues = values;
        setSelectValues(values);
        // Initialize selected items from field.selectedValues if available
        if (column.selectedValues && column.selectedValues.length > 0) {
          setSelectedItems(column.selectedValues.map((sv) => sv.value));
        }
      } else if (column.selectedMock?.type === "boolean") {
        let values: SelectionValue[] = [];
        try {
          values = await dvSvc.getBooleanValues(vm.selectedTable?.logical || "", column.logicalName);
        } catch {
          values = [new SelectionValue("False", "false"), new SelectionValue("True", "true")];
        }

        setSelectValues(values);

        if (column.fixedValue !== undefined) {
          const selectedValue = column.fixedValue === true ? "true" : "false";
          const matchingOption = values.find((sv) => sv.value.toLowerCase() === selectedValue);
          setSelectedItems([matchingOption?.value || selectedValue]);
        } else {
          setSelectedItems([]);
        }
      }
    };
    loadSelectionValues();
  }, [column.selectedMock, dvSvc, vm.selectedTable?.logical, column.logicalName, column.fixedValue]);

  function saveParameters() {
    if (column.selectedMock && column.selectedMock.parameters) {
      // Create a new parameters array to avoid mutation of shared MockType objects
      // Shallow copy is sufficient as parameter values are primitives
      const updatedParameters = column.selectedMock.parameters.map((param: any) => ({
        ...param,
        value: paramValues[param.name] ?? param.default,
      }));
      column.selectedMock = {
        ...column.selectedMock,
        parameters: updatedParameters,
      };
    }
    // Save selected picklist values
    if (column.selectedMock?.type === "picklist") {
      column.selectedValues = selectedItems.map((itemId) => {
        const match = column.choiceValues.find((cv) => cv.value === itemId);
        return match ? match : { label: itemId.toString(), value: itemId.toString() };
      });
    }
    if (column.selectedMock?.type === "boolean") {
      const selectedItem = selectedItems[0]?.toString().toLowerCase();
      if (selectedItem !== undefined) {
        column.fixedValue = selectedItem === "true" || selectedItem === "1";

        const matchedValue = selectValues.find((sv) => sv.value.toLowerCase() === selectedItem);
        column.selectedValues = [
          matchedValue ??
            new SelectionValue(column.fixedValue ? "True" : "False", column.fixedValue ? "true" : "false"),
        ];
      } else {
        column.fixedValue = fixedValue;
        if (fixedValue !== undefined) {
          const fallback = fixedValue ? "true" : "false";
          const matchedValue = selectValues.find((sv) => sv.value.toLowerCase() === fallback);
          column.selectedValues = [
            matchedValue ?? new SelectionValue(fixedValue ? "True" : "False", fixedValue ? "true" : "false"),
          ];
        }
      }
    }
    if (isFixedStringMock) {
      const stringValue = fixedValue !== undefined && fixedValue !== null ? String(fixedValue) : "";
      column.fixedValue = stringValue;
      column.selectedValues = stringValue ? [new SelectionValue(stringValue, stringValue)] : [];
    }
    onUpdate(column);

    setOpenPrimaryDialog(false);
    closeConfig();
  }

  const pickList = (
    <List
      aria-label="Picklist Values"
      selectionMode={column.selectedMock?.fixed ? "single" : "multiselect"}
      style={{ maxHeight: "200px", overflowY: "auto" }}
      selectedItems={selectedItems}
      onSelectionChange={(_e, data) => setSelectedItems(data.selectedItems)}
    >
      {selectValues.map((value, index) => (
        <ListItem key={index} value={value.value}>
          {value.label}
        </ListItem>
      ))}
    </List>
  );

  const configDialog = (
    <Dialog open={openPrimaryDialog} onOpenChange={() => setOpenPrimaryDialog(false)}>
      <DialogSurface>
        <DialogBody>
          <DialogTitle>Configure Mock Options - {column.displayName}</DialogTitle>
          <DialogContent>
            <div>
              {Array.isArray(column.selectedMock?.parameters) &&
                column.selectedMock.parameters.map((param: any, index: number) => {
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
                      )}{" "}
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
                      {!isBoolean && !isNumber && (
                        <Field label={paramLabel}>
                          <Input
                            size="small"
                            type="text"
                            value={paramValues[paramName] ?? paramDefault ?? ""}
                            onChange={(e) => {
                              setParamValues({ ...paramValues, [paramName]: e.target.value });
                            }}
                          />
                        </Field>
                      )}
                    </div>
                  );
                })}
              {column.selectedMock?.type === "boolean" && (
                <Field label="Choose Value">
                  <List
                    aria-label="Boolean Values"
                    selectionMode="single"
                    selectedItems={selectedItems}
                    onSelectionChange={(_e, data) => setSelectedItems(data.selectedItems)}
                  >
                    {selectValues.map((value, index) => (
                      <ListItem key={index} value={value.value}>
                        {value.label}
                      </ListItem>
                    ))}
                  </List>
                </Field>
              )}
              {isFixedStringMock && (
                <Field label="Enter Fixed String" size="small">
                  <Input
                    size="small"
                    type="text"
                    value={fixedValue ?? ""}
                    onChange={(e) => setFixedValue(e.target.value)}
                  />
                </Field>
              )}
              {column.selectedMock?.type === "picklist" && <div>{pickList}</div>}
            </div>
          </DialogContent>
          <DialogActions>
            <Button appearance="primary" onClick={saveParameters}>
              Save
            </Button>
            <Button
              appearance="secondary"
              onClick={() => {
                setOpenPrimaryDialog(false);
                closeConfig();
              }}
            >
              Cancel
            </Button>
          </DialogActions>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  );
  return (
    <div>
      {configDialog}
      <LookupDialog
        dvSvc={dvSvc}
        vm={vm}
        utils={utils}
        dialogOpen={openLookupDialog}
        column={column}
        onLog={onLog}
        onDialogClose={closeConfig}
      />
    </div>
  );
});
