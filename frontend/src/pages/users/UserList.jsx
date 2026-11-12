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
import { useUsers } from "@/hooks/useUsers";
import { confirmServiceAction } from "@/utils/confirmAction";

const RECORD_FILTERS = [
  { value: "all", label: "Todos" },
  { value: "active", label: "Activos" },
  { value: "inactive", label: "Inactivos" },
  { value: "deleted", label: "Eliminados" },
];

function getUserRowClassName(user) {
  if (user.deletedAt) return "data-row-deleted";
  if (!user.active) return "data-row-inactive";
  return undefined;
}

export default function UserList() {
  const [recordFilter, setRecordFilter] = useState("all");
  const {
    users,
    loading,
    error,
    submitting,
    loadUsers,
    changeUserActive,
    deleteUser,
    restoreUser,
  } = useUsers();

  useEffect(() => {
    // Carga todos los usuarios para aplicar filtros locales sin pedir cada vista.
    void loadUsers();
  }, [loadUsers]);

  const visibleUsers = useMemo(
    () =>
      users.filter((user) => {
        const deleted = Boolean(user.deletedAt);
        if (recordFilter === "active") return user.active && !deleted;
        if (recordFilter === "inactive") return !user.active && !deleted;
        if (recordFilter === "deleted") return deleted;
        return true;
      }),
    [recordFilter, users],
  );

  const retryUsers = useCallback(() => loadUsers(), [loadUsers]);
  const updateActive = useCallback(
    (user, active) => changeUserActive(user._id, active),
    [changeUserActive],
  );

  const remove = useCallback(
    async (user) => {
      const confirmed = await confirmServiceAction({
        title: "Eliminar usuario",
        message: `¿Quieres eliminar a “${user.name}”? Podrás restaurarlo después.`,
        confirmText: "Eliminar",
        danger: true,
      });
      if (confirmed) await deleteUser(user._id);
    },
    [deleteUser],
  );

  const restore = useCallback(
    async (user) => {
      const confirmed = await confirmServiceAction({
        title: "Restaurar usuario",
        message: `¿Quieres restaurar a “${user.name}”?`,
        confirmText: "Restaurar",
      });
      if (confirmed) await restoreUser(user._id);
    },
    [restoreUser],
  );

  const columns = useMemo(
    () => [
      { accessorKey: "name", header: "Nombre" },
      { accessorKey: "email", header: "Correo electrónico" },
      {
        id: "role",
        accessorFn: (user) => user.role?.name ?? "",
        header: "Rol",
        cell: ({ row }) => {
          const role = row.original.role;
          if (!role) return "Sin rol";
          return role.active && !role.deletedAt
            ? role.name
            : `${role.name} (no disponible)`;
        },
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
            aria-label={`${row.original.active ? "Desactivar" : "Activar"} usuario ${row.original.name}`}
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
                  render={<Link to={`/users/${row.original._id}/edit`} />}
                  aria-label={`Editar usuario ${row.original.name}`}
                  title="Editar"
                >
                  <PencilIcon />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  disabled={submitting}
                  onClick={() => remove(row.original)}
                  aria-label={`Eliminar usuario ${row.original.name}`}
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
    <ErrorState message={error} onRetry={retryUsers} />
  ) : (
    <DataTable
      ariaLabel="Tabla de usuarios"
      columns={columns}
      data={visibleUsers}
      emptyMessage="No hay usuarios que coincidan."
      searchLabel="Buscar usuarios"
      searchPlaceholder="Buscar usuarios…"
      searchDescription="Busca por nombre, correo electrónico o rol. Los filtros superiores muestran usuarios activos, inactivos o eliminados."
      getRowClassName={getUserRowClassName}
    />
  );

  return (
    <section>
      <div className="page-header">
        <div>
          <h1>Usuarios</h1>
          <p className="muted">Administra cuentas y sus roles asignados.</p>
        </div>
        <Button nativeButton={false} render={<Link to="/users/new" />}>
          <PlusIcon aria-hidden="true" />
          Crear usuario
        </Button>
      </div>

      <div className="service-record-filters" aria-label="Filtrar usuarios">
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