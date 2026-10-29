import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  EyeIcon,
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
import { useCategories } from "@/hooks/useCategories";
import { confirmServiceAction } from "@/utils/confirmAction";

const CATEGORY_FILTERS = [
  { value: "all", label: "Todas" },
  { value: "active", label: "Activas" },
  { value: "inactive", label: "Inactivas" },
  { value: "deleted", label: "Eliminadas" },
];

export default function CategoryList() {
  const [filter, setFilter] = useState("all");
  const {
    categories,
    loading,
    error,
    submitting,
    loadCategories,
    deleteCategory,
    restoreCategory,
    changeCategoryActive,
  } = useCategories();

  // Los filtros se aplican sobre el listado compartido, sin otra petición.
  const visibleCategories = useMemo(
    () =>
      categories.filter((category) => {
        const deleted = Boolean(category.deletedAt);
        if (filter === "active") return category.active && !deleted;
        if (filter === "inactive") return !category.active && !deleted;
        if (filter === "deleted") return deleted;
        return true;
      }),
    [categories, filter],
  );

  async function remove(category) {
    const confirmed = await confirmServiceAction({
      title: "Eliminar categoría",
      message: `¿Quieres eliminar “${category.name}”? Si tiene servicios, no podrá eliminarse.`,
      confirmText: "Eliminar",
      danger: true,
    });
    if (confirmed) await deleteCategory(category._id);
  }

  async function restore(category) {
    const confirmed = await confirmServiceAction({
      title: "Restaurar categoría",
      message: `¿Quieres restaurar “${category.name}”?`,
      confirmText: "Restaurar",
    });
    if (confirmed) await restoreCategory(category._id);
  }

  const columns = useMemo(
    () => [
      {
        accessorKey: "name",
        header: "Nombre",
        cell: ({ row }) => (
          <div className="service-name-cell">
            <strong>{row.original.name}</strong>
            <span>{row.original.description || "Sin descripción."}</span>
          </div>
        ),
      },
      { accessorKey: "slug", header: "Slug" },
      {
        accessorKey: "serviceCount",
        header: "Servicios",
        cell: ({ getValue }) => getValue() ?? 0,
      },
      {
        accessorKey: "active",
        header: "Activa",
        enableGlobalFilter: false,
        cell: ({ row }) => (
          <Switch
            checked={Boolean(row.original.active)}
            disabled={submitting || Boolean(row.original.deletedAt)}
            onCheckedChange={(active) =>
              changeCategoryActive(row.original._id, active)
            }
            aria-label={`${row.original.active ? "Desactivar" : "Activar"} ${row.original.name}`}
          />
        ),
      },
      {
        accessorKey: "deletedAt",
        header: "Eliminada",
        enableGlobalFilter: false,
        cell: ({ getValue }) => (
          <Badge variant={getValue() ? "destructive" : "outline"}>
            {getValue() ? "Eliminada" : "No eliminada"}
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
            <Button
              variant="ghost"
              size="icon"
              nativeButton={false}
              render={<Link to={`/categories/${row.original._id}`} />}
              aria-label={`Ver ${row.original.name}`}
              title="Ver detalle"
            >
              <EyeIcon />
            </Button>
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
                  render={<Link to={`/categories/${row.original._id}/edit`} />}
                  aria-label={`Editar ${row.original.name}`}
                  title="Editar"
                >
                  <PencilIcon />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  disabled={submitting}
                  onClick={() => remove(row.original)}
                  aria-label={`Eliminar ${row.original.name}`}
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
    [changeCategoryActive, remove, restore, submitting],
  );

  const tableContent = loading ? (
    <TableSkeleton rows={6} columns={6} />
  ) : error ? (
    <ErrorState message={error} onRetry={() => loadCategories()} />
  ) : (
    <DataTable
      columns={columns}
      data={visibleCategories}
      emptyMessage="No hay categorías que coincidan."
      getRowClassName={(category) =>
        category.deletedAt
          ? "data-row-deleted"
          : !category.active
            ? "data-row-inactive"
            : undefined
      }
    />
  );

  return (
    <section>
      <div className="page-header">
        <div>
          <h1>Categorías</h1>
          <p className="muted">Organiza los servicios de Fixly.</p>
        </div>
        <Button nativeButton={false} render={<Link to="/categories/new" />}>
          <PlusIcon aria-hidden="true" />
          Crear categoría
        </Button>
      </div>

      <div className="service-record-filters" aria-label="Filtrar categorías">
        {CATEGORY_FILTERS.map(({ value, label }) => (
          <Button
            key={value}
            variant={filter === value ? "secondary" : "outline"}
            size="sm"
            aria-pressed={filter === value}
            onClick={() => setFilter(value)}
          >
            {label}
          </Button>
        ))}
      </div>

      {tableContent}
    </section>
  );
}