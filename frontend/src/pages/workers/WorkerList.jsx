import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  BriefcaseIcon,
  PencilIcon,
  PlusIcon,
  RotateCcwIcon,
  Trash2Icon,
} from "lucide-react";

import DataTable from "@/components/common/DataTable";
import ErrorState from "@/components/common/ErrorState";
import { TableSkeleton } from "@/components/common/TableSkeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useWorkers } from "@/hooks/useWorkers";
import { confirmServiceAction } from "@/utils/confirmAction";

const RECORD_FILTERS = [
  { value: "all", label: "Todos" },
  { value: "active", label: "Activos" },
  { value: "inactive", label: "Inactivos" },
  { value: "deleted", label: "Eliminados" },
];

function getWorkerRowClassName(worker) {
  if (worker.deletedAt) return "data-row-deleted";
  if (!worker.active) return "data-row-inactive";
  return undefined;
}

export default function WorkerList() {
  const [recordFilter, setRecordFilter] = useState("all");
  const {
    workers,
    loading,
    error,
    submitting,
    loadWorkers,
    changeWorkerActive,
    deleteWorker,
    restoreWorker,
  } = useWorkers();

  useEffect(() => {
    // El listado administrativo permite gestionar todos los estados del trabajador.
    void loadWorkers();
  }, [loadWorkers]);

  const visibleWorkers = useMemo(
    () =>
      workers.filter((worker) => {
        const deleted = Boolean(worker.deletedAt);
        if (recordFilter === "active") return worker.active && !deleted;
        if (recordFilter === "inactive") return !worker.active && !deleted;
        if (recordFilter === "deleted") return deleted;
        return true;
      }),
    [recordFilter, workers],
  );

  const retryWorkers = useCallback(() => loadWorkers(), [loadWorkers]);
  const updateActive = useCallback(
    (worker, active) => changeWorkerActive(worker._id, active),
    [changeWorkerActive],
  );

  const remove = useCallback(
    async (worker) => {
      const confirmed = await confirmServiceAction({
        title: "Eliminar trabajador",
        message: `¿Quieres eliminar a “${worker.name}”? Podrás restaurarlo después.`,
        confirmText: "Eliminar",
        danger: true,
      });
      if (confirmed) await deleteWorker(worker._id);
    },
    [deleteWorker],
  );

  const restore = useCallback(
    async (worker) => {
      const confirmed = await confirmServiceAction({
        title: "Restaurar trabajador",
        message: `¿Quieres restaurar a “${worker.name}”?`,
        confirmText: "Restaurar",
      });
      if (confirmed) await restoreWorker(worker._id);
    },
    [restoreWorker],
  );

  const columns = useMemo(
    () => [
      { accessorKey: "name", header: "Nombre" },
      { accessorKey: "email", header: "Correo electrónico" },
      {
        accessorKey: "phone",
        header: "Teléfono",
        cell: ({ getValue }) => getValue() || "Sin teléfono",
      },
      {
        accessorKey: "active",
        header: "Activo",
        enableGlobalFilter: false,
        cell: ({ row }) => (
          <Switch
            checked={Boolean(row.original.active)}
            disabled={submitting || Boolean(row.original.deletedAt)}
            onCheckedChange={(active) => updateActive(row.original, active)}
            aria-label={`${row.original.active ? "Desactivar" : "Activar"} trabajador ${row.original.name}`}
          />
        ),
      },
      {
        accessorKey: "deletedAt",
        header: "Eliminado",
        enableGlobalFilter: false,
        cell: ({ getValue }) => (
          <Badge variant="chip" tone={getValue() ? "danger" : "success"}>
            {getValue() ? "Sí" : "No"}
          </Badge>
        ),
      },
      {
        id: "actions",
        header: "Acciones",
        enableGlobalFilter: false,
        enableSorting: false,
        cell: ({ row }) => (
          <div className="service-table-actions">
            {row.original.deletedAt ? (
              <Button
                variant="outline"
                size="sm"
                disabled={submitting}
                onClick={() => restore(row.original)}
              >
                <RotateCcwIcon />
                Restaurar
              </Button>
            ) : (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  nativeButton={false}
                  render={<Link to={`/workers/${row.original._id}/edit`} />}
                  aria-label={`Editar trabajador ${row.original.name}`}
                  title="Editar"
                >
                  <PencilIcon />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  disabled={submitting}
                  onClick={() => remove(row.original)}
                  aria-label={`Eliminar trabajador ${row.original.name}`}
                  title="Eliminar"
                >
                  <Trash2Icon />
                </Button>
              </>
            )}
          </div>
        ),
      },
    ],
    [remove, restore, submitting, updateActive],
  );

  const tableContent = loading ? (
    <TableSkeleton rows={6} columns={6} />
  ) : error ? (
    <ErrorState message={error} onRetry={retryWorkers} />
  ) : (
    <DataTable
      ariaLabel="Tabla de trabajadores"
      columns={columns}
      data={visibleWorkers}
      emptyMessage="No hay trabajadores que coincidan."
      searchLabel="Buscar trabajadores"
      searchPlaceholder="Buscar trabajadores…"
      searchDescription="Busca por nombre, correo electrónico o teléfono. Los filtros superiores muestran trabajadores activos, inactivos o eliminados."
      getRowClassName={getWorkerRowClassName}
    />
  );

  return (
    <section>
      <div className="page-header">
        <div>
          <h1>Trabajadores</h1>
          <p className="muted">Administra los datos de contacto de los trabajadores.</p>
        </div>
        <Button nativeButton={false} render={<Link to="/workers/new" />}>
          <PlusIcon aria-hidden="true" />
          Crear trabajador
        </Button>
      </div>

      <div className="service-record-filters" aria-label="Filtrar trabajadores">
        {RECORD_FILTERS.map(({ value, label }) => (
          <Button
            key={value}
            variant={recordFilter === value ? "secondary" : "outline"}
            size="sm"
            aria-pressed={recordFilter === value}
            onClick={() => setRecordFilter(value)}
          >
            {label}
          </Button>
        ))}
      </div>

      {tableContent}
    </section>
  );
}