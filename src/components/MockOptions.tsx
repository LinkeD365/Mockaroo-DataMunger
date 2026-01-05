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
} from "@fluentui/react-components";
import { ConfigField } from "../model/Config";
import { SettingsFilled } from "@fluentui/react-icons";

interface MockOptionsSelectorProps {
  field: ConfigField;
  onUpdate: (field: ConfigField) => void;
}

export const MockOptionsSelector = observer((props: MockOptionsSelectorProps): React.JSX.Element => {
  const { field, onUpdate } = props;
  const [openConfig, setOpenConfig] = React.useState(false);
  const [paramValues, setParamValues] = React.useState<Record<string, any>>({});

  const handleSave = () => {
    // Save parameter values to field
    if (field.selectedMock) {
      // Store parameter values in field for later use
      (field as any).mockParameters = paramValues;
      onUpdate(field);
    }
    setOpenConfig(false);
  };

  const configDialog = (
    <Dialog open={openConfig} onOpenChange={(_e, data) => setOpenConfig(data.open)}>
      <DialogSurface>
        <DialogBody>
          <DialogTitle>Configure Mock Options</DialogTitle>
          <DialogContent>
            <div>
              {field.selectedMock?.name && (
                <div style={{ marginBottom: "16px", fontWeight: 600 }}>
                  {field.selectedMock.name}
                </div>
              )}
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
                      {isBoolean ? (
                        <Checkbox
                          label={paramLabel}
                          checked={paramValues[paramName] ?? paramDefault ?? false}
                          onChange={(_, data) => {
                            setParamValues({ ...paramValues, [paramName]: data.checked });
                          }}
                        />
                      ) : (
                        <Field label={paramLabel} size="small">
                          <Input
                            size="small"
                            type={isNumber ? "number" : "text"}
                            value={paramValues[paramName] ?? paramDefault ?? ""}
                            onChange={(e) => {
                              const value = isNumber 
                                ? (e.target.value ? parseFloat(e.target.value) || 0 : 0)
                                : e.target.value;
                              setParamValues({ ...paramValues, [paramName]: value });
                            }}
                          />
                        </Field>
                      )}
                    </div>
                  );
                })}
            </div>
          </DialogContent>
          <DialogActions>
            <Button appearance="primary" onClick={handleSave}>
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
        disabled={!field.selectedMock}
        size="small"
        style={{ marginLeft: "8px" }}
      />
    </div>
  );
});
