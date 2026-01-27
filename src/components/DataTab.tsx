import React from "react";
import { observer } from "mobx-react";
import { ViewModel } from "../model/viewModel";
import { dvService } from "../utils/dataverse";

import { DataRow } from "../model/Data";

import {
  ModuleRegistry,
  TextFilterModule,
  ClientSideRowModelModule,
  CheckboxEditorModule,
  NumberEditorModule,
  themeQuartz,
  ColDef,
  ValidationModule,
  RowAutoHeightModule,
} from "ag-grid-community";
import { AgGridReact } from "ag-grid-react";

ModuleRegistry.registerModules([
  TextFilterModule,
  ClientSideRowModelModule,
  CheckboxEditorModule,
  NumberEditorModule,
  ValidationModule,
  RowAutoHeightModule,
]);

interface DataTabProps {
  connection: ToolBoxAPI.DataverseConnection | null;
  dvSvc: dvService;
  isLoading: boolean;
  viewModel: ViewModel;
  onLog: (message: string, type?: "info" | "success" | "warning" | "error") => void;
}
const myTheme = themeQuartz.withParams({
  headerHeight: "30px",
});
export const DataTab = observer((props: DataTabProps): React.JSX.Element => {
  const { viewModel } = props;

  const agCols = React.useMemo<ColDef<DataRow>[]>(
    () =>
      viewModel.config?.fields
        ?.filter((field) => field.include && field.selectedMock)
        .map((configCol) => ({
          headerName: configCol.displayName || configCol.logicalName,
          field: configCol.logicalName as any,
          sortable: true,
          filter: true,
          resizable: true,
          width: 200,
          flex: 1,
          wrapText: true,
          autoHeight: true,
        })) || [],
    [viewModel.config?.fields],
  );

  return (
    <div style={{ width: "98vw", height: "85vh" }}>
      <AgGridReact<DataRow> theme={myTheme} rowData={viewModel.data || []} columnDefs={agCols} domLayout="autoHeight" />
    </div>
  );
});
