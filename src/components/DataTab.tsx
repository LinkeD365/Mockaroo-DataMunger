import React from "react";
import { observer } from "mobx-react";
import { ViewModel } from "../model/viewModel";
import { dvService } from "../utils/dataverse";

import { DataRow } from "../model/Data";
import { ConfigField } from "../model/Config";

import {
  ModuleRegistry,
  TextFilterModule,
  ClientSideRowModelModule,
  CheckboxEditorModule,
  NumberEditorModule,
  themeQuartz,
  ColDef,
} from "ag-grid-community";
import { AgGridReact } from "ag-grid-react";

ModuleRegistry.registerModules([TextFilterModule, ClientSideRowModelModule, CheckboxEditorModule, NumberEditorModule]);

interface DataTabProps {
  connection: ToolBoxAPI.DataverseConnection | null;
  dvService: dvService;
  isLoading: boolean;
  viewModel: ViewModel;
  onLog: (message: string, type?: "info" | "success" | "warning" | "error") => void;
}
const myTheme = themeQuartz.withParams({
  headerHeight: "30px",
});
export const DataTab = observer((props: DataTabProps): React.JSX.Element => {
  const { viewModel } = props;

  const [agCols] = React.useState<ColDef<DataRow>[]>(
    viewModel.config?.fields?.filter((field) => field.include && field.selectedMock)?.map((configCol) => ({
      headerName: configCol.displayName || configCol.logicalName,
      field: configCol.logicalName as any,
      sortable: true,
      filter: true,
      resizable: true,
      flex: 1,
      width: 200,
    })) || []
  );
  React.useEffect(() => {
    console.log("Data changed:", Object.getOwnPropertyNames(viewModel.data?.[0] || {}));
    const cols = viewModel.config?.fields?.filter((field) => field.include && field.selectedMock) || [];
    const rows: DataRow[] = [];

    // Build rows only when we have a matching config field; skip columns without config to satisfy DataRow parameter type.
    viewModel.data?.forEach((dataItem) => {
      cols.forEach((col) => {
        rows.push(new DataRow(col, dataItem[col.logicalName]));
      });
    });
    viewModel.dataRows = rows;
    console.log("Data rows constructed:", viewModel.dataRows);
  }, [viewModel.data, viewModel.config?.fields]);

  // Using 'any' type for data items because they are dynamically generated from Mockaroo API
  // with different schemas based on user-selected fields


  return (
      <div style={{ width: "98vw", height: "85vh" }}>
        <AgGridReact<DataRow> theme={myTheme} rowData={viewModel.data || []} columnDefs={agCols} domLayout="normal" />
      </div>
  );
});
