import React from "react";

import { observer } from "mobx-react";
import { ConfigColumn, SelectionValue } from "../model/Config";
import { ViewModel } from "../model/viewModel";
import { dvService } from "../utils/dataverse";
import {
  Dialog,
  DialogSurface,
  DialogBody,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  DialogTrigger,
  Avatar,
  Tag,
  TagGroup,
  Field,
  TagGroupProps,
} from "@fluentui/react-components";
import { SearchBoxCtl } from "./SeachBox";
import { UtilLib } from "../utils/utils";

interface LookupDialogProps {
  dvSvc: dvService;
  vm: ViewModel;
  dialogOpen: boolean;
  column: ConfigColumn;
  utils: UtilLib;
  onDialogClose: () => void;
}

export const LookupDialog = observer((props: LookupDialogProps): React.JSX.Element => {
  const { dvSvc, vm, dialogOpen, column, utils, onDialogClose } = props;
  const [localSelectionValues, setLocalSelectionValues] = React.useState<SelectionValue[]>([]);

  React.useEffect(() => {
    const checkParentTable = async () => {
      if (dialogOpen) {
        if (!column.parentTable) {
          await dvSvc.getTableInfo(vm.selectedTable!.logical, column.logicalName).then((tableInfo) => {
            if (tableInfo) {
              const parentTable = vm.tables.find((t) => t.logical === tableInfo);
              if (parentTable) {
                column.parentTable = parentTable;
              } else {
                utils.alert("No Parent table found", `Parent table ${tableInfo} not found in loaded tables.`);
              }
            }
          });
        }
      }
    };
    checkParentTable();
  }, [dialogOpen]);

  const removeItem: TagGroupProps["onDismiss"] = (_e, { value }) => {
    setLocalSelectionValues(localSelectionValues.filter((item) => item.value !== value));
  };
  return (
    <Dialog open={dialogOpen} onOpenChange={(_) => onDialogClose()}>
      <DialogSurface>
        <DialogBody>
          <DialogTitle>Configure lookup - {column.displayName}</DialogTitle>
          <DialogContent>
            <div style={{ minHeight: "300px" }}>
              <SearchBoxCtl
                dvSvc={dvSvc}
                vm={vm}
                utils={utils}
                column={column}
                updateSelected={(value) => {
                  if (column.selectedMock?.fixed) {
                    setLocalSelectionValues([value]);
                    return;
                  }
                  if (!localSelectionValues.some((item) => item.value === value.value)) {
                    setLocalSelectionValues([...localSelectionValues, value]);
                  }
                }}
              />
              <Field label={`Selected ${column.parentTable?.label || "item"}${column.selectedMock?.fixed ? "" : "s"}`}>
                <TagGroup onDismiss={removeItem}>
                  {localSelectionValues.map((item) => (
                    <Tag
                      key={item.value}
                      shape="rounded"
                      dismissible
                      dismissIcon={{ "aria-label": "remove" }}
                      media={<Avatar aria-hidden name={item.label} color="colorful" />}
                      value={item.value}
                      title={item.label}
                      primaryText={item.label}
                    >
                      {item.value}
                    </Tag>
                  ))}
                </TagGroup>
              </Field>
            </div>
          </DialogContent>
          <DialogActions>
            <Button
              appearance="primary"
              disabled={localSelectionValues.length === 0}
              onClick={() => {
                if (column.selectedMock?.fixed) {
                  column.selectedValues = localSelectionValues.length > 0 ? [localSelectionValues[0]] : [];
                } else {
                  column.selectedValues = localSelectionValues;
                }
                onDialogClose();
              }}
            >
              Select
            </Button>
            <DialogTrigger disableButtonEnhancement>
              <Button appearance="secondary">Close</Button>
            </DialogTrigger>
          </DialogActions>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  );
});
