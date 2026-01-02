import React from "react";
import { observer } from "mobx-react";
import { ViewModel } from "../model/viewModel";

import {
  createTableColumn,
  DataGrid,
  DataGridBody,
  DataGridCell,
  DataGridHeader,
  DataGridHeaderCell,
  DataGridRow,
  TableColumnDefinition,
  tokens,
} from "@fluentui/react-components";
import { DataRow } from "../model/Data";

interface DataTabProps {
  connection: ToolBoxAPI.DataverseConnection | null;
  dvService: any;
  isLoading: boolean;
  viewModel: ViewModel;
  onLog: (message: string, type?: "info" | "success" | "warning" | "error") => void;
}

export const DataTab = observer((props: DataTabProps): React.JSX.Element => {
  const { viewModel } = props;
  const [dataCols] = React.useState<string[]>(Object.getOwnPropertyNames(viewModel.data?.[0] || {}).filter((col) => col !== "@odata.type"));

  React.useEffect(() => {
    console.log("Data changed:", Object.getOwnPropertyNames(viewModel.data?.[0] || {}));
    const cols = Object.getOwnPropertyNames(viewModel.data?.[0] || {}).filter((col) => col !== "@odata.type");
    const rows: DataRow[] = [];

    // Build rows only when we have a matching config field; skip columns without config to satisfy DataRow parameter type.
    viewModel.data?.forEach((dataItem) => {
      cols.forEach((colName) => {
        const field = viewModel.config?.fields?.find((fld) => fld.logicalName === colName);
        if (!field) return; // skip if no config field found
        rows.push(new DataRow(field, dataItem[colName]));
      });
    });
    viewModel.dataRows = rows;
    console.log("Data rows constructed:", viewModel.dataRows);
  }, [viewModel.data, viewModel.config?.fields]);

  function dataColumns(): TableColumnDefinition<any>[] {
    //const cols = Object.getOwnPropertyNames(viewModel.data?.[0] || {});
    return dataCols.map((colName) =>
      createTableColumn<any>({
        columnId: colName,
        compare: (a, b) => a[colName]?.toString().localeCompare(b[colName]?.toString() || "") || 0,
        renderHeaderCell: () => (
          <DataGridHeaderCell>
            {viewModel.config?.fields?.find((f) => f.logicalName === colName)?.displayName || colName}
          </DataGridHeaderCell>
        ),
        renderCell: (item) => <DataGridCell>{item[colName]}</DataGridCell>,
      })
    );
  }

  return (
    <div>
      <DataGrid columns={dataColumns()} items={viewModel.data || []}>
        <DataGridHeader
          style={{
            position: "sticky",
            top: 0,
            zIndex: 10,
            backgroundColor: tokens.colorNeutralBackground2,
            boxShadow: "0 1px 0 rgba(0,0,0,0.06)",
          }}
        >
          {" "}
          <DataGridRow>
            {({ renderHeaderCell }) => <DataGridHeaderCell>{renderHeaderCell()}</DataGridHeaderCell>}
          </DataGridRow>
        </DataGridHeader>
        <DataGridBody<any>>
          {({ item, rowId }) => (
            <DataGridRow<any> key={rowId}>
              {({ renderCell }) => <DataGridCell>{renderCell(item)}</DataGridCell>}
            </DataGridRow>
          )}
        </DataGridBody>
      </DataGrid>
    </div>
  );
});
