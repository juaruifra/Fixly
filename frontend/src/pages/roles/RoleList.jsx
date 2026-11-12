import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
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
import { useRoles } from "@/hooks/useRoles";
import { confirmServiceAction } from "@/utils/confirmAction";

const RECORD_FILTERS = [
  { value: "all", label: "Todos" },
  { value: "active", label: "Activos" },
  { value: "inactive", label: "Inactivos" },
  { value: "deleted", label: "Eliminados" },
];

function getRoleRowClassName(role) {
  if (role.deletedAt) return "data-row-deleted";
  if (!role.active) return "data-row-inactive";
  return undefined;
}

export default function RoleList() {
  const [recordFilter, setRecordFilter] = useState("all");
  const {
    roles,
    loading,
    error,
    submitting,
    loadRoles,
    changeRoleActive,
    deleteRole,
    restoreRole,
  } = useRoles();

  useEffect(() => {
    // El listado inicial incluye roles inactivos y eliminados para administración.
    void loadRoles();
  }, [loadRoles]);

  const visibleRoles = useMemo(
    () =>
      roles.filter((role) => {
        const deleted = Boolean(role.deletedAt);
        if (recordFilter === "active") return role.active && !deleted;
        if (recordFilter === "inactive") return !role.active && !deleted;
        if (recordFilter === "deleted") return deleted;
        return true;
      }),
    [recordFilter, roles],
  );

  const retryRoles = useCallback(() => loadRoles(), [loadRoles]);
  const updateActive = useCallback(
    (role, active) => changeRoleActive(role._id, active),
    [changeRoleActive],
  );

  const remove = useCallback(
    async (role) => {
      const confirmed = await confirmServiceAction({
        title: "Eliminar rol",
        message: `¿Quieres eliminar el rol “${role.name}”? No se puede eliminar si está asignado a usuarios.`,
        confirmText: "Eliminar",
        danger: true,
      });
      if (confirmed) await deleteRole(role._id);
    },
    [deleteRole],
  );

  const restore = useCallback(
    async (role) => {
      const confirmed = await confirmServiceAction({
        title: "Restaurar rol",
        message: `¿Quieres restaurar el rol “${role.name}”?`,
        confirmText: "Restaurar",
      });
      if (confirmed) await restoreRole(role._id);
    },
    [restoreRole],
  );

  const columns = useMemo(
    () => [
      { accessorKey: "name", header: "Nombre" },
      {
        accessorKey: "description",
        header: "Descripción",
        cell: ({ getValue }) => getValue() || "Sin descripción.",
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
            aria-label={`${row.original.active ? "Desactivar" : "Activar"} rol ${row.original.name}`}
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
                  render={<Link to={`/roles/${row.original._id}/edit`} />}
                  aria-label={`Editar rol ${row.original.name}`}
                  title="Editar"
                >
                  <PencilIcon />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  disabled={submitting}
                  onClick={() => remove(row.original)}
                  aria-label={`Eliminar rol ${row.original.name}`}
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
    <TableSkeleton rows={6} columns={5} />
  ) : error ? (
    <ErrorState message={error} onRetry={retryRoles} />
  ) : (
    <DataTable
      ariaLabel="Tabla de roles"
      columns={columns}
      data={visibleRoles}
      emptyMessage="No hay roles que coincidan."
      searchLabel="Buscar roles"
      searchPlaceholder="Buscar roles…"
      searchDescription="Busca por nombre o descripción. Los filtros superiores muestran roles activos, inactivos o eliminados."
      getRowClassName={getRoleRowClassName}
    />
  );

  return (
    <section>
      <div className="page-header">
        <div>
          <h1>Roles</h1>
          <p className="muted">Administra los perfiles de acceso de Fixly.</p>
        </div>
        <Button nativeButton={false} render={<Link to="/roles/new" />}>
          <PlusIcon aria-hidden="true" />
          Crear rol
        </Button>
      </div>

      <div className="service-record-filters" aria-label="Filtrar roles">
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