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
  InfoLabel,
  Input,
  Label,
  LabelProps,
} from "@fluentui/react-components";
import { ConfigField, MockType } from "../model/Config";
import { SettingsFilled } from "@fluentui/react-icons";

interface MockOptionsSelectorProps {
  field: ConfigField;
  mockTypes: MockType[];
  onUpdate: (field: ConfigField) => void;
}

export const MockOptionsSelector = observer((props: MockOptionsSelectorProps): React.JSX.Element => {
  const { field, mockTypes, onUpdate } = props;
  const [openConfig, setOpenConfig] = React.useState(false);

  const configDialog = (
    <Dialog open={openConfig} onOpenChange={(_e, data) => setOpenConfig(data.open)}>
      <DialogSurface>
        <DialogBody>
          <DialogTitle>Configure Mock Options - {field.selectedMock?.name}</DialogTitle>
          <DialogContent>
            {field.selectedMock?.parameters?.map((param) => (
              <div key={param.name} style={{ marginBottom: "12px" }}>
                <Field
                  label={{
                    children: (_: unknown, props: LabelProps) => (
                      <InfoLabel {...props} info={param.description || ""}>
                        {param.name}
                      </InfoLabel>
                    ),
                  }}
                >
                  <Input type="text" value={param.value || ""} />
                </Field>
                {/* <Label required>{param.name}</Label>
                <Input
                  type="text"
                  value={param.value || ""}
                    />
                <Label size="small">{param.description || ""}</Label> */}
              </div>
            ))}
          </DialogContent>
          <DialogActions>
            <Button appearance="primary">Save</Button>
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
        disabled={!field.selectedMock || (field.selectedMock.parameters && field.selectedMock.parameters.length === 0)}
        size="small"
        style={{ marginLeft: "8px" }}
      />
    </div>
  );
});
