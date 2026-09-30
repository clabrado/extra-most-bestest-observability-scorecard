import React, { useMemo } from "react";
import {
  DataTable,
  type DataTableColumnDef,
} from "@dynatrace/strato-components/tables";
import { HealthIndicator } from "@dynatrace/strato-components/content";
import { SIGNAL_KEYS, SIGNAL_LABELS, type ServiceRow } from "../lib/types";

export interface CoverageTableProps {
  rows: ServiceRow[];
}

/**
 * Presence is shown as an accessible health indicator rather than colour alone.
 * Absence is `critical` because on this scorecard a missing signal is the whole
 * point — it is the thing the user is here to act on.
 */
const PresenceCell = ({
  present,
  signal,
  service,
}: {
  present: boolean;
  signal: string;
  service: string;
}) => (
  <DataTable.DefaultCell>
    <HealthIndicator
      status={present ? "ideal" : "critical"}
      aria-label={`${signal} ${present ? "present" : "missing"} for ${service}`}
    >
      <HealthIndicator.Label>
        {present ? "Present" : "Missing"}
      </HealthIndicator.Label>
    </HealthIndicator>
  </DataTable.DefaultCell>
);

export const CoverageTable = ({ rows }: CoverageTableProps) => {
  const columns = useMemo<DataTableColumnDef<ServiceRow>[]>(() => {
    const signalColumns = SIGNAL_KEYS.map(
      (key): DataTableColumnDef<ServiceRow> => ({
        id: key,
        header: SIGNAL_LABELS[key],
        accessor: key,
        width: "1fr",
        minWidth: 120,
        sortType: "number",
        sortAccessor: (row: ServiceRow) => (row[key] ? 1 : 0),
        cell: ({ rowData }) => (
          <PresenceCell
            present={rowData[key]}
            signal={SIGNAL_LABELS[key]}
            service={rowData.name}
          />
        ),
      })
    );

    return [
      {
        id: "name",
        header: "Service",
        accessor: "name",
        sortType: "text",
        width: "2fr",
        minWidth: 200,
      },
      ...signalColumns,
      {
        id: "covered",
        header: "Covered",
        accessor: "covered",
        sortType: "number",
        width: "content",
        minWidth: 100,
        cell: ({ rowData }) => (
          <DataTable.DefaultCell>{`${rowData.covered} / 5`}</DataTable.DefaultCell>
        ),
      },
    ];
  }, []);

  return (
    <DataTable
      data={rows}
      columns={columns}
      sortable
      fullWidth
      resizable
      defaultSortBy={[{ id: "name", desc: false }]}
      variant={{
        rowDensity: "comfortable",
        rowSeparation: "horizontalDividers",
      }}
    >
      <DataTable.EmptyState>
        No services match the current filter. Turn off &ldquo;coverage gaps
        only&rdquo; to see every service.
      </DataTable.EmptyState>
    </DataTable>
  );
};
