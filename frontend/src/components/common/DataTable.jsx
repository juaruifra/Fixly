import { useState } from "react";
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import {
  ArrowDownIcon,
  ArrowDownUpIcon,
  ArrowUpIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";

export default function DataTable({
  columns,
  data,
  emptyMessage = "No hay datos para mostrar.",
  getRowClassName,
}) {
  const [sorting, setSorting] = useState([]);
  const [globalFilter, setGlobalFilter] = useState("");
  const table = useReactTable({
    data,
    columns,
    state: { sorting, globalFilter },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    globalFilterFn: (row, _columnId, filterValue) =>
      row
        .getAllCells()
        .filter((cell) => cell.column.getCanGlobalFilter())
        .some((cell) =>
          String(cell.getValue() ?? "")
            .toLowerCase()
            .includes(String(filterValue).toLowerCase()),
        ),
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  return (
    <section className="data-table" aria-label="Tabla de servicios">
      <div className="data-table-toolbar">
        <label className="data-table-search">
          <span className="sr-only">Buscar en la tabla</span>
          <input
            type="search"
            value={globalFilter ?? ""}
            onChange={(event) => setGlobalFilter(event.target.value)}
            placeholder="Buscar servicios…"
          />
        </label>
        <label className="data-table-page-size">
          <span>Filas</span>
          <select
            value={table.getState().pagination.pageSize}
            onChange={(event) => table.setPageSize(Number(event.target.value))}
            aria-label="Filas por página"
          >
            {[10, 20, 50].map((pageSize) => (
              <option key={pageSize} value={pageSize}>
                {pageSize}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="data-table-scroll">
        <table>
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  const sorted = header.column.getIsSorted();

                  return (
                    <th key={header.id} scope="col">
                      {header.isPlaceholder ? null : header.column.getCanSort() ? (
                        <button
                          className="data-table-sort"
                          onClick={header.column.getToggleSortingHandler()}
                          aria-label={`Ordenar por ${String(header.column.columnDef.header)}`}
                        >
                          {flexRender(
                            header.column.columnDef.header,
                            header.getContext(),
                          )}
                          {sorted === "asc" ? (
                            <ArrowUpIcon aria-hidden="true" />
                          ) : sorted === "desc" ? (
                            <ArrowDownIcon aria-hidden="true" />
                          ) : (
                            <ArrowDownUpIcon aria-hidden="true" />
                          )}
                        </button>
                      ) : (
                        flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )
                      )}
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row) => (
                <tr
                  key={row.id}
                  className={getRowClassName?.(row.original) || undefined}
                >
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td className="data-table-empty" colSpan={columns.length}>
                  {emptyMessage}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="data-table-pagination">
        <span>
          {table.getFilteredRowModel().rows.length
            ? `${table.getState().pagination.pageIndex + 1} / ${table.getPageCount()}`
            : "0 resultados"}
        </span>
        <div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            Anterior
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            Siguiente
          </Button>
        </div>
      </div>
    </section>
  );
}