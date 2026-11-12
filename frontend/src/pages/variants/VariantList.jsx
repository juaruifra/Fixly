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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { VARIANT_STATUS_OPTIONS } from "@/features/variants/variantSchema";
import { useVariants } from "@/hooks/useVariants";
import { confirmServiceAction } from "@/utils/confirmAction";

const RECORD_FILTERS = [
  { value: "all", label: "Todas" },
  { value: "active", label: "Activas" },
  { value: "inactive", label: "Inactivas" },
  { value: "deleted", label: "Eliminadas" },
];

const STATUS_TONES = {
  draft: "warning",
  published: "success",
  paused: "info",
  discontinued: "neutral",
};

function getVariantRowClassName(variant) {
  if (variant.deletedAt) return "data-row-deleted";
  if (!variant.active) return "data-row-inactive";
  return undefined;
}

function VariantStatusSelect({ variant, onChange, disabled }) {
  return (
    <Select
      value={variant.status}
      disabled={disabled || Boolean(variant.deletedAt)}
      onValueChange={(status) => onChange(variant, status)}
    >
      <SelectTrigger
        className={`service-status-select tone--${STATUS_TONES[variant.status] ?? "neutral"}`}
        aria-label={`Cambiar estado de ${variant.name}`}
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {VARIANT_STATUS_OPTIONS.map(({ value, label }) => (
          <SelectItem key={value} value={value}>
            {label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export default function VariantList() {
  const [recordFilter, setRecordFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const {
    variants,
    loading,
    error,
    submitting,
    loadVariants,
    changeVariantActive,
    changeVariantStatus,
    deleteVariant,
    restoreVariant,
  } = useVariants();

  useEffect(() => {
    // El listado administrativo incluye también variantes inactivas y eliminadas.
    void loadVariants();
  }, [loadVariants]);

  const visibleVariants = useMemo(
    () =>
      variants.filter((variant) => {
        const deleted = Boolean(variant.deletedAt);
        const matchesRecord =
          recordFilter === "all" ||
          (recordFilter === "active" && variant.active && !deleted) ||
          (recordFilter === "inactive" && !variant.active && !deleted) ||
          (recordFilter === "deleted" && deleted);
        const matchesStatus =
          statusFilter === "all" || variant.status === statusFilter;
        return matchesRecord && matchesStatus;
      }),
    [recordFilter, statusFilter, variants],
  );

  const retryVariants = useCallback(() => loadVariants(), [loadVariants]);
  const updateActive = useCallback(
    (variant, active) => changeVariantActive(variant._id, active),
    [changeVariantActive],
  );
  const updateStatus = useCallback(
    (variant, status) => changeVariantStatus(variant._id, status),
    [changeVariantStatus],
  );

  const remove = useCallback(
    async (variant) => {
      const confirmed = await confirmServiceAction({
        title: "Eliminar variante",
        message: `¿Quieres eliminar “${variant.name}”? Podrás restaurarla después.`,
        confirmText: "Eliminar",
        danger: true,
      });
      if (confirmed) await deleteVariant(variant._id);
    },
    [deleteVariant],
  );

  const restore = useCallback(
    async (variant) => {
      const confirmed = await confirmServiceAction({
        title: "Restaurar variante",
        message: `¿Quieres restaurar “${variant.name}”?`,
        confirmText: "Restaurar",
      });
      if (confirmed) await restoreVariant(variant._id);
    },
    [restoreVariant],
  );

  const columns = useMemo(
    () => [
      {
        accessorKey: "name",
        header: "Nombre",
      },
      {
        id: "service",
        accessorFn: (variant) => variant.service?.name ?? "",
        header: "Servicio",
      },
      { accessorKey: "sku", header: "SKU" },
      {
        accessorKey: "price",
        header: "Precio",
        cell: ({ getValue }) =>
          Number(getValue()).toLocaleString("es-ES", {
            style: "currency",
            currency: "EUR",
          }),
      },
      {
        accessorKey: "duration",
        header: "Duración",
        cell: ({ getValue }) => `${getValue()} min`,
      },
      {
        id: "status",
        // La búsqueda usa el nombre visible del estado, no su código interno.
        accessorFn: (variant) =>
          VARIANT_STATUS_OPTIONS.find(({ value }) => value === variant.status)?.label ?? variant.status,
        header: "Estado",
        cell: ({ row }) => (
          <VariantStatusSelect
            variant={row.original}
            onChange={updateStatus}
            disabled={submitting}
          />
        ),
      },
      {
        accessorKey: "active",
        header: "Activa",
        enableGlobalFilter: false,
        cell: ({ row }) => (
          <Switch
            checked={Boolean(row.original.active)}
            disabled={submitting || Boolean(row.original.deletedAt)}
            onCheckedChange={(active) => updateActive(row.original, active)}
            aria-label={`${row.original.active ? "Desactivar" : "Activar"} ${row.original.name}`}
          />
        ),
      },
      {
        accessorKey: "deletedAt",
        header: "Eliminada",
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
                  render={<Link to={`/variants/${row.original._id}/edit`} />}
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
    [remove, restore, submitting, updateActive, updateStatus],
  );

  const tableContent = loading ? (
    <TableSkeleton rows={6} columns={9} />
  ) : error ? (
    <ErrorState message={error} onRetry={retryVariants} />
  ) : (
    <DataTable
      ariaLabel="Tabla de variantes"
      columns={columns}
      data={visibleVariants}
      emptyMessage="No hay variantes que coincidan."
      searchLabel="Buscar variantes"
      searchPlaceholder="Buscar variantes…"
      searchDescription="Busca por nombre, servicio, SKU, precio, duración o estado. Los filtros superiores acotan por registro y estado."
      getRowClassName={getVariantRowClassName}
    />
  );

  return (
    <section>
      <div className="page-header">
        <div>
          <h1>Variantes</h1>
          <p className="muted">Gestiona las opciones de cada servicio.</p>
        </div>
        <Button nativeButton={false} render={<Link to="/variants/new" />}>
          <PlusIcon aria-hidden="true" />
          Crear variante
        </Button>
      </div>

      <div className="service-list-filters">
        <div className="service-record-filters" aria-label="Filtrar variantes">
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

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger
            className="service-filter-status"
            aria-label="Filtrar variantes por estado"
          >
            <SelectValue placeholder="Todos los estados" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los estados</SelectItem>
            {VARIANT_STATUS_OPTIONS.map(({ value, label }) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {tableContent}
    </section>
  );
}